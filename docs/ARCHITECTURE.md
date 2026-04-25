# ARCHITECTURE — Filanor Voice

## Vue d'ensemble (ASCII)

```
                    ┌────────────────────────┐
                    │  Client final appelle  │
                    │  le numéro du salon    │
                    └──────────┬─────────────┘
                               │
                               │ renvoi d'appel (Swisscom/Sunrise/Salt)
                               ▼
                    ┌────────────────────────┐
                    │   Twilio +41 number    │
                    │   (assigné au tenant)  │
                    └──────────┬─────────────┘
                               │ SIP/Voice webhook
                               ▼
                    ┌────────────────────────┐
                    │       Retell AI        │
                    │  (agent SALON ou       │
                    │   RESTAURANT template) │
                    └──┬────┬────────────┬───┘
                       │    │            │
         dynamic vars  │    │ function   │  call_ended
         (au start)    │    │ calls      │  webhook
                       │    │            │
                       ▼    ▼            ▼
         ┌────────────────────┐  ┌────────────────┐
         │  Next.js API       │  │      n8n       │
         │  /api/retell/      │  │  workflows     │
         │  dynamic-variables │  │                │
         │  /api/retell/      │  │  - log Supabase│
         │  book              │  │  - GCal event  │
         │  /api/retell/      │  │  - SMS confirm │
         │  lookup-slot       │  │  - email recap │
         └──────────┬─────────┘  └────────┬───────┘
                    │                     │
                    ▼                     ▼
              ┌──────────────────────────────────┐
              │   Supabase (Postgres, Frankfurt) │
              │   tenants, phone_numbers,        │
              │   bookings, call_logs,           │
              │   call_transcripts (30j purge)   │
              └──────────────────────────────────┘
```

## Flow d'un appel entrant (happy path)

1. **Client final** appelle le numéro affiché du salon (ex: 021 800 12 34 — son vrai numéro)
2. Swisscom applique un **renvoi d'appel** vers le numéro Twilio Filanor assigné au salon (ex: 021 519 XX XX)
3. **Twilio** reçoit l'appel et le passe à **Retell** (webhook SIP / Twilio Voice → Retell)
4. **Retell** identifie l'agent (SALON dans ce cas) et appelle notre endpoint
   `POST /api/retell/dynamic-variables` avec `called_number=021-519-XX-XX`
5. Notre endpoint query Supabase :
   - `SELECT * FROM phone_numbers WHERE phone_number = '021-519-XX-XX'`
   - `JOIN tenants ON phone_numbers.tenant_id = tenants.id`
   - Retourne `{ tenant_name, services, opening_hours, praticiens, voice_id, language, calendar_id }`
6. Retell injecte ces variables dans le system prompt via `{{tenant_name}}` etc.
7. **Sophie (agent)** décroche : "Bonjour, salon Hair In The City, je suis Sophie..."
8. Conversation. Quand le client demande un RDV :
9. Retell appelle la **custom function** `book_appointment(date, time, service, client_name, client_phone)`
10. La custom function est servie par notre endpoint `POST /api/retell/book` :
    - Vérifie disponibilité GCal
    - Crée l'event GCal
    - Insère en `bookings` Supabase
    - Retourne le statut au voice agent
11. Sophie confirme vocalement. Raccroche.
12. Retell pousse webhook `call_ended` → **n8n workflow `01_call_ended_handler`** :
    - Log complet en `call_logs` Supabase
    - Transcript en `call_transcripts`
    - Résumé GPT-4o mini
    - SMS de confirmation au client (via Twilio)
    - Email récap au tenant

## Flow dynamic variables (détail Retell)

Retell permet d'injecter des variables au démarrage d'un appel sans latence perceptible
grâce à un endpoint que TU fournis, qu'ils appellent au ringing.

Config agent Retell :
```json
{
  "agent_name": "AGENT_SALON",
  "voice_id": "{{voice_id}}",
  "language": "multi",
  "response_engine": {
    "type": "retell-llm",
    "llm_id": "<llm_id>"
  },
  "webhook_url": "https://filanor.ch/api/retell/events",
  "retrieve_dynamic_variables_url": "https://filanor.ch/api/retell/dynamic-variables"
}
```

Endpoint `/api/retell/dynamic-variables` (TypeScript, Next.js route handler) :

```ts
// POST payload Retell :
// { call_id, agent_id, from_number, to_number, direction }

export async function POST(req: Request) {
  const { to_number } = await req.json();
  const { data: phone } = await supabase
    .from('phone_numbers')
    .select('tenant:tenants(*)')
    .eq('phone_number', to_number)
    .single();

  if (!phone) return Response.json({ error: 'unknown_number' }, { status: 404 });

  const t = phone.tenant;
  return Response.json({
    dynamic_variables: {
      tenant_name: t.business_name,
      tenant_type: t.sector, // 'salon' | 'restaurant'
      services: t.services_text,
      opening_hours: t.opening_hours_text,
      praticiens: t.praticiens_text,
      voice_id: t.voice_id,
      calendar_id: t.google_calendar_id,
      language_default: t.language_default
    }
  });
}
```

## Custom functions Retell

Définies dans la config agent Retell. Signatures :

### `book_appointment`
```json
{
  "type": "custom",
  "name": "book_appointment",
  "description": "Crée un rendez-vous dans l'agenda du salon/restaurant",
  "url": "https://filanor.ch/api/retell/book",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string", "description": "ISO 8601 date YYYY-MM-DD" },
      "time": { "type": "string", "description": "HH:MM 24h" },
      "duration_min": { "type": "integer" },
      "service": { "type": "string" },
      "praticien": { "type": "string" },
      "client_name": { "type": "string" },
      "client_phone": { "type": "string" },
      "notes": { "type": "string" }
    },
    "required": ["date", "time", "service", "client_name", "client_phone"]
  }
}
```

### `check_availability`
```json
{
  "name": "check_availability",
  "description": "Vérifie les créneaux disponibles à une date donnée",
  "url": "https://filanor.ch/api/retell/availability",
  "parameters": {
    "type": "object",
    "properties": {
      "date": { "type": "string" },
      "service_duration_min": { "type": "integer" },
      "praticien": { "type": "string" }
    },
    "required": ["date", "service_duration_min"]
  }
}
```

### `end_call`
```json
{
  "name": "end_call",
  "description": "Termine l'appel proprement après confirmation",
  "url": "https://filanor.ch/api/retell/end",
  "parameters": { "type": "object", "properties": {} }
}
```

## Composants clés

### `apps/web` (Next.js 15)
- Dashboard admin Filanor (Filip voit tous les tenants)
- API routes pour Retell (`/api/retell/*`)
- Landing publique `/voix` (page commerciale)

### `packages/retell-client`
- Wrapper typed autour de l'API Retell
- Méthodes : `createAgent`, `updateAgent`, `listCalls`, `getCall`, `purchasePhoneNumber`

### `packages/prompt-builder`
- Fonction `buildSystemPrompt(tenant: Tenant): string`
- Lit les templates dans `docs/PROMPTS/`
- Remplace les `{{variables}}` par les valeurs du tenant

### `n8n-workflows`
- Exportés en JSON, importables dans n8n self-hosted
- Chaque workflow a son README.md

### `supabase/migrations`
- Source of truth du schéma
- Versionné en SQL
- Appliqué via `pnpm supabase:migrate`

## Sécurité

- Toutes les routes API signent/valident le webhook secret Retell (header `X-Retell-Signature`)
- Supabase RLS activée : un tenant ne peut lire que ses propres données
- Service role key Supabase uniquement côté serveur (jamais exposée côté client)
- Secrets en `.env.local`, rotation tous les 90 jours

## Ce qui n'est PAS dans l'archi (volontairement)

- Pas de Redis (cache inutile au volume cible MVP)
- Pas de message queue (n8n fait la queue)
- Pas de Docker Compose custom (Supabase CLI pour le dev local)
- Pas de CI/CD complexe (Vercel deploy on push suffit)
- Pas de monitoring APM payant (Vercel Analytics + Supabase logs suffisent)
