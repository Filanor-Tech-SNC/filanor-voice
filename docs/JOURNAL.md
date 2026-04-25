# JOURNAL

Journal **append-only** — chaque session Claude Code ajoute une entrée à la fin.
**Ne jamais éditer une entrée passée.** Si correction nécessaire, ajouter une nouvelle
entrée qui réfère à la précédente.

Format d'une entrée :

```
## YYYY-MM-DD · HHhMM · <Qui> · <Titre court>

### Ce qui a été fait
- ...

### Ce qui bloque / questions ouvertes
- ...

### Prochaine étape recommandée
- ...

### Fichiers modifiés
- path/to/file1
- path/to/file2
```

---

## 2026-04-22 · 09h00 · Filip (via Claude chat web) · Bootstrap initial

### Ce qui a été fait
- Création du repo `filanor-voice` (structure complète de dossiers)
- `CLAUDE.md` racine rédigé (règles, stack, workflow de session)
- `docs/DECISIONS.md` avec ADR-001 à ADR-009 (stack, multi-tenant, langues, calendrier, pricing, hébergement, etc.)
- `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, `docs/ANTI_PATTERNS.md`, `docs/COMPLIANCE_LPD.md`, `docs/PRICING.md`
- `docs/PROMPTS/` avec system prompt universel + variants salon/restaurant + scénarios de test
- Schéma initial Supabase `supabase/migrations/0001_init_schema.sql`
- `.claude/commands/` avec `/new-tenant`, `/new-agent`, `/check-compliance`, `/end-session`
- `.claude/skills/` avec retell-config, supabase-migration, n8n-workflow, twilio-number, prompt-template
- `.env.example` avec toutes les clés nécessaires

### Ce qui bloque / questions ouvertes
- Aucun blocage. Prêt à démarrer.
- **Confirmation nécessaire** : Filip doit valider les ADR avant que Claude Code lance la moindre commande exécutable. Le `CLAUDE.md` demande explicitement de lire DECISIONS avant d'agir.

### Prochaine étape recommandée

**Session 1 — Semaine 1, Jour 1 (priorité max) :**
1. Créer le projet Supabase `filanor-voice-prod` en region Frankfurt (manuel via dashboard Supabase)
2. Appliquer la migration `0001_init_schema.sql` (`pnpm supabase:migrate`)
3. Créer le compte Retell, récupérer la clé API
4. Créer les 2 agents Retell (SALON, RESTAURANT) via `/new-agent` — prompts dans `docs/PROMPTS/`
5. Ouvrir le compte Twilio avec KYC Filanor Tech SNC (extrait RC + UID)
6. Acheter 2 numéros de test +41 Lausanne via Twilio Console (un pour Sophie/Hair In The City demo, un pour Marc/Trattoria Bellavita demo)
7. Faire le premier appel de test en end-to-end (Twilio → Retell → log Supabase)

Référence sprint : `docs/STACK.md` § "Plan 4 semaines".

### Fichiers modifiés
- `CLAUDE.md`
- `README.md`
- `.env.example`, `.gitignore`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`
- `docs/` (tous les fichiers listés ci-dessus)
- `supabase/migrations/0001_init_schema.sql`
- `.claude/commands/*`, `.claude/skills/*`

---

## 2026-04-22 · 12h00 · Filip + Claude (Opus 4.7) · Session 2 — ADR 010-013, suppression n8n, URL app.filanor.ch

### Ce qui a été fait
- 4 ADR ajoutées (ADR-010 à ADR-013) : pas d'orchestrateur externe au MVP, séparation repos `filanor.ch`/`filanor-voice` via sous-domaine `app.filanor.ch`, Supabase Free tier phase 0, abandon n8n.
- Nouveau skill `.claude/skills/api-routes/` avec patterns `waitUntil` / enqueue / idempotence / validation signatures Retell+Twilio.
- Suppression dossier `n8n-workflows/` et skill `.claude/skills/n8n-workflow/`.
- Nouveau fichier `docs/COSTS.md` (burn rate phase 0 ~12-15 CHF/mo, phase 1 ~55-75 CHF/mo).
- Anti-patterns ajoutés : `$schema` settings.json + structure docs fantôme.
- Batch C1+C2 : retrait n8n + mise à jour URLs `filanor.ch` → `app.filanor.ch` dans CLAUDE.md (§4, §5, §6, §12), README.md, .env.example (bloc n8n supprimé, URLs corrigées, `CRON_SECRET=` ajouté), .claude/commands/new-agent.md, .claude/skills/retell-config, .claude/skills/twilio-number, docs/STACK.md, docs/PRICING.md, docs/DECISIONS.md (ADR-001/009 bullets caducs retirés), docs/PROMPTS/TEST_SCENARIOS.md (T-04), docs/legal/privacy-policy-template.md (tableau sous-traitants), docs/legal/dpa-checklist.md (section n8n retirée).
- STACK.md : Jour 4 refondu en "Workflows Next.js", Jour 5 devient tampon/debug, GCal bascule à Jour 6 (début S2), Semaine 2 reventilée.
- Chiffres temporairement caducs marqués inline avec `⚠️ recalcul C3` dans PRICING.md et STACK.md.
- Règle générale "marqueur ⚠️ sur chiffre caduc" ajoutée dans `.claude/commands/end-session.md` §Règle.

### Ce qui bloque / questions ouvertes
- **Structure docs fantôme** : série numérotée `docs/00-11-*.md` détectée, NON traitée dans ce batch. Report à batch C1.5 (ADR-014 à créer avant cleanup). Ne PAS utiliser ces fichiers comme référence en attendant.
- Totaux PRICING/STACK burn rate marqués ⚠️ — recalcul définitif en C3.
- Schéma ASCII `docs/ARCHITECTURE.md` contient toujours n8n (bloc, composants clés, flow call_ended) — à traiter en C3.
- Migration `supabase/migrations/0001_init_schema.sql` l. 226-230 `pg_cron` à commenter avec TODO ADR-012 — à traiter en C3.
- Comptes à créer sous `contact@filanor.ch` : Supabase (org "Filanor Tech"), Retell, Twilio, ElevenLabs, OpenAI, Google Workspace (tous à neuf, rien d'existant).
- Extrait RC Vaud + UID Filanor Tech SNC `CHE-142.367.808` prêts pour KYC Twilio Jour 1.
- Org GitHub `filanor-tech` à créer avant `git init` (ÉTAPE D).

### Prochaine étape recommandée
- **Batch C1.5** : créer ADR-014 "Structure docs canonique = MAJUSCULES, suppression série numérotée 00-11". Lire les 12 fichiers fantômes pour vérifier contenus uniques à merger. Supprimer la série.
- **Batch C3** : refonte `docs/ARCHITECTURE.md` (schéma ASCII + composants clés sans n8n), recalcul `docs/PRICING.md` totaux (cohérents avec COSTS.md phase 0/1), commenter cron dans migration 0001 avec TODO ADR-012.
- **ÉTAPE D** (après C3) : `git init` + remote GitHub org `filanor-tech`, `pnpm install`, Supabase CLI (scoop ou npm), vérif Node 20.

### Fichiers modifiés (batch C1+C2)
- `CLAUDE.md`
- `README.md`
- `.env.example`
- `.claude/commands/new-agent.md`
- `.claude/commands/end-session.md`
- `.claude/skills/retell-config/SKILL.md`
- `.claude/skills/twilio-number/SKILL.md`
- `docs/STACK.md`
- `docs/PRICING.md`
- `docs/DECISIONS.md`
- `docs/ANTI_PATTERNS.md`
- `docs/PROMPTS/TEST_SCENARIOS.md`
- `docs/legal/privacy-policy-template.md`
- `docs/legal/dpa-checklist.md`
- `docs/JOURNAL.md` (cette entrée)

### Décisions prises
- ADR-010, ADR-011, ADR-012, ADR-013 (ajoutées plus tôt dans la même journée, regroupées dans batch).

### Anti-patterns ajoutés
- "Inventer une URL `$schema` pour settings.json"
- "Bootstrap initial contenant une structure docs fantôme"

---

## 2026-04-25 · 17h00 · Filip + Claude (Opus 4.7) · Correction siège Chavornay + Batch C1.5 + report C3

### Ce qui a été fait

**Correction adresse siège social Filanor Tech SNC : Lausanne → Chavornay**
- Reformulation siège dans 8 fichiers / 12 lignes : `CLAUDE.md`, `README.md`, `docs/COMPLIANCE_LPD.md` (×2), `docs/SETUP_ACCOUNTS.md` (×3 dont remplissage du placeholder `[FILIP À CONFIRMER…]`), `docs/legal/privacy-policy-template.md`, `docs/legal/voice-clone-consent-fr.md`, `.claude/skills/twilio-number/SKILL.md` (×2)
- Adresse légale actée : `Rue de Crause 3, 1373 Chavornay (VD)` (domicile co-associé Daniel)
- Reformulation `docs/DECISIONS.md` ADR-008 ligne 154 : "setup physique à Lausanne" → "setup physique sur place chez le client (Lausanne et environs)"
- `docs/GLOSSARY.md` : nouvelle section "À propos de la géographie Filanor" + note inline près du slogan "Fait à Lausanne, hébergé en Europe" — distinction claire entre **3 géographies distinctes** : siège légal (Chavornay), fondateur & produit (Filip à Lausanne), zone commerciale cible (Suisse romande / bassin lémanique)
- `docs/ANTI_PATTERNS.md` : ajout entrée "Confondre les 3 géographies Filanor" (date détectée 2026-04-24)
- Slogans client-facing, scripts commerciaux, démarchage, codes téléphoniques +4121, adresses tenants démo : **inchangés** (zone commerciale = Lausanne reste vraie et utilisable)

**Batch C1.5 — suppression série fantôme docs/00-11**
- Suppression en bloc de 12 fichiers : `docs/00-context-business.md`, `docs/01-architecture.md`, `docs/02-database-schema.sql`, `docs/03-database-schema.md`, `docs/04-system-prompt-salon.md`, `docs/05-system-prompt-resto.md`, `docs/06-retell-functions.md`, `docs/07-n8n-workflows.md`, `docs/08-twilio-swiss-setup.md`, `docs/09-onboarding-tenant.md`, `docs/10-roadmap-4-weeks.md`, `docs/11-pricing-and-sales.md`
- ADR-014 créée et acceptée — structure docs canonique = MAJUSCULES, série numérotée bannie pour le futur
- Correction `src/README.md:1` : référence `docs/10-roadmap-4-weeks.md` → `docs/STACK.md` §"Plan 4 semaines"
- Aucune référence morte vers la série supprimée n'a échappé (grep pré-suppression validé)
- État final `docs/` : 10 fichiers MAJUSCULES (`ARCHITECTURE.md`, `ANTI_PATTERNS.md`, `COMPLIANCE_LPD.md`, `COSTS.md`, `DECISIONS.md`, `GLOSSARY.md`, `JOURNAL.md`, `PRICING.md`, `SETUP_ACCOUNTS.md`, `STACK.md`) + sous-dossiers `PROMPTS/` (4 fichiers) et `legal/` (3 fichiers)

**État administratif côté société (hors repo, signalé par Filip)**
- KYC Twilio soumis : Bundle "Filanor Voice — CH Local Business", review estimée 7 jours
- RDV PostFinance compte bancaire pro : mercredi prochain
- Compte Twilio créé avec crédit trial 15.50 USD — pas d'upgrade tant que CB pro pas dispo

### Décisions prises
- **ADR-014** · Structure docs canonique = MAJUSCULES, suppression série numérotée 00-11 · accepted · 2026-04-24

### C3 reporté — non bloquant pour MVP
Trois chantiers de dette technique reportés, à traiter **après premier prospect démarché ou si rencontre dette technique réelle** :
1. Refonte schéma ASCII `docs/ARCHITECTURE.md` — contient encore une mention `n8n` caduque (ADR-013)
2. Recalcul totaux `docs/PRICING.md` (lignes marquées `⚠️ recalcul C3`) cohérents avec `docs/COSTS.md`
3. Commenter le bloc `cron.schedule(...)` dans `supabase/migrations/0001_init_schema.sql` lignes 226-230 avec TODO "réactiver au passage Pro — cf ADR-012"

Volontairement non bloquant. Mode opératoire change : on accélère vers du concret (premier endpoint qui répond), on reviendra sur la dette doc quand elle gêne.

### Ce qui bloque / questions ouvertes
- Aucun blocage technique
- En attente passive : KYC Twilio (~7 jours), CB pro PostFinance (RDV mercredi), upgrade Twilio
- `docs/ARCHITECTURE.md` reste techniquement obsolète sur le schéma ASCII (mention n8n) — accepté en l'état

### Prochaine étape recommandée — Session "FIRST WORKING ENDPOINT"

**Objectif unique** : faire tourner un endpoint Next.js minimal qui répond à Retell. Première ligne de code de l'app. **Cible mesurable** : URL publique `https://filanor-voice-xxxx.vercel.app/api/retell/dynamic-variables` qui retourne du JSON valide.

**Préalable manuel (Filip avant la session, ~5 min)** : créer l'org GitHub `filanor-tech` via https://github.com/organizations/new (impossible à automatiser).

**Étapes ordonnées (≈70 min)** :

1. **`git init` + premier commit** (5 min) — `git init` racine, `git add .`, `git commit -m "chore: bootstrap initial"`. Pas encore de remote.
2. **Créer repo GitHub + push initial** (5 min) — `gh auth login` si pas authentifié, puis `gh repo create filanor-tech/filanor-voice --private --source=. --remote=origin --push`.
3. **Vérifier Node 20 + pnpm 9** (5 min) — `node -v` (≥ 20.0), `pnpm -v` (≥ 9.0). Si pnpm absent : `npm install -g pnpm@9`.
4. **`pnpm install` racine** (5 min) — installe workspaces selon `pnpm-workspace.yaml` existant.
5. **Créer `apps/web` Next.js 15** (10 min) — depuis la racine : `pnpm create next-app apps/web --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"`. Renommer `apps/web/package.json` "name" en `@filanor/web` pour le workspace.
6. **Vérifier hello world** (5 min) — `pnpm --filter @filanor/web dev`, ouvrir http://localhost:3000, voir page Next.js par défaut.
7. **Endpoint `/api/retell/dynamic-variables` hardcoded** (15 min) — créer `apps/web/src/app/api/retell/dynamic-variables/route.ts`. POST handler qui retourne JSON avec variables Sophie/Hair In The City démo (variables listées dans `docs/PROMPTS/SECTOR_SALON.md` + `docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md`). Pas de Supabase, pas de signature, hardcodé.
8. **Test local curl** (5 min) — `curl -X POST http://localhost:3000/api/retell/dynamic-variables -H "Content-Type: application/json" -d '{"to_number":"+41215191234"}'`. Vérifier JSON valide avec `dynamic_variables`.
9. **Deploy Vercel preview** (10 min) — `npm install -g vercel`, `cd apps/web && vercel link` (créer projet), `vercel` pour preview deploy. URL preview obtenue.
10. **Test endpoint preview public** (5 min) — `curl <URL>/api/retell/dynamic-variables`. Vérifier réponse identique au local.

**Ce qu'on NE FAIT PAS dans la session suivante** :
- Création comptes Supabase / Retell / Twilio (sessions ultérieures)
- Achat numéros Twilio (en attente KYC ~7 jours)
- Migration DB (post-création Supabase)
- Validation signature webhook Retell (session "Webhook hardening")
- Lookup tenant réel via Supabase (session "Wire DB")

### Fichiers modifiés
- `CLAUDE.md` (ligne 24)
- `README.md` (ligne 5)
- `src/README.md` (ligne 1)
- `docs/COMPLIANCE_LPD.md` (lignes 45 et 50)
- `docs/legal/privacy-policy-template.md` (ligne 16)
- `docs/legal/voice-clone-consent-fr.md` (ligne 16)
- `docs/SETUP_ACCOUNTS.md` (lignes 7, 19, 100, 109)
- `.claude/skills/twilio-number/SKILL.md` (lignes 20 et 144)
- `docs/DECISIONS.md` (ADR-008 ligne 154 reformulée + ADR-014 ajoutée)
- `docs/GLOSSARY.md` (note inline + section "À propos de la géographie Filanor")
- `docs/ANTI_PATTERNS.md` (entrée "Confondre les 3 géographies Filanor")
- `docs/JOURNAL.md` (cette entrée)

### Fichiers supprimés (12)
- `docs/00-context-business.md`
- `docs/01-architecture.md`
- `docs/02-database-schema.sql`
- `docs/03-database-schema.md`
- `docs/04-system-prompt-salon.md`
- `docs/05-system-prompt-resto.md`
- `docs/06-retell-functions.md`
- `docs/07-n8n-workflows.md`
- `docs/08-twilio-swiss-setup.md`
- `docs/09-onboarding-tenant.md`
- `docs/10-roadmap-4-weeks.md`
- `docs/11-pricing-and-sales.md`

### Anti-patterns ajoutés
- "Confondre les 3 géographies Filanor"

---
