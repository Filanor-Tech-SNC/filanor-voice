# scripts — Scripts CLI TypeScript

Scripts utilitaires exécutés via `tsx` (TypeScript runner, pas besoin de build).

## Scripts prévus

### `provision-tenant.ts`
Provisionne un nouveau tenant de A à Z (cf. `.claude/commands/new-tenant.md`).

Usage :
```bash
pnpm tsx scripts/provision-tenant.ts --dry-run
pnpm tsx scripts/provision-tenant.ts
```

Interactif — demande les infos client via prompts CLI.

### `sync-retell-agent.ts`
Synchronise la config Supabase d'un tenant vers l'agent Retell (utile si modif horaires, services).

```bash
pnpm tsx scripts/sync-retell-agent.ts --tenant=hair-in-the-city
```

### `release-tenant.ts`
Résilie un tenant : libère le numéro Twilio, archive en Supabase, notifie.

```bash
pnpm tsx scripts/release-tenant.ts --tenant=<slug>
```

### `audit-compliance.ts`
Exécute la checklist `/check-compliance` automatiquement.

```bash
pnpm tsx scripts/audit-compliance.ts > docs/compliance/audit-$(date +%Y-%m-%d).md
```

### `seed-demo.ts`
Seed des données démo pour tests locaux (invoque `supabase/seed.sql`).

## Conventions

- Toujours TypeScript, jamais de bash script > 20 lignes
- Un script = un rôle précis, pas de swiss-army-knife
- Secrets via `.env.local` (charger avec `dotenv/config` en début de fichier)
- Log en prose lisible + exit code 0/1 clair
- Documenter chaque script dans son header `/** JSDoc */`
- Toujours `--dry-run` si le script fait des actions destructives ou payantes
