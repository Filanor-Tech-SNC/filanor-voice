# STACK — Filanor Voice

## Stack complète

| Couche | Choix | Version | Pricing | Lien |
|--------|-------|---------|---------|------|
| Runtime | Node.js | 20 LTS | free | |
| Package manager | pnpm | 9.x | free | |
| Language | TypeScript | 5.4+ | free | |
| Front admin | Next.js | 16 (App Router) | free | |
| UI | Tailwind + shadcn/ui | latest | free | |
| Animations | Framer Motion + GSAP | latest | free | |
| DB | Supabase (Postgres 15) | hosted EU Frankfurt | Free tier → Pro $25/mo | supabase.com |
| Auth | Supabase Auth (email magic link) | | inclus Supabase | |
| Moteur voix | Retell AI | API v2 | $0.07/min base | retellai.com |
| Téléphonie | Twilio | | $1/num/mo + $0.02/min CH inbound | twilio.com |
| TTS | ElevenLabs (via Retell) | Flash v2.5 prod, v3 tests | surfacturé dans Retell | elevenlabs.io |
| LLM | OpenAI | GPT-4o mini | ~$0.003/min équivalent | openai.com |
| Orchestration | Next.js API routes + Vercel Cron | inclus dans apps/web | 0 CHF | ADR-010, ADR-013 |
| Hébergement app | Vercel | Pro | $20/mo | vercel.com |
| DNS | Infomaniak | | existant filanor.ch | |
| Monitoring | Vercel Analytics + Supabase logs | | inclus | |
| Paiement | Wise (manuel MVP) | | gratuit | wise.com |

**Coût fixe mensuel estimé (hors usage client) : ~60 CHF/mois** ⚠️
(valeur intermédiaire après retrait n8n — chiffres définitifs recalculés en batch C3. Source de vérité courante : `docs/COSTS.md`)
- Supabase Pro 25 + Vercel Pro 20 + OpenAI baseline 5 + Twilio baseline 10

## Versions épinglées

- Node : 20 LTS (`.nvmrc`)
- pnpm : 9.0.0 (via `packageManager` dans `package.json`)
- Next : 16 (App Router, stable)
- React : 19
- TypeScript : 5.4+
- Supabase CLI : latest

> Next 16 est livré avec un `AGENTS.md` officiel Vercel servant de référence pour les LLM (données d'entraînement souvent obsolètes vs API Next 16). Voir `apps/web/AGENTS.md` — à lire avant tout code Next.js.

## Plan 4 semaines (sprints jour/jour)

### Semaine 1 — Infra & premiers appels

**Jour 1 (lun)** — Comptes & provisioning
- Créer Supabase projet Frankfurt
- Appliquer migration `0001_init_schema.sql`
- Créer compte Retell, récupérer clé API
- Créer compte Twilio, KYC Filanor SNC (upload extrait RC + UID)

**Jour 2 (mar)** — Agents Retell
- Créer agent `AGENT_SALON` (template Sophie) via API
- Créer agent `AGENT_RESTAURANT` (template Marc) via API
- Importer voix ElevenLabs FR (Charlotte/Alice pour Sophie, Antoine/Adam pour Marc)
- Premier test voix en mode "play on web" (pas encore sur téléphone)

**Jour 3 (mer)** — Twilio + Retell reliés
- Acheter 2 numéros +41 Lausanne (un demo Sophie, un demo Marc)
- Configurer webhook Twilio inbound → Retell
- Implémenter endpoint `/api/retell/dynamic-variables` (charge tenant depuis Supabase via called_number)
- Premier appel end-to-end réussi

**Jour 4 (jeu)** — Workflows Next.js (ADR-010, ADR-013)
- Créer `apps/web/app/api/retell/events/route.ts` (switch sur `body.event`, idempotent, validation signature)
- Créer `apps/web/app/api/workflows/post-call-summary/route.ts` (invoqué par cron pull depuis `pending_jobs`)
- Créer `apps/web/app/api/cron/purge-transcripts/route.ts` + `vercel.json` avec cron quotidien
- Pas d'infra externe à monter, pas de webhook n8n à configurer

**Jour 5 (ven)** — Tampon / debug webhook dynamic-variables
- Durcir `/api/retell/dynamic-variables` (gestion tenant introuvable, fallback prompt minimal, logs structurés)
- Re-mesurer latence end-to-end premier appel (objectif <1s perçu)
- Debug des cas tombés pendant Jour 3-4 (signature invalide, format timestamp, formdata Twilio, etc.)
- Pas de nouvelle feature, consolidation uniquement

**Livrable S1** : Un numéro +41 qui répond avec Sophie, prend un RDV en Supabase, envoie un SMS. Stable, latence mesurée. **GCal bascule en S2.**

### Semaine 2 — Moteur RDV générique

**Jour 6 (lun)** — Google Calendar
- Configurer OAuth Google Calendar côté Filanor
- Stocker tokens dans Supabase par tenant (cf. `tenants.google_oauth_refresh_token`)
- Test complet : appel → RDV pris → event GCal créé end-to-end

**Jour 7 (mar)** — Générification du prompt (variables dynamiques Supabase)
**Jour 8 (mer)** — Gestion des cas edge (clients bilingues, annulations, modifications)
**Jour 9 (jeu)** — Rapports d'appels (résumé post-call, envoyé par email au tenant)
**Jour 10 (ven)** — Tests de charge (10 appels simultanés via Retell)

**Livrable S2** : Le moteur accepte n'importe quel salon/resto en config, pas de hard-code.

### Semaine 3 — Démo publique Sophie

**Jour 11-12** — Landing `filanor.ch/voix` (page dédiée)
- Section hero avec audio démo "Sophie" (MP3 d'une conversation de démo)
- Section comment ça marche (3 étapes)
- Section tarifs 199/349/590
- CTA "démo 30 min"

**Jour 13** — Provisioning Hair In The City (tenant démo interne)
**Jour 14** — Enregistrement audio démo propre (on scripte, on joue, on capture)
**Jour 15** — Publication filanor.ch/voix + push LinkedIn

**Livrable S3** : Page publique live, numéro de démo accessible (tu appelles, ça répond).

### Semaine 4 — Démo publique Marc + démarchage

**Jour 16-17** — Provisioning Trattoria Bellavita + enregistrement démo
**Jour 18** — Page `/voix/restaurant` avec variant
**Jour 19** — Pack commercial (one-pager PDF, pitch 60 secondes, script appel à froid)
**Jour 20** — Démarchage physique Lausanne : 10 salons + 10 restos visités en personne

**Livrable S4** : Deux démos publiques live + premier cycle de prospection lancé.

### Semaine 5-8 — Closing des pilotes

- S5 : onboarding du premier pilote payant (setup 590 + premier mois 199)
- S6 : deuxième pilote
- S7 : troisième pilote, premiers retours terrain
- S8 : itération produit basée sur les retours

**Objectif mesurable S8** : 1 à 3 clients pilotes payants signés.
