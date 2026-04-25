# tests — Tests d'acceptation

## call-scenarios/

Scénarios d'appel en langage naturel, rejouables à la main via vrais appels téléphoniques.
Pas des tests unitaires JS — des **scripts d'acceptation** humains.

Liste complète dans `docs/PROMPTS/TEST_SCENARIOS.md`.

## Règle

Avant toute mise en prod d'un agent (nouveau prompt, nouvelle function, nouvelle voix) :
- Rejouer tous les scénarios `S-01` à `S-05` et `R-01` à `R-05` en vrai appel
- Rejouer tous les scénarios `T-*` (techniques)
- Consigner résultat dans `docs/JOURNAL.md` avec ✅ / ⚠️ / ❌

Aucun scénario ❌ ne peut passer en prod.

## Tests unitaires code (futur)

Pour le code TypeScript (`packages/*`, `apps/web/app/api/*`) — tests Vitest à ajouter :
- Validation signature webhook Retell
- `buildSystemPrompt` et `buildTenantVariables`
- Parsing des payloads Retell
- Endpoints API routes (happy path + cas d'erreur)

Pas au MVP semaine 1, à ajouter semaine 3-4 quand la base est stable.
