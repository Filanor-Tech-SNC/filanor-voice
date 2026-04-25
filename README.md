# Filanor Voice

Assistant téléphonique IA pour PME de Suisse romande — salons de coiffure et restaurants.

Produit de **Filanor Tech SNC**, Chavornay (VD).

---

## Démarrage

```bash
pnpm install
cp .env.example .env.local  # remplir les clés
pnpm dev
```

## Organisation du repo

```
filanor-voice/
├── CLAUDE.md              ← instructions Claude Code (à lire avant tout)
├── docs/                  ← décisions, archi, prompts, LPD, journal
├── apps/web/              ← dashboard admin Next.js 15
├── packages/              ← libs partagées TypeScript
├── supabase/migrations/   ← schéma DB multi-tenant
├── scripts/               ← scripts CLI (provision-tenant, etc.)
└── tests/call-scenarios/  ← scénarios d'appel de référence
```

## Contribuer avec Claude Code

1. `cd C:\Users\Liper\Desktop\filanor-voice`
2. `claude`
3. Claude Code lit `CLAUDE.md` → `docs/JOURNAL.md` → `docs/DECISIONS.md` → travaille.

## Stack

Retell AI · Twilio · ElevenLabs · OpenAI GPT-4o mini · Supabase (Frankfurt) · Next.js 15 · Vercel.

Détails : `docs/STACK.md`.

## Conformité

nLPD Suisse 2023 — voir `docs/COMPLIANCE_LPD.md`.
