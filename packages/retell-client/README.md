# @filanor/retell-client

Wrapper TypeScript typé autour de l'API Retell AI.

## Statut

À implémenter par Claude Code, session 1 ou 2.

## Objectif

Toutes les interactions avec Retell passent par ce package. Benefits :
- Types stricts en TypeScript
- Retry/backoff exponentiel centralisé
- Validation de la signature webhook
- Logging uniforme
- Mock facile pour les tests

## API cible

```typescript
import { RetellClient } from '@filanor/retell-client';

const retell = new RetellClient({ apiKey: env.RETELL_API_KEY });

// Agents
await retell.agents.create({ ... });
await retell.agents.update(agentId, { ... });
await retell.agents.retrieve(agentId);
await retell.agents.list();

// LLMs
await retell.llms.update(llmId, { general_prompt, general_tools });

// Calls
await retell.calls.create({ agent_id, from_number, to_number });
await retell.calls.retrieve(callId);
await retell.calls.list({ limit, after });

// Phone numbers
await retell.phoneNumbers.list();

// Webhook validation
retell.webhooks.verifySignature(payload, signature, secret);
```

## Structure

```
packages/retell-client/
├── src/
│   ├── index.ts              # exports publics
│   ├── client.ts             # classe RetellClient
│   ├── agents.ts
│   ├── llms.ts
│   ├── calls.ts
│   ├── webhooks.ts
│   ├── types.ts              # types partagés
│   └── errors.ts
├── package.json
└── tsconfig.json
```

## SDK officiel Retell

Retell a un SDK Node officiel : `retell-sdk`. On peut soit :
- **Option A** : wrap ce SDK (avantage : maintenu par Retell, inconvénient : moins de contrôle)
- **Option B** : fetch direct API (avantage : contrôle total, inconvénient : maintenance manuelle)

**Reco** : commencer Option A (SDK officiel + wrapper minimal pour les custom fonctions qu'on fait souvent). Si limitations, basculer Option B plus tard.

```bash
pnpm add retell-sdk
```

## Tests

À couvrir prioritairement :
- Validation de signature webhook (sécurité)
- Retry sur 429 / 5xx
- Parsing des webhook payloads
