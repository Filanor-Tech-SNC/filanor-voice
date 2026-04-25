---
name: api-routes
description: Écrire des API routes Next.js pour webhooks Retell/Twilio, custom functions, crons Vercel et triggers internes. Utilise ce skill chaque fois qu'une route est créée/modifiée dans `apps/web/app/api/*`. Patterns obligatoires : validation signature, idempotence, `waitUntil` pour fire-and-forget, pattern enqueue pour jobs longs. Découle d'ADR-010 + ADR-013.
---

# SKILL — api-routes

## Quand utiliser ce skill

5 cas où toute route Next.js touchée exige ce skill :

1. **Webhook Retell** — `/api/retell/events` (switch sur `body.event` : `call_started`, `call_ended`, `call_analyzed`), `/api/retell/dynamic-variables`
2. **Webhook Twilio** — inbound SMS (`/api/twilio/sms`), status callback, voice fallback
3. **Custom function Retell** — `/api/retell/book`, `/api/retell/availability`, `/api/retell/cancel`, `/api/retell/modify` (appelés LIVE pendant la conversation, <3s impératif)
4. **Cron Vercel** — `/api/cron/purge-transcripts`, `/api/cron/process-jobs`, `/api/cron/weekly-report`
5. **Trigger interne** — jobs async sous `/api/workflows/*` (invoqués par un cron, jamais par Retell directement) et endpoints consommés par le dashboard Filanor sous `/api/admin/*`

## Structure de fichiers

```
apps/web/app/api/
├── retell/
│   ├── events/route.ts              # webhook — switch sur body.event (call_started|call_ended|call_analyzed)
│   ├── dynamic-variables/route.ts   # retrieve_dynamic_variables
│   ├── book/route.ts                # tool call book_appointment
│   ├── availability/route.ts        # tool call check_availability
│   ├── cancel/route.ts              # tool call cancel_appointment
│   └── modify/route.ts              # tool call modify_appointment
├── twilio/
│   ├── sms/route.ts                 # inbound SMS
│   └── status/route.ts              # call/message status callback
├── workflows/
│   └── post-call-summary/route.ts   # job async — invoqué par /api/cron/process-jobs
│                                    # (JAMAIS par Retell directement)
├── cron/
│   ├── purge-transcripts/route.ts   # daily, purge 30j (ADR-006 + ADR-012)
│   └── process-jobs/route.ts        # toutes les 5 min, pull pending_jobs
└── admin/
    └── ...                          # routes dashboard Filanor (auth Supabase)
```

`call_ended` et `call_analyzed` arrivent TOUS les deux sur `/api/retell/events` — un seul endpoint qui switch sur `body.event`. Il n'y a PAS de route `workflows/call-ended` séparée.

## Patterns obligatoires

### Pattern A — Job long : enqueue + cron pull (≠ inline)

**Contexte.** Timeout Vercel Hobby = 10s par défaut (60s via `maxDuration`). Un résumé OpenAI sur un transcript de 5 min peut prendre 15-25s. Ne **jamais** traiter ça dans le webhook Retell `call_analyzed`.

**Mauvais :**

```typescript
// apps/web/app/api/retell/events/route.ts — MAUVAIS
export async function POST(req: Request) {
  const body = await req.json();
  if (body.event === 'call_analyzed') {
    // Risque timeout 10s → Retell retry → double-traitement
    const summary = await openai.chat.completions.create({ /* long prompt */ });
    await supabaseAdmin
      .from('call_logs')
      .update({ summary: summary.choices[0].message.content })
      .eq('retell_call_id', body.call.call_id);
  }
  return Response.json({ ok: true });
}
```

**Bon :** insert dans `pending_jobs`, retour 200 immédiat, cron pull.

```typescript
// apps/web/app/api/retell/events/route.ts — BON (extrait)
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyRetellSignature } from '@/lib/retell-verify';

export async function POST(req: Request) {
  const rawBody = await verifyRetellSignature(req);
  const body = JSON.parse(rawBody);

  if (body.event === 'call_analyzed') {
    await supabaseAdmin.from('pending_jobs').insert({
      job_type: 'post_call_summary',
      payload: { retell_call_id: body.call.call_id },
      status: 'pending',
    });
  }
  return Response.json({ ok: true });
}
```

```typescript
// apps/web/app/api/cron/process-jobs/route.ts
import { supabaseAdmin } from '@/lib/supabase-admin';
import { runPostCallSummary } from '@/lib/jobs/post-call-summary';
import { verifyCronSecret } from '@/lib/cron-verify';

export const maxDuration = 60;

export async function GET(req: Request) {
  verifyCronSecret(req);

  const { data: jobs } = await supabaseAdmin
    .from('pending_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  for (const job of jobs ?? []) {
    await supabaseAdmin
      .from('pending_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id);

    try {
      if (job.job_type === 'post_call_summary') {
        await runPostCallSummary(job.payload.retell_call_id);
      }
      await supabaseAdmin.from('pending_jobs').update({ status: 'done' }).eq('id', job.id);
    } catch (err) {
      await supabaseAdmin.from('pending_jobs').update({
        status: 'failed',
        error_message: String(err),
        attempts: (job.attempts ?? 0) + 1,
      }).eq('id', job.id);
    }
  }

  return Response.json({ processed: jobs?.length ?? 0 });
}
```

**TODO migration future — `pending_jobs`** (pas créée au MVP, à ajouter quand `post-call-summary` sera implémenté) :

```sql
CREATE TABLE pending_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  attempts int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_status_created ON pending_jobs(status, created_at);
```

### Pattern B — Fire-and-forget via `waitUntil`

**Contexte.** `/api/retell/book` est appelé PENDANT la conversation. Chaque seconde = silence perçu. SMS Twilio et event GCal prennent 1-2s chacun. Vercel peut tuer la lambda dès que la réponse HTTP part → promesses orphelines.

**Import :**

```typescript
import { waitUntil } from '@vercel/functions';
```

Fonctionne sur **Node runtime** (par défaut) et **Edge runtime**. Installation : `pnpm add @vercel/functions` dans `apps/web`.

**Mauvais — promesse orpheline :**

```typescript
// apps/web/app/api/retell/book/route.ts — MAUVAIS
export async function POST(req: Request) {
  const { tenant_id, client_name, client_phone, booking_date, booking_time, service, call_log_id } = await req.json();

  const { data: booking } = await supabaseAdmin.from('bookings').insert({
    tenant_id, client_name, client_phone, booking_date, booking_time, service, call_log_id,
    status: 'pending_sync',
  }).select().single();

  // ❌ Vercel peut kill la lambda avant que sendBookingSms termine
  sendBookingSms(booking).catch(err => console.error('sms_failed', err));
  createCalendarEvent(booking).catch(err => console.error('gcal_failed', err));

  return Response.json({ success: true, booking_id: booking.id });
}
```

**Bon — `waitUntil` garde la lambda vivante :**

```typescript
// apps/web/app/api/retell/book/route.ts — BON
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendBookingSms } from '@/lib/twilio';
import { createCalendarEvent } from '@/lib/google-calendar';
import { verifyRetellSignature } from '@/lib/retell-verify';

export async function POST(req: Request) {
  const rawBody = await verifyRetellSignature(req);
  const {
    tenant_id,
    client_name,
    client_phone,
    booking_date,
    booking_time,
    service,
    call_log_id,
  } = JSON.parse(rawBody);

  // 1. Insert synchrone — booking_id renvoyé à Retell dans la réponse
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      tenant_id,
      call_log_id,
      client_name,
      client_phone,
      booking_date,
      booking_time,
      service,
      status: 'pending_sync',
    })
    .select()
    .single();

  if (error || !booking) {
    console.error(JSON.stringify({ level: 'error', event: 'booking_insert_failed', err: error?.message }));
    return Response.json({ success: false, error: 'db_insert_failed' }, { status: 500 });
  }

  // 2. Fire-and-forget garanti par waitUntil
  waitUntil(
    sendBookingSms(booking)
      .then(() =>
        supabaseAdmin
          .from('bookings')
          .update({ sms_confirmation_sent_at: new Date().toISOString() })
          .eq('id', booking.id)
      )
      .catch(err =>
        console.error(JSON.stringify({
          level: 'error',
          event: 'sms_failed',
          booking_id: booking.id,
          err: String(err),
        }))
      )
  );

  waitUntil(
    createCalendarEvent(booking)
      .then(eventId =>
        supabaseAdmin
          .from('bookings')
          .update({ google_event_id: eventId, status: 'confirmed' })
          .eq('id', booking.id)
      )
      .catch(err =>
        console.error(JSON.stringify({
          level: 'error',
          event: 'gcal_failed',
          booking_id: booking.id,
          err: String(err),
        }))
      )
  );

  // 3. Retour immédiat à Retell (<500ms)
  return Response.json({
    success: true,
    booking_id: booking.id,
    confirmation_message: `C'est noté pour le ${booking.booking_date} à ${booking.booking_time}.`,
  });
}
```

**Limite `waitUntil`.** Vercel garantit ~25s d'extension après la response HTTP avant de killer la lambda (observé, pas officiellement documenté). SMS (1-2s) + GCal (1-2s) = largement dans le budget. **Si une side-effect dépasse 15s cumulées, bascule sur Pattern A** (enqueue + cron) — `waitUntil` peut être coupée au-delà.

**Recovery si `createCalendarEvent` échoue.** Le booking reste `status='pending_sync'` sans `google_event_id`. Cron futur `/api/cron/retry-gcal-sync` (pas MVP) pull les `pending_sync` et retry. Au MVP, visible dans le dashboard Filanor — sync manuel.

**Runtime edge vs node.** Par défaut Node runtime, qui est ce qu'on veut. Supabase JS v2 a des subtilités en Edge (certains fetch helpers manquent, realtime HS). Rester en Node sauf besoin explicite — ce qui n'est jamais le cas sur un tool call Retell (Retell tolère 2-3s).

### Pattern C — Idempotence via clé unique

**Contexte.** Retell retry jusqu'à 3 fois sur 5xx. Traiter deux fois `call_ended` → double-comptage minutes, doublons `call_logs`. Twilio idem. Chaque endpoint doit être idempotent.

**Clés par endpoint :**

| Endpoint | Clé d'idempotence | Contrainte |
|----------|-------------------|------------|
| `/api/retell/events` (call_started/ended/analyzed) | `retell_call_id` | `UNIQUE (retell_call_id)` dans `call_logs` (déjà dans migration 0001 l. 80) |
| `/api/twilio/sms` inbound | `message_sid` | à ajouter dans une future table `sms_logs` |
| `/api/cron/*` | natif | Vercel Cron ne fire pas deux fois la même minute |

**Approche 1 — `INSERT ... ON CONFLICT` (call_started) :**

```typescript
// apps/web/app/api/retell/events/route.ts — extrait call_started
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveTenantByPhone } from '@/lib/tenants';

if (body.event === 'call_started') {
  const tenant = await resolveTenantByPhone(body.call.to_number);
  if (!tenant) {
    console.error(JSON.stringify({ level: 'error', event: 'tenant_not_found', to: body.call.to_number }));
    return Response.json({ ok: false, error: 'tenant_not_found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('call_logs').insert({
    tenant_id: tenant.id,
    retell_call_id: body.call.call_id,
    twilio_call_sid: body.call.telephony_identifier?.twilio_call_sid ?? null,
    from_number: body.call.from_number,
    to_number: body.call.to_number,
    direction: 'inbound',
    status: 'in_progress',
    started_at: new Date(body.call.start_timestamp).toISOString(),
  });

  // Postgres code 23505 = unique_violation → retry Retell, on ignore silencieusement
  if (error && error.code !== '23505') {
    console.error(JSON.stringify({ level: 'error', event: 'call_log_insert_failed', err: error.message }));
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
```

**Approche 2 — SELECT + early return (call_ended, on doit updater une ligne existante) :**

```typescript
if (body.event === 'call_ended') {
  const { data: existing } = await supabaseAdmin
    .from('call_logs')
    .select('id, status')
    .eq('retell_call_id', body.call.call_id)
    .single();

  if (existing?.status === 'completed') {
    return Response.json({ ok: true, already_processed: true });
  }

  const durationMs = body.call.end_timestamp - body.call.start_timestamp;
  await supabaseAdmin.from('call_logs').update({
    status: 'completed',
    ended_at: new Date(body.call.end_timestamp).toISOString(),
    duration_seconds: Math.round(durationMs / 1000),
    minutes_billed: Math.ceil(durationMs / 60000),
  }).eq('retell_call_id', body.call.call_id);

  return Response.json({ ok: true });
}
```

## Validation signature Retell

Retell signe chaque webhook avec HMAC-SHA256 en header `X-Retell-Signature`. Le secret de signature est **distinct de la clé API** — c'est `RETELL_WEBHOOK_SECRET`, fourni dans le dashboard Retell section "Webhooks" (cf. `.env.example` l. 8).

```typescript
// apps/web/lib/retell-verify.ts
// TODO: vérifier signature exacte du SDK retell-sdk à l'installation —
// la méthode peut être Retell.verify(), Retell.Verify.verify(), ou
// utils.verify() selon version. À trancher au moment de pnpm add retell-sdk.
import { Retell } from 'retell-sdk';

export async function verifyRetellSignature(req: Request): Promise<string> {
  const signature = req.headers.get('x-retell-signature');
  if (!signature) {
    throw new Response('missing_signature', { status: 401 });
  }

  const rawBody = await req.text();  // lire en raw — NE PAS req.json()
  const isValid = Retell.verify(rawBody, process.env.RETELL_WEBHOOK_SECRET!, signature);
  if (!isValid) {
    throw new Response('invalid_signature', { status: 401 });
  }

  return rawBody;
}
```

**Usage :**

```typescript
export async function POST(req: Request) {
  let rawBody: string;
  try {
    rawBody = await verifyRetellSignature(req);
  } catch (res) {
    return res as Response;
  }
  const body = JSON.parse(rawBody);
  // ...
}
```

**Piège.** `req.json()` consomme le body. Si tu fais `req.json()` AVANT la validation, le body est vide au moment du HMAC → signature toujours invalide. Toujours `req.text()` en premier dans le validator, puis `JSON.parse` dans le handler.

## Validation signature Twilio

Twilio signe via HMAC-SHA1 en header `X-Twilio-Signature`. SDK : `twilio` (npm).

```typescript
// apps/web/lib/twilio-verify.ts
import twilio from 'twilio';

export function verifyTwilioSignature(req: Request, bodyParams: Record<string, string>): boolean {
  const signature = req.headers.get('x-twilio-signature') ?? '';

  // Reconstruire l'URL publique exacte — pas req.url qui peut être localhost.
  // Prod Vercel set x-forwarded-host ; dev local ngrok set host. Fallback final = domaine prod.
  const host =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    'app.filanor.ch';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const url = `${proto}://${host}${new URL(req.url).pathname}`;

  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, bodyParams);
}
```

**Usage :**

```typescript
export async function POST(req: Request) {
  const formData = await req.formData();
  const params = Object.fromEntries(formData) as Record<string, string>;

  if (!verifyTwilioSignature(req, params)) {
    return new Response('invalid_signature', { status: 401 });
  }
  // ...
}
```

**Pièges.**
- Twilio envoie du `application/x-www-form-urlencoded` sur les webhooks voice/SMS par défaut, pas du JSON. Toujours `req.formData()`.
- En dev local avec ngrok, s'assurer que Twilio pointe sur l'URL ngrok ET que le signature validator reçoit la même URL (ngrok set bien `x-forwarded-host`, donc l'implémentation ci-dessus fonctionne).

## Logging et observabilité

**MVP — `console.log` structuré.** Vercel capture stdout/stderr → visible dans `vercel logs` et dashboard. Pas besoin de Logtail/Datadog tant qu'on est en phase pilote.

Format imposé :

```typescript
console.log(JSON.stringify({
  level: 'info',              // 'debug' | 'info' | 'warn' | 'error'
  event: 'booking_created',   // kebab-case, événement métier
  tenant_id,
  booking_id,
  // ...contexte libre
}));
```

Pas de `console.log('booking created ' + id)` — non filtrable dans le dashboard Vercel.

**Quand pousser en DB ?** Seulement dès le 1er client payant, pour l'audit nLPD et le dashboard Filanor. On ajoutera une table `app_logs` et un INSERT via `waitUntil` pour rester non-bloquant. Au MVP, non.

**Erreurs critiques.** DPA violé, webhook signature fail à répétition, OpenAI rate-limit prolongé → SMS Twilio à Filip. Pattern à câbler dans `lib/alerts.ts` dès le 1er cas réel, pas avant.

## Pièges connus

Miroir des "Points de vigilance" d'ADR-013, orientés code :

1. **Jamais `await` sur un appel externe long dans un tool call Retell.** Si `/api/retell/book` dépasse ~3s, Retell considère le call comme failed et raccroche. Cap : <2s synchrone + `waitUntil` pour le reste.

2. **`waitUntil` sans `.catch`.** Une promesse non-catchée dans `waitUntil` qui reject → la lambda crashe silencieusement et le log est perdu. Toujours `waitUntil(fn().catch(log))`.

3. **`req.json()` avant validation signature.** Consomme le body → HMAC invalide. Toujours `req.text()` dans le validator, puis `JSON.parse` dans le handler.

4. **Oublier `export const maxDuration = 60`** sur les routes de cron ou de traitement batch. Timeout 10s par défaut Hobby → crash silencieux.

5. **Retry Retell sur webhook 5xx.** 500 renvoyé = Retell retry 3 fois avec backoff. Sans idempotence → triple-traitement. Renvoyer 200 sur les cas "déjà traité".

6. **Supabase JS v2 en Edge runtime.** Certaines opérations ne fonctionnent pas en Edge (realtime, auth helpers, storage). Default Node, switch Edge uniquement si explicite.

7. **Secrets côté client.** Jamais de `process.env.RETELL_API_KEY` ou `RETELL_WEBHOOK_SECRET` dans un composant React — uniquement dans `/api/*` (server-side). Pour exposer au client : `NEXT_PUBLIC_*` et uniquement des valeurs non-secrètes.

8. **Cron Vercel — `verifyCronSecret()` n'est PAS optionnel.** Vercel auto-injecte `Authorization: Bearer $CRON_SECRET` UNIQUEMENT sur ses appels programmés via `vercel.json`. Si quelqu'un hit `/api/cron/purge-transcripts` depuis internet manuellement, l'env var ne protège rien — c'est ton code qui doit faire le check. Sans `verifyCronSecret()`, c'est un endpoint public.

```typescript
// apps/web/lib/cron-verify.ts
export function verifyCronSecret(req: Request): void {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Response('unauthorized', { status: 401 });
  }
}
```

Config `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/purge-transcripts", "schedule": "0 3 * * *" },
    { "path": "/api/cron/process-jobs", "schedule": "*/5 * * * *" }
  ]
}
```

Vérifier que `CRON_SECRET` est bien défini dans les env vars Vercel du projet **avant le premier deploy**.

## Références

- ADR-010 — Pas d'orchestrateur externe au MVP
- ADR-013 — Abandon n8n, orchestration Next.js + Vercel Cron
- Vercel `waitUntil` : https://vercel.com/docs/functions/functions-api-reference#waituntil
- Vercel Cron : https://vercel.com/docs/cron-jobs
- Retell webhooks : https://docs.retellai.com/api-references/webhooks
- Twilio validation : https://www.twilio.com/docs/usage/webhooks/webhooks-security
