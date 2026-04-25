---
name: supabase-migration
description: Créer et appliquer une migration Supabase versionnée. Utilise ce skill dès qu'une modification du schéma DB est nécessaire (nouvelle table, nouvelle colonne, nouvel index, nouvelle policy RLS). Ne jamais modifier le schéma directement dans le dashboard Supabase en prod — toujours passer par une migration versionnée dans supabase/migrations/.
---

# SKILL — supabase-migration

## Quand utiliser

- Ajouter une nouvelle table
- Ajouter/modifier une colonne
- Ajouter un index
- Changer une policy RLS
- Créer un cron job Supabase
- Ajouter une fonction Postgres

## Workflow

### 1. Nommage
Format obligatoire : `NNNN_description.sql` où NNNN est le numéro suivant.

Exemple : si la dernière migration est `0003_add_leads_table.sql`, la suivante sera
`0004_add_sms_reminder_column.sql`.

### 2. Template migration

```sql
-- =====================================================================
-- Migration NNNN — <description courte>
-- =====================================================================
-- Date : YYYY-MM-DD
-- Auteur : Claude Code (+ Filip)
-- ADR de référence : ADR-XXX (si applicable)
-- =====================================================================

-- UP (modifications)
<statements>

-- Aucune DOWN section : Supabase migrations sont forward-only.
-- Si rollback nécessaire, créer une nouvelle migration qui annule.
```

### 3. Appliquer en local AVANT prod

```bash
# Local
pnpm supabase:start
pnpm supabase:migrate

# Tester manuellement que rien n'est cassé
# Regénérer les types
pnpm supabase:types

# Commit
git add supabase/migrations/ packages/supabase-types/
git commit -m "feat(db): <description>"
```

### 4. Appliquer en prod

Vérifier d'abord que :
- [ ] La migration a été testée en local
- [ ] Les types TypeScript compilent
- [ ] Aucun breaking change sur les API routes live

Puis :
```bash
supabase link --project-ref <prod-ref>  # une seule fois
supabase db push
```

### 5. Documenter

Dans `docs/JOURNAL.md` :
- Nom de la migration
- Ce qu'elle change
- Si c'est lié à une ADR

## Pièges connus

- **RLS désactivée par défaut sur nouvelle table** → toujours `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` ET créer la policy `service_role_all_<table>`
- **`DROP TABLE` ou `DROP COLUMN`** : jamais sans plan de migration des données. Préférer marquer obsolete, puis drop dans une migration future
- **Indexes sur grosse table** : créer en `CREATE INDEX CONCURRENTLY` pour éviter de locker la table en prod
- **pg_cron** : les jobs créés restent même si on supprime la migration. Pour supprimer : `SELECT cron.unschedule('job_name');`
- **UUID vs text** : toujours `uuid` pour les IDs primaires, jamais du text random

## Référence schéma actuel

Voir dernier fichier dans `supabase/migrations/`. Structure principale :
- `tenants` — les clients Filanor (salon, restaurant)
- `phone_numbers` — mapping Twilio ↔ tenant
- `call_logs` + `call_transcripts` — logs d'appels (transcripts purgés 30j)
- `bookings` — RDV créés par les agents
- `usage_counters` — minutes consommées par tenant par mois
- `leads` — prospects / demandes non converties

Détails : `docs/ARCHITECTURE.md` + `supabase/migrations/0001_init_schema.sql`.
