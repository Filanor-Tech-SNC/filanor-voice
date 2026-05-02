# DECISIONS — Architecture Decision Records

Chaque décision technique figée est listée ici avec son contexte et sa justification.
**Règle** : ne jamais remettre en cause une ADR sans raison explicite documentée dans une nouvelle ADR qui l'invalide.

Format : `ADR-NNN · Titre · Statut · Date · Décideur(s)`
Statuts : `accepted` · `superseded` · `deprecated`

---

## ADR-001 · Moteur voix : Retell AI · accepted · 2026-04-22 · Filip

**Contexte.** On a besoin d'un moteur voice-AI managé pour éviter d'assembler STT + LLM + TTS + VAD + turn-detection à la main. Options étudiées : Retell, Vapi, Synthflow, Bland, self-hosted OpenAI Realtime API via LiveKit.

**Décision.** Retell AI.

**Justification.**
- Tarif facial $0.07/min, SOC 2 Type I & II, bon support function-calling (70%+ success rate multi-turn cité par OpenAI)
- Plus opinionated que Vapi (moins de branches à paramétrer), plus rapide à mettre en prod à équipe 1-2 personnes
- Support natif Twilio + SIP + webhook, natif ElevenLabs/OpenAI voices

**Contraintes connues.**
- Coût réel (LLM + Twilio + ElevenLabs inclus) ~$0.13-0.17/min, pas $0.07
- Latence observée ~800ms en pratique, pas 600ms annoncés
- SaaS US → DPA obligatoire

**Plan B documenté.** Si Retell devient limitant (prix, volumes), migration vers self-hosted basé sur `kirklandsig/AIReceptionist` (OpenAI Realtime + LiveKit + SIP). Même API pattern côté business logic grâce à notre wrapper `packages/retell-client`.

---

## ADR-002 · Téléphonie : Twilio avec numéros dédiés par client · accepted · 2026-04-22 · Filip

**Contexte.** Trois options : (a) numéro Twilio par client, (b) numéro partagé IVR, (c) SIP sur numéro existant du client.

**Décision.** Option (a) : 1 numéro géographique +41 par client, loué sur le compte Twilio Filanor, assigné à un tenant dans Supabase.

**Justification.**
- Option (b) tue la perception premium, exclue
- Option (c) dépend de l'opérateur du client (Swisscom résidentiel ne supporte pas SIP facilement), impossible à promettre en scale
- Coût Twilio ~1 CHF/mois/numéro, négligeable face au pricing
- Le client garde son numéro existant affiché partout et fait un **renvoi d'appel** vers son numéro Filanor — pratique standard Suisse, supportée par Swisscom/Sunrise/Salt
- KYC fait une fois avec l'extrait RC Filanor Tech SNC (voir `docs/COMPLIANCE_LPD.md` §KYC Twilio)

**Implémentation.**
- Script `scripts/provision-tenant.ts` achète un numéro via Twilio API à la création d'un tenant
- Mapping `phone_numbers.phone_number → tenants.id` dans Supabase
- Webhook inbound Twilio configuré au provisioning : `POST → Retell agent via dynamic variables`

---

## ADR-003 · Multi-tenant : 1 agent Retell par secteur + dynamic variables · accepted · 2026-04-22 · Filip

**Contexte.** Trois options : (a) 1 agent Retell par client, (b) 1 agent template par secteur + dynamic variables au start du call, (c) 1 agent universel qui lit tout via function-calling au runtime.

**Décision.** Option (b). Deux agents Retell : `AGENT_SALON` et `AGENT_RESTAURANT`. Les variables spécifiques au tenant (nom du salon, horaires, services, praticiens, calendrier lié, voix choisie) sont injectées via Retell's `dynamic_variables` au start du call, chargées depuis Supabase en fonction du numéro appelé.

**Justification.**
- Option (a) : coût Retell $2/numéro/mois + 1 agent/client = ingérable à 50+ clients
- Option (c) : latence +150-300ms (function-call au démarrage = blocant avant le "Allô"), UX dégradée
- Option (b) : latence startup quasi-nulle, scaling propre jusqu'à des centaines de clients

**Implémentation.**
- `system_prompt` Retell contient des placeholders `{{tenant_name}}`, `{{services}}`, etc.
- Webhook Retell `call_started` reçoit le `called_number`, on charge le tenant associé, on renvoie les `dynamic_variables` via le endpoint `retrieve_dynamic_variables`
- Voir `docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md` pour le template

---

## ADR-004 · Langues : FR + EN + DE dès le MVP · accepted · 2026-04-22 · Filip

**Contexte.** Option FR seul possible, mais Lausanne/Genève ont des touristes et expats, et pivot rapide Zurich/Bâle envisagé.

**Décision.** Dès le MVP, les agents supportent FR + EN + DE avec **détection automatique de langue**.

**Justification.**
- Positionne Filanor Voice au-dessus de vocal-ia.ch Starter 159 CHF (FR only)
- Couvre Suisse romande + alémanique + touristes
- Retell supporte le multilingual via ElevenLabs v2/v3

**Implémentation.**
- Agent Retell configuré avec `language: "multi"` + prompt qui reconnaît et bascule
- Voix ElevenLabs multilingual (Charlotte/Antoine supportent FR/EN/DE)
- Prompt inclut instructions "détecte la langue de la première phrase du client et bascule"

---

## ADR-005 · Calendrier MVP : Google Calendar only · accepted · 2026-04-22 · Filip

**Contexte.** Options : GCal only, GCal + webhook générique, GCal + Planity, GCal + Planity + TheFork.

**Décision.** Google Calendar only au MVP. Les intégrations Planity / TheFork / systèmes POS sont hors scope des 8 premières semaines.

**Justification.**
- 80%+ des PME non-digitalisées ciblées ont déjà un Google Calendar
- Planity n'expose pas d'API publique officielle — il faudrait passer par `Chift` ou scraper, trop risqué au MVP
- TheFork pareil — réservations via widget fermé
- On peut toujours **logger dans Google Calendar** ET notifier par SMS. Si le client utilise Planity en parallèle, il double-saisit pour l'instant — on automatisera plus tard

**Post-MVP.** Ajouter intégration Planity quand 3+ clients salons le demandent (ADR future).

---

## ADR-006 · Hébergement données : Supabase region Frankfurt (EU) · accepted · 2026-04-22 · Filip

**Contexte.** Supabase dispo en plusieurs régions. Question : tout EU, ou split EU + purge rapide pour les transcripts sensibles.

**Décision.** Tout sur Supabase Frankfurt (`eu-central-1`), avec purge automatique des transcripts bruts après 30 jours (résumés conservés).

**Justification.**
- nLPD art. 16 : transfert à l'étranger OK si niveau de protection adéquat → l'EU est listée comme adéquate
- Un seul provider = simplicité opérationnelle
- Zurich serait idéal mais Supabase ne l'offre pas à ce jour
- Purge 30j limite le blast radius en cas de breach

**Implémentation.**
- Trigger SQL `pg_cron` : `DELETE FROM call_transcripts WHERE created_at < NOW() - INTERVAL '30 days'`
- Les `call_summaries` (résumés courts) sont conservés sans limite
- Voir `docs/COMPLIANCE_LPD.md` pour détail rétention

---

## ADR-007 · Stack front admin : Next.js 15 from scratch, pas de boilerplate payant · accepted · 2026-04-22 · Filip

**Contexte.** Options : from scratch, Vercel B2B starter, Makerkit/Supastarter (~$299).

**Décision.** Next.js 15 + App Router + Tailwind + shadcn/ui + Supabase Auth, from scratch.

**Justification.**
- Filip est avancé sur Next.js, gain boilerplate marginal
- shadcn/ui donne 80% du visuel sans dépendance lock-in
- Pas de Stripe au MVP (paiement manuel / Wise pour les 3 premiers clients pilotes)
- Multi-tenant minimaliste : un seul dashboard Filanor (Filip) qui voit tous les tenants. Pas de login "client final" au MVP — le client ne touche pas à l'app web, il communique par email/Slack.

**Implémentation.**
- `apps/web` = dashboard interne Filanor uniquement
- Pas d'org/team/role complexe — Filip + Daniel ont accès via Supabase Auth, c'est tout

---

## ADR-008 · Pricing & marges · accepted · 2026-04-22 · Filip

**Décision.**

| Plan | Prix CHF/mois | Min. incluses | Overage CHF/min | Marge brute cible |
|------|--------------|---------------|-----------------|-------------------|
| Starter | 199 | 120 | 0.35 | ~88% |
| Pro | 349 | 350 | 0.35 | ~83% |
| Setup | 590 one-shot | — | — | ~19% |

Coût stack estimé : 0.15 CHF/min variable + 6 CHF/mois fixe par tenant.
Détails dans `docs/PRICING.md`.

**Principe.** On ne rentre PAS en guerre des prix avec vocal-ia.ch (159 CHF Starter).
Différenciation : FR+EN+DE inclus dès Starter, setup physique sur place chez le client (Lausanne et environs), SLA écrit,
quota supérieur (120 vs 100 min), intégration GCal + SMS bundled.

---

## ADR-009 · Langage : TypeScript partout, pas de Python · accepted · 2026-04-22 · Filip

**Décision.** Tous les scripts, workers, handlers webhook, wrappers API : TypeScript.

**Justification.** Filip est débutant Python. Unifier le langage réduit la charge cognitive et les bugs.

---

## ADR-010 · Pas d'orchestrateur externe au MVP, tout dans `apps/web` · accepted · 2026-04-22 · Filip

**Contexte.** Les webhooks entrants (Retell, Twilio), les appels sortants (Google Calendar, Twilio SMS, OpenAI summaries) et les jobs programmés (purge 30j, rapports hebdo) doivent vivre quelque part. Options : orchestrateur dédié (n8n self-hosted, Make, Zapier, Temporal), service backend séparé, ou tout dans les API routes de `apps/web`.

**Décision.** Toute la logique d'orchestration vit dans `apps/web` sous `app/api/*`. Les jobs programmés passent par **Vercel Cron** via `vercel.json`. Les jobs trop longs pour une fonction Vercel passent par **Supabase Edge Functions** ou un pattern enqueue + cron pull.

**Justification.**
- Un seul déploiement, un seul endroit à debugger, une seule pipeline CI
- Zéro coût fixe additionnel (pas de VPS, pas de Railway, pas de Temporal Cloud)
- Filip est avancé TypeScript — gain no-code nul
- Pas de divergence possible entre "workflow exporté en JSON" et "workflow live"
- Une PME avec ≤50 clients ne sature pas une fonction serverless

**Conséquences / limites connues.**
- Timeout fonction Vercel Hobby : 10s par défaut (extensible 60s via `maxDuration`). Jobs plus longs = Supabase Edge Functions ou pattern enqueue.
- Pas de retry natif : chaque endpoint doit être idempotent (contrainte unique côté Supabase + `ON CONFLICT DO NOTHING`).
- Pas de visualisation du flow : si un client final veut voir ses runs, il faudra une UI custom (hors MVP).
- Vercel Cron Hobby : 2 crons/jour max. Suffisant MVP (1 cron purge) ; consolidation ou passage Pro si on en ajoute.

**Plan B.** Au-delà de ~10k appels/mois ou workflows vraiment complexes (branches conditionnelles, attentes inter-étapes, retries fins), on regardera Trigger.dev self-hosted ou Supabase Edge Functions + `pg_cron`. **On ne réintroduira pas n8n.**

---

## ADR-011 · Séparation des repos : filanor.ch (vitrine) vs filanor-voice (app.filanor.ch) · accepted · 2026-04-22 · Filip

**Contexte.** Le site marketing `filanor.ch` est déjà live (Next.js 15 + GSAP, repo séparé, Vercel). Question : où vivent les endpoints API voice (`/api/retell/*`, `/api/twilio/*`, `/api/workflows/*`) et le dashboard interne Filanor Voice ?

**Décision.** Deux repos distincts :
- **`filanor.ch`** (existant, hors de ce workspace) : vitrine marketing uniquement. Domaine racine `https://filanor.ch`. La future page produit `/voix` y vit aussi.
- **`filanor-voice`** (ce repo) : backend (API routes Retell/Twilio/workflows) + dashboard interne Filanor. Déployé sur **`https://app.filanor.ch`**.

**Justification.**
- Séparation des concerns : le marketing bouge souvent (copy, animations), le backend voice bouge peu mais est critique. Mélanger = risque qu'un deploy cosmétique casse la prod voix.
- Rollbacks indépendants : on rollback le site vitrine sans toucher aux agents en production.
- Hygiène produit : pas de secrets backend (Retell, Twilio, Supabase service role) dans le repo que Filip touche pour un changement de copy.
- CI/CD distincts : le site marketing n'a pas besoin de la suite de tests backend et vice-versa.

**Implémentation.**
- Sous-domaine `app.filanor.ch` à configurer dans DNS Infomaniak (CNAME vers `cname.vercel-dns.com`).
- `NEXT_PUBLIC_APP_URL=https://app.filanor.ch` dans `.env.example` et `.env.local`.
- Toutes les URLs webhook (Retell `agent.webhook_url`, Twilio inbound, callbacks) pointent sur `app.filanor.ch/api/*`.
- La future page `/voix` (marketing) ajoutée dans le repo `filanor.ch` pointera sur le numéro Twilio de démo, pas sur une URL technique.

**Conséquences.**
- URL client-facing toujours `filanor.ch/voix`, jamais `app.filanor.ch` (sous-domaine interne technique).
- Types partagés (ex. `TenantConfig`) : duplication acceptable au MVP. Si ça devient gênant, package npm privé plus tard.

---

## ADR-012 · Supabase Free tier en phase 0, Pro dès le premier client payant · accepted · 2026-04-22 · Filip

**Contexte.** ADR-006 statuait Supabase Pro Frankfurt + purge `pg_cron`. Reconsidération : tant qu'aucun client payant n'est onboardé, 25 USD/mo pour Pro n'a pas de sens.

**Décision.** Supabase **Free tier** en phase 0 (avant le premier pilote payant). Upgrade Pro le jour où on signe le premier pilote.

**Justification.**
- Économie ~25 USD × 2-3 mois estimés avant 1er pilote
- Free tier reste en region Frankfurt → conforme nLPD (ADR-006 inchangé sur ce point)
- Pause après 7 jours d'inactivité acceptable en dev pur (personne n'appelle en prod)
- Limites free (500 MB DB, 1 GB storage, 5 GB bandwidth) largement suffisantes pour 2 numéros de démo

**Conséquences.**
- Pas de `pg_cron` en Free → purge 30j des transcripts via **Vercel Cron** (`apps/web/app/api/cron/purge-transcripts/route.ts`), cf. ADR-010.
- `SELECT cron.schedule(...)` dans `supabase/migrations/0001_init_schema.sql` commenté avec TODO "réactiver au passage Pro — cf ADR-012".
- Upgrade Pro à déclencher **la semaine de signature du 1er pilote**, pas avant.
- Après upgrade Pro, on peut (re)basculer la purge sur `pg_cron` si plus fiable, mais pas obligatoire.

**Rapport à ADR-006.** ADR-006 reste `accepted` sur tous ses autres points (region Frankfurt, rétention 30j transcripts, conservation `call_summaries`). ADR-012 amende uniquement le point "Pro d'emblée".

---

## ADR-013 · Abandon n8n au MVP, orchestration Next.js API routes + Vercel Cron · accepted · 2026-04-22 · Filip

**Contexte.** Le bootstrap initial prévoyait n8n self-hosted (VPS Hetzner ou Railway, 10-15 CHF/mo) pour 4 workflows. Reconsidération après analyse — corollaire direct d'ADR-010.

**Décision.** Pas de n8n. Les workflows deviennent des routes Next.js dans `apps/web` :

| Workflow initial | Nouvel emplacement |
|------------------|--------------------|
| `01_call_ended_handler` | `apps/web/app/api/workflows/call-ended/route.ts` |
| `02_custom_function_book` | `apps/web/app/api/retell/book/route.ts` |
| `03_sms_confirmation` | fonction `sendBookingSms()` appelée depuis `book/route.ts` (fire-and-forget via `waitUntil`) |
| `04_post_call_summary` | `apps/web/app/api/workflows/post-call-summary/route.ts` (déclenché par `call_analyzed` dans `/api/retell/events`) |
| `05_purge_transcripts` (nouveau) | `apps/web/app/api/cron/purge-transcripts/route.ts` (Vercel Cron) |

**Justification.**
- Filip avancé TS, 4 workflows font <200 lignes chacun
- Zéro coût additionnel (vs 10-15 CHF/mo Railway)
- Un seul endroit à debugger, un seul déploiement, pas de divergence export/live
- Daniel n'est pas sur ce projet, pas besoin d'UI no-code

**Points de vigilance (à respecter dans `.claude/skills/api-routes/SKILL.md`).**
- **Timeout Vercel Hobby 10s** : `post-call-summary` appelle OpenAI sur un transcript potentiellement long. Pattern → enqueue dans une table `pending_jobs` et traitement via Vercel Cron, **ou** Supabase Edge Function. Ne **jamais** synchroniser un résumé long dans le webhook `call_analyzed`.
- **Latence conversationnelle** : `sendBookingSms()` et `createCalendarEvent()` appelés depuis le tool call `book` **ne doivent pas être `await`és** dans le chemin critique, sinon on ajoute 2-4s de silence pendant la conversation. Les erreurs sont loggées + recovery via un statut `pending` en DB + cron de retry.
- **Fire-and-forget ≠ promesse orpheline** : sur Vercel serverless, une fonction peut être killée dès que la réponse HTTP part. Un `sendSms(...).catch(log)` nu n'est pas garanti d'aboutir — la promesse peut être abandonnée avant la fin du fetch. Utiliser `waitUntil` de `@vercel/functions` : `waitUntil(sendBookingSms(...).catch(log))` garde la lambda vivante jusqu'à la résolution, sans bloquer le retour HTTP. Latence perçue côté Retell = instantanée, side-effects garantis d'aboutir (modulo timeouts propres aux APIs appelées).
- **Idempotence obligatoire** : chaque webhook entrant (Retell, Twilio, cron) doit être idempotent. Clé d'idempotence = `call_id` Retell ou `message_sid` Twilio, contrainte unique côté Supabase + `ON CONFLICT DO NOTHING`.

**Nettoyage associé.**
- Suppression `n8n-workflows/`
- Suppression `.claude/skills/n8n-workflow/`
- Création `.claude/skills/api-routes/SKILL.md`
- Mise à jour `CLAUDE.md`, `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/PRICING.md`

**Plan B.** Si on atteint des volumes qui cassent ce modèle ou si on a des workflows vraiment complexes, on regardera **Trigger.dev** (code-first TS) ou Supabase Edge Functions + queues. On ne réintroduira pas n8n.

---

## ADR-014 · Structure docs canonique = MAJUSCULES, suppression série numérotée 00-11 · accepted · 2026-04-24 · Filip

**Contexte.** Le bootstrap initial du repo (généré le 2026-04-22 via Claude chat web) a produit une **double arborescence** dans `docs/` : (a) la structure canonique en MAJUSCULES référencée par `CLAUDE.md` §1 (`ARCHITECTURE.md`, `DECISIONS.md`, `STACK.md`, `PRICING.md`, `JOURNAL.md`, `COMPLIANCE_LPD.md`, `SETUP_ACCOUNTS.md`, `GLOSSARY.md`, `ANTI_PATTERNS.md`, `COSTS.md`, sous-dossiers `PROMPTS/` et `legal/`) ; (b) une **série numérotée fantôme** `docs/00-*.md` à `docs/11-*.md` plus `docs/02-database-schema.sql` (12 fichiers au total). Détectée en session 2 (2026-04-22), traitement reporté au batch C1.5.

**Décision.** La structure canonique = **fichiers MAJUSCULES** (+ sous-dossiers `PROMPTS/`, `legal/`). La série fantôme 00-11 est **supprimée intégralement**. Pour tout futur contenu doc, créer un fichier MAJUSCULES dédié (ex: `ONBOARDING.md`, `SALES.md`) — **plus jamais de série numérotée**.

**Justification.**
- `CLAUDE.md` §1 référence déjà la structure MAJUSCULES comme la seule source de vérité — aligner le repo sur le contrat doc.
- **Pricing fantôme caduc** : `00-context-business.md` et `11-pricing-and-sales.md` proposent Starter 150 min / overage 0,99 CHF/min, alors que canonique = 120 min / 0,35 CHF/min (CLAUDE.md §3, PRICING.md, ADR-008). Risque de prendre une décision commerciale sur un chiffre faux.
- **Schéma DB fantôme divergent** : `02-database-schema.sql` propose un schéma totalement différent du canonique `supabase/migrations/0001_init_schema.sql` (tenant_config séparé, calls vs call_logs, appointments vs bookings, contacts vs leads, admin_users en plus). N'a jamais été appliqué — risque actif si quelqu'un le pousse en SQL Editor par erreur.
- **n8n caduc** : `07-n8n-workflows.md` contredit ADR-013 (abandon n8n). Conserver = invitation à un retour en arrière.
- **URLs caduques** : `01-architecture.md` et `06-retell-functions.md` pointent sur `https://filanor.ch/api/...` alors que ADR-011 acte `app.filanor.ch` comme sous-domaine technique.
- **Contenu unique commercial** (`09-onboarding-tenant.md` étapes 0/1/3-7, `11-pricing-and-sales.md` scripts cold call/visite physique/cibles par quartier) : suppression sèche assumée. Ce contenu est théorique aujourd'hui, sera réécrit avec retours terrain en S5-S8 après premier vrai démarchage. Pas de valeur à le conserver.

**Implémentation.**
- Supprimés en bloc : `docs/00-context-business.md`, `docs/01-architecture.md`, `docs/02-database-schema.sql`, `docs/03-database-schema.md`, `docs/04-system-prompt-salon.md`, `docs/05-system-prompt-resto.md`, `docs/06-retell-functions.md`, `docs/07-n8n-workflows.md`, `docs/08-twilio-swiss-setup.md`, `docs/09-onboarding-tenant.md`, `docs/10-roadmap-4-weeks.md`, `docs/11-pricing-and-sales.md`.
- `src/README.md` : référence `docs/10-roadmap-4-weeks.md` → `docs/STACK.md` §"Plan 4 semaines".
- Anti-pattern "Bootstrap initial contenant une structure docs fantôme" déjà ajouté en session 2 (`ANTI_PATTERNS.md`).

**Conséquences.**
- Une seule source de vérité par sujet (architecture → ARCHITECTURE.md, schéma → migration 0001, prompts → PROMPTS/, etc.).
- Toute future documentation doit suivre le pattern MAJUSCULES (ex. `ONBOARDING.md` quand on industrialise le tunnel client à S5-S8).
- C3 (refonte `ARCHITECTURE.md` ASCII pour retirer n8n, recalcul totaux PRICING.md, commentaire `pg_cron` dans migration 0001) **reporté** — non bloquant pour MVP, à traiter quand la dette technique le réclame.

---

## ADR-015 · Pattern Retell `call_inbound` webhook + SIP Trunking Twilio · accepted · 2026-05-01 · Filip

**Contexte.** En session 2 (2026-04-27), l'agent Sophie a été configuré côté Retell avec un champ `retrieve_dynamic_variables_url` pointant vers `/api/retell/dynamic-variables`. Pour les Web Calls (panel Test Audio dashboard Retell), Filip remplit manuellement les dynamic_variables — donc le webhook n'est pas réellement consommé. Pour brancher le numéro Twilio `+41 21 539 13 91` acquis le 2026-05-01 et faire passer un VRAI appel téléphonique entrant, il faut le pattern d'injection runtime.

Recherche menée (2026-05-01 via docs.retellai.com) confirme :
1. Le champ `retrieve_dynamic_variables_url` a été retiré de l'API Retell.
2. Le webhook moderne `call_inbound` est configuré sur le **PHONE NUMBER**, pas sur l'agent. Champ `inbound_webhook_url` set via `PATCH /update-phone-number/{phone_number}` ou directement à `POST /import-phone-number`.
3. Le routing Twilio → Retell ne passe plus par la "Voice URL" classique du numéro mais par un **Elastic SIP Trunk** Twilio pointant sur `sip:sip.retellai.com`.

**Décision.**
1. Bascule sur le pattern Retell `call_inbound` webhook : nouveau endpoint `apps/web/app/api/retell/inbound-webhook/route.ts` qui consomme `{event:"call_inbound", call_inbound:{from_number, to_number, agent_id, ...}}` et répond `{call_inbound:{dynamic_variables:{...}}}`.
2. Routing Twilio → Retell via Elastic SIP Trunking Twilio (Origination URI `sip:sip.retellai.com`) + `POST https://api.retellai.com/import-phone-number` côté Retell pour binder l'agent et l'inbound webhook au numéro.
3. Tenant lookup keyed par `to_number` côté webhook ; hardcoded `+41 21 539 13 91 → HAIR_IN_THE_CITY` en MVP (cf. `apps/web/lib/tenants/hair-in-the-city.ts`). Multi-tenant Supabase prévu en S5+.

**Justification.**
- Pas d'alternative : le `retrieve_dynamic_variables_url` legacy retourne 404 / ne déclenche plus d'événement.
- SIP Trunking est la seule voie officielle 2026 documentée pour brancher un numéro Twilio existant à un agent Retell. La voie alternative `POST /create-phone-number` (achat de numéro via Retell) est limitée US/CA, donc inutilisable pour la Suisse.
- Webhook sur le PHONE NUMBER (pas l'agent) est le bon scope : un même agent template peut servir plusieurs numéros, chacun avec un `inbound_webhook_url` différent — alignement parfait avec ADR-003 (1 agent par secteur + dynamic variables par tenant).

**Implémentation.**
- `apps/web/lib/tenants/hair-in-the-city.ts` : config statique tenant (10 dynamic_variables), seule source de vérité.
- `apps/web/lib/inbound/build-response.ts` : fonction pure `buildInboundResponse(body)` qui valide le payload Retell et retourne la réponse à émettre.
- `apps/web/app/api/retell/inbound-webhook/route.ts` : POST handler Next.js qui invoque `buildInboundResponse`, log structuré, `assertNoTemplatePlaceholders` sur la réponse.
- `apps/web/lib/inbound/__tests__/build-response.test.ts` : 7 tests Vitest (cas valide HitC + 6 cas d'erreurs + anti-placeholder).
- `apps/web/app/api/retell/dynamic-variables/route.ts` : marqué `DEPRECATED`, conservé pour rollback + compatibilité Web Call dashboard. Réutilise `HAIR_IN_THE_CITY` du nouveau lib tenants.
- `scripts/import-twilio-number.mjs` : `POST https://api.retellai.com/import-phone-number` avec `phone_number, termination_uri, inbound_agents:[{agent_id, weight:1}], inbound_webhook_url, sip_trunk_auth_*`.
- Côté Twilio (manuel dashboard) : Elastic SIP Trunk créé, `+41 21 539 13 91` assigné au trunk (pas de Voice URL classique).
- Validation signature `x-retell-signature` : reportée à la session "Webhook hardening" (cohérent avec dynamic-variables et Cal.com).

**Conséquences.**
- Branche le numéro Twilio acheté (premier appel téléphonique réel possible).
- Une seule source de vérité de la config tenant (`lib/tenants/`) pour les 2 endpoints (legacy + moderne).
- Préfigure le multi-tenant : le `TENANT_BY_NUMBER` deviendra un lookup Supabase en S5+, sans toucher au shape de réponse Retell.
- L'ancienne route `/api/retell/dynamic-variables` reste accessible mais marquée DEPRECATED.
- Dépendance opérationnelle : configurer un Elastic SIP Trunk côté Twilio est un setup manuel par tenant en MVP. Industrialisable plus tard (un seul SIP trunk partagé multi-numéros + `POST /import-phone-number` automatisé par tenant).

**Plan B.** Si Retell change encore d'API ou si le SIP trunking pose problème, fallback documenté = `POST /v2/register-phone-call` (custom telephony dial-to-SIP). Évité tant que possible — pattern réservé aux IVR custom complexes.

---

## Template pour les futures ADR

```
## ADR-NNN · Titre court · statut · YYYY-MM-DD · Décideur

**Contexte.** Pourquoi cette décision est nécessaire maintenant.

**Décision.** Ce qui est acté.

**Justification.** Les pourquoi, avec alternatives écartées.

**Implémentation.** Les fichiers/commandes impactés.

**Conséquences.** Ce que ça ferme / ouvre pour le futur.
```
