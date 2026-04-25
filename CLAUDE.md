# CLAUDE.md — Filanor Voice

> Source de vérité pour toute session Claude Code sur ce projet.
> **Lis ce fichier en entier avant la moindre action.** Il est versionné.
> Quand tu changes quelque chose ici, consigne-le dans `docs/JOURNAL.md`.

---

## 1. Ordre de lecture obligatoire en début de session

À chaque nouvelle session, lis dans cet ordre :

1. Ce fichier (`CLAUDE.md`)
2. `docs/JOURNAL.md` — ce qui a été fait aux sessions précédentes
3. `docs/DECISIONS.md` — les choix techniques figés (ne jamais les remettre en cause sans raison explicite)
4. `docs/ANTI_PATTERNS.md` — les erreurs à ne pas refaire
5. Le fichier pertinent pour la tâche du jour

Ne commence à éditer / créer / exécuter qu'après ces 5 lectures.

## 2. Qui parle et pourquoi

Tu travailles avec **Filip Kuleshov**, 20 ans, co-fondateur de **Filanor Tech SNC**
(Chavornay, Vaud, inscrite au Registre du Commerce). Co-fondateur **Daniel Shevchenko**
sur un autre projet en parallèle (fidélité Apple Wallet). Domaine pro :
`contact@filanor.ch`. Site vitrine live : `https://filanor.ch`
(Next.js 15 + Tailwind + GSAP, Vercel, DNS Infomaniak).

**Zéro client payant à date.** Hair In The City et FlexiRiders sont des projets démo
interne — ne jamais les présenter comme clients réels dans un deliverable client-facing.

## 3. Le projet

**Filanor Voice** — assistant téléphonique IA pour PME de Suisse romande.
Deux segments de lancement, un seul produit technique derrière :

1. Salons de coiffure — prise de RDV téléphonique, agent "Sophie"
2. Restaurants — réservation de table téléphonique, agent "Marc"

Pricing acté :
- **Starter 199 CHF/mois** — 120 min incluses — FR+EN+DE
- **Pro 349 CHF/mois** — 350 min incluses — FR+EN+DE + concurrent calls + rapport hebdo
- **Setup one-shot 590 CHF**
- **Overage 0.35 CHF/min**

Objectifs mesurables Filip :
- Semaine 1 : stack technique opérationnelle, 2 voix configurées (Sophie + Marc)
- Semaine 2 : moteur RDV générique fonctionnel en FR avec 1 agent de test
- Semaine 3 : démo publique "Sophie – Hair In The City" sur `filanor.ch/voix`
- Semaine 4 : démo publique "Marc – Trattoria Bellavita" + landing page complète
- Semaine 8 : 1 à 3 clients pilotes payants signés

## 4. Règles de travail avec Filip (non négociables)

- **Pose des questions quand tu doutes.** Il préfère être interrompu plutôt
  que de récupérer un deliverable à côté du besoin.
- **Dis-lui quand il se trompe.** Pas de flatterie, pas de "excellente question".
  Challenge-le. Cite les sources de tes recommandations (repo, article, doc).
- **Simple > clinquant.** MVP fonctionnel d'abord, features sexy ensuite.
- **Gros blocs plutôt que fragmenter.** Il préfère un seul message complet à 10 micro-réponses.
- **Français direct, pas corporate, pas d'emojis** (sauf s'il en met lui-même).
- **Pas de solution enterprise surdimensionnée** : pas de Kubernetes, pas de microservices,
  pas de Redis Cluster, pas de Kafka. On reste sur Vercel + Supabase.

## 5. Compétences de Filip (à supposer acquises)

- Next.js 15 / React 19 / TypeScript : avancé
- Tailwind, Framer Motion, GSAP : avancé
- Node.js, API REST, webhooks : correct
- Supabase / Postgres : intermédiaire
- Python : **débutant — éviter Python, JS/TS partout**
- DevOps Vercel : avancé
- Langue : français natif, anglais technique OK

## 6. Stack technique figée (voir `docs/STACK.md` pour détails)

| Composant | Choix | Pourquoi |
|-----------|-------|----------|
| Moteur voix | Retell AI | $0.07/min base, SOC 2, bon FR |
| Téléphonie | Twilio | KYC CH validable avec extrait RC Vaud |
| Voix TTS | ElevenLabs via Retell | Flash v2.5 pour latence, v3 pour prod |
| LLM | OpenAI GPT-4o mini | Rapport qualité/prix sur du booking simple |
| DB + Auth + Storage | Supabase (region Frankfurt EU) | Conforme nLPD, Postgres natif |
| Orchestration | Next.js API routes + Vercel Cron | Inclus dans apps/web (ADR-010, ADR-013) |
| Front admin | Next.js 15 + shadcn/ui | Maîtrisé, from scratch |
| Hébergement | Vercel | Déjà utilisé pour filanor.ch |
| Langage | TypeScript partout | Pas de Python |

## 7. Langage client-facing (voir `docs/GLOSSARY.md`)

**Interdit dans tout deliverable vu par un client :**
SaaS, Agent IA, dashboard, chatbot, workflow, solutions innovantes, partenaire digital.

**Utiliser à la place :**
assistant téléphonique, répondeur intelligent, prise de RDV automatique,
espace de gestion, conversations, automatisation, accompagnement.

## 8. Architecture multi-tenant (décision ADR-003)

**Un seul agent Retell "template"** pour chacun des 2 secteurs (salon, restaurant),
configuré avec des **dynamic variables** injectées au démarrage de chaque appel.
Les variables sont chargées depuis Supabase à partir du numéro Twilio appelé (`called_number`).

Voir `docs/ARCHITECTURE.md` pour le schéma complet et le flow webhook.

## 9. Conformité LPD (voir `docs/COMPLIANCE_LPD.md`)

- Tous les fournisseurs US (Retell, OpenAI, ElevenLabs, Twilio, Supabase US entities) :
  **DPA signé obligatoire** avant la moindre donnée client réelle.
- Hébergement Supabase en **region Frankfurt EU** (conforme nLPD art. 16).
- Registre des traitements à tenir (art. 12 nLPD).
- Information des appelants : message d'accueil mentionne l'usage d'une IA.
- Rétention transcripts : 30 jours par défaut, purge automatique.
- Consentement enregistrement : annoncé verbalement en début d'appel.

## 10. Workflow d'une session (obligatoire)

1. Lis les 5 fichiers listés en §1
2. Demande à Filip la tâche du jour si pas évidente
3. Si la tâche implique une décision non documentée → **ajoute une ADR dans `DECISIONS.md`**
  AVANT d'implémenter, et valide avec Filip
4. Implémente
5. Tests (voir `tests/call-scenarios/` pour les scénarios de référence)
6. À la fin de session : **MAJ obligatoire de `docs/JOURNAL.md`** avec
   - Date
   - Ce qui a été fait
   - Ce qui bloque / questions ouvertes
   - Prochaine étape recommandée
7. Si une nouvelle erreur récurrente est détectée → l'ajouter dans `ANTI_PATTERNS.md`
8. Si un nouveau pattern utile est développé → le transformer en skill dans `.claude/skills/`

## 11. Commandes slash disponibles

Voir `.claude/commands/`. Principales :
- `/new-tenant` — provisionner un nouveau client de A à Z
- `/new-agent` — créer ou mettre à jour un agent Retell
- `/check-compliance` — audit nLPD/DPA du state actuel
- `/end-session` — clôture session + MAJ JOURNAL

## 12. Skills disponibles

Voir `.claude/skills/`. Principales :
- `retell-config` — configurer un agent via l'API Retell
- `supabase-migration` — créer/appliquer une migration Supabase
- `api-routes` — écrire des API routes Next.js (webhooks, custom functions, crons) dans apps/web
- `twilio-number` — provisionner un numéro +41
- `prompt-template` — générer un system prompt depuis un tenant Supabase

## 13. Ce qu'on NE FAIT PAS

- Pas de Python (Filip débutant)
- Pas de Docker Compose compliqué en dev local (Supabase CLI suffit)
- Pas de microservices
- Pas de Redis, pas de Kafka, pas de RabbitMQ
- Pas de custom telephony stack (SIP direct, Asterisk, FreeSWITCH) — Twilio fait le job
- Pas de voice cloning sans consentement écrit explicite du propriétaire de la voix
- Pas d'invention d'info sur des logiciels suisses spécifiques (Axa-Hammer, Vitomed, etc.)
  — si tu ne sais pas, `web_search`, puis seulement cite

## 14. Contacts & credentials

Tous les secrets sont dans `.env.local` (non versionné). Template dans `.env.example`.
Ne JAMAIS committer un secret. Si tu en détectes un dans un commit passé, flag immédiatement
à Filip pour rotation.

## 15. État actuel

Voir `docs/JOURNAL.md` — dernière entrée = état courant.

---

**Dernière mise à jour : 2026-04-22 — bootstrap initial.**
