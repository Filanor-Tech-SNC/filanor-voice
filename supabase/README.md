# Supabase — Filanor Voice

Schéma de la base de données multi-tenant.

## Structure

- `migrations/0001_init_schema.sql` : schéma initial complet (tenants, bookings, call_logs, etc.)
- `seed.sql` : données de démo pour dev local uniquement

## Démarrer en local

```bash
# Installer Supabase CLI si pas déjà
npm install -g supabase

# Démarrer Supabase local
pnpm supabase:start

# Appliquer migrations
pnpm supabase:migrate

# Seed (dev only)
supabase db reset
```

## Déployer en prod (Frankfurt)

1. Créer le projet sur https://supabase.com — **region eu-central-1 (Frankfurt)** obligatoire (ADR-006)
2. Récupérer `SUPABASE_URL`, `anon_key`, `service_role_key` → mettre dans Vercel env vars
3. Lier le projet local :
   ```bash
   supabase link --project-ref <ref>
   ```
4. Push les migrations :
   ```bash
   supabase db push
   ```

## Règle d'or

**Jamais de modif directe via le dashboard Supabase en prod.** Toute modif du schéma
passe par une migration versionnée dans `migrations/`. Sinon Claude Code se perd.

## Générer les types TypeScript

```bash
pnpm supabase:types
```

Sortie : `packages/supabase-types/index.ts`
