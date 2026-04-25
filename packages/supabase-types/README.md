# @filanor/supabase-types

Types TypeScript générés à partir du schéma Supabase.

## Génération

```bash
pnpm supabase:types
```

Équivalent :
```bash
supabase gen types typescript --local > packages/supabase-types/index.ts
```

## Usage

```typescript
import type { Database } from '@filanor/supabase-types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type NewTenant = Database['public']['Tables']['tenants']['Insert'];
type UpdateTenant = Database['public']['Tables']['tenants']['Update'];
```

## Règle

**Régénérer les types après chaque migration Supabase.** Ne jamais éditer `index.ts` à la main — il est écrasé à chaque génération.

Commit du fichier généré avec la migration correspondante dans le même PR.
