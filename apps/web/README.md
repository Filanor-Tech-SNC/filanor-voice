# apps/web — Dashboard admin Filanor

Dashboard interne Next.js 16 où Filip/Daniel voient :
- Liste des tenants (salons et restaurants clients)
- Logs d'appels par tenant
- Bookings créés
- Consommation minutes vs quota
- Leads (groupes, demandes non converties)

## À générer (Claude Code, session 2+)

```bash
cd apps
pnpm create next-app@latest web --ts --tailwind --app --import-alias "@/*"
cd web
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D @supabase/cli
# shadcn/ui init
pnpm dlx shadcn@latest init
```

## Structure cible

```
apps/web/
├── app/
│   ├── (dashboard)/              # Routes protégées Filip/Daniel
│   │   ├── tenants/
│   │   ├── calls/
│   │   ├── bookings/
│   │   └── layout.tsx
│   ├── (public)/                 # Landing publique
│   │   ├── voix/
│   │   │   ├── page.tsx          # filanor.ch/voix
│   │   │   ├── salon/page.tsx
│   │   │   └── restaurant/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── retell/
│   │   │   ├── dynamic-variables/route.ts
│   │   │   ├── book/route.ts
│   │   │   ├── availability/route.ts
│   │   │   ├── cancel/route.ts
│   │   │   ├── modify/route.ts
│   │   │   └── events/route.ts
│   │   ├── twilio/
│   │   │   └── voice/route.ts
│   │   └── oauth/
│   │       └── google/
│   │           ├── start/route.ts
│   │           └── callback/route.ts
│   └── layout.tsx
├── components/ui/                # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── retell/
│   │   └── client.ts             # wrapper autour de packages/retell-client
│   └── twilio/
│       └── client.ts
└── middleware.ts                 # auth gate
```

## Principes

- **Multi-tenant par service_role Supabase** : pas d'auth client final au MVP, seul Filip/Daniel se connectent
- **API routes stateless** : tout le state est en Supabase
- **Validation Retell signature** : chaque endpoint webhook vérifie `X-Retell-Signature` avant de traiter
- **Pas de SSR payant** : tout en App Router, Server Components par défaut
