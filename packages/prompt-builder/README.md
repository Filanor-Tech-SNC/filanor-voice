# @filanor/prompt-builder

Compile les templates markdown `docs/PROMPTS/` en prompts finaux prêts pour Retell.

## API cible

```typescript
import { buildSystemPrompt } from '@filanor/prompt-builder';

const prompt = buildSystemPrompt({
  sector: 'salon',  // ou 'restaurant'
});

// → string contenant le prompt compilé, avec les {{tenant_variables}} intactes

// Puis côté endpoint /api/retell/dynamic-variables, on fournit les valeurs
// de ces variables pour un tenant donné.
```

Pas de compilation des valeurs tenant ici — ça reste la job de Retell à l'exécution.

## Fonctions

```typescript
// Build le prompt pour un agent template (SALON ou RESTAURANT)
buildSystemPrompt(opts: { sector: 'salon' | 'restaurant' }): string

// Build les dynamic_variables pour un tenant spécifique
buildTenantVariables(tenant: Tenant): Record<string, string>

// Valide qu'un prompt ne contient pas de placeholder orphelin
validatePrompt(prompt: string, expectedVars: string[]): { ok: boolean; missing: string[] }
```

## Pourquoi un package séparé

- Réutilisable depuis `apps/web` (endpoint dynamic-variables), `scripts/provision-tenant.ts`, tests
- Logique isolée testable unitairement
- Si on migre vers un autre moteur (Vapi, self-hosted), seule cette couche change

## Détails implémentation

Les templates sont lus **au build time** et embarqués en string dans le bundle
(via `import.meta.glob` ou lecture directe). Pas de fs.readFile à l'exécution
pour rester compatible edge functions Vercel si nécessaire.

Voir `.claude/skills/prompt-template/SKILL.md` pour le workflow.
