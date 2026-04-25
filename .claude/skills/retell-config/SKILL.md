---
name: retell-config
description: Configurer ou modifier un agent Retell via l'API. Utilise ce skill chaque fois qu'une modification d'agent Retell est nécessaire — création initiale, update system prompt, ajout de function, changement de voix, configuration webhook. Ne jamais modifier un agent directement dans le dashboard Retell en prod, toujours passer par ce skill pour que les changements soient versionnés.
---

# SKILL — retell-config

## Quand utiliser ce skill

- Création d'un agent Retell (cf. `/new-agent`)
- Modification du system prompt d'un agent template
- Ajout/retrait d'une custom function
- Changement de la voix ElevenLabs
- Configuration du webhook_url ou retrieve_dynamic_variables_url
- Debug d'un comportement inattendu de l'agent

## Workflow

### 1. Lire le state actuel
```typescript
const agent = await retellClient.agents.retrieve(agentId);
console.log(JSON.stringify(agent, null, 2));
```
Sauvegarder ce state avant toute modif (copier-coller dans `/tmp/agent-backup-$(date).json`).

### 2. Recompiler le prompt si besoin

Le prompt vient de :
- `docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md` (template)
- `docs/PROMPTS/SECTOR_SALON.md` ou `SECTOR_RESTAURANT.md` (variant)

Compile avec `packages/prompt-builder/buildAgentPrompt(sector)`. Les `{{vars}}` restent intactes.

### 3. Structure API Retell (v2)

Endpoint: `PATCH https://api.retellai.com/update-agent/{agent_id}`

```typescript
{
  agent_name: "AGENT_SALON",
  voice_id: "charlotte_fr_elevenlabs",
  voice_model: "eleven_multilingual_v2",
  voice_speed: 1.0,
  voice_temperature: 1.0,
  language: "multi",  // FR+EN+DE détection auto
  response_engine: {
    type: "retell-llm",
    llm_id: "<llm_id>"
  },
  webhook_url: "https://app.filanor.ch/api/retell/events",
  retrieve_dynamic_variables_url: "https://app.filanor.ch/api/retell/dynamic-variables",
  enable_backchannel: true,
  interruption_sensitivity: 0.8,
  ambient_sound: null,
  responsiveness: 0.9,
  end_call_after_silence_ms: 30000,
  max_call_duration_ms: 1800000  // 30 min max
}
```

### 4. Pour le LLM sous-jacent (Retell LLM wrapper)

Endpoint: `PATCH https://api.retellai.com/update-retell-llm/{llm_id}`

```typescript
{
  model: "gpt-4o-mini",
  general_prompt: "<compiled_prompt>",
  general_tools: [
    { type: "end_call", name: "end_call" },
    { type: "custom", name: "book_appointment", url: "https://app.filanor.ch/api/retell/book", /* schema */ },
    { type: "custom", name: "check_availability", url: "https://app.filanor.ch/api/retell/availability", /* schema */ },
    { type: "custom", name: "cancel_appointment", url: "https://app.filanor.ch/api/retell/cancel", /* schema */ },
    { type: "custom", name: "modify_appointment", url: "https://app.filanor.ch/api/retell/modify", /* schema */ }
  ]
}
```

### 5. Tester avant de release

1. Utilise l'endpoint `POST /create-web-call` pour tester en chat vocal web (pas de Twilio)
2. Si OK → appel téléphonique réel sur un numéro de test
3. Jouer au moins 3 scénarios de `docs/PROMPTS/TEST_SCENARIOS.md`
4. Si tout OK → l'agent est bon pour la prod

### 6. Document la modif

Dans `docs/JOURNAL.md`, consigner :
- Agent modifié
- Qu'est-ce qui a changé
- Diff du prompt (ou lien vers commit)

## Pièges connus

- **Retell v1 API dépréciée** : toujours utiliser v2 endpoints
- **voice_id ElevenLabs** : doit être l'ID interne Retell, pas l'ID ElevenLabs direct (vérifier la liste via `GET /list-voices`)
- **language: "multi"** nécessite un voice_model compatible (eleven_multilingual_v2 ou v3)
- **Webhook secret** : toujours valider `X-Retell-Signature` côté endpoint receveur
- **Custom functions timeout** : Retell timeout 10s par call function. Nos endpoints doivent répondre < 3s pour garder la conversation fluide.

## API Reference

Doc officielle : https://docs.retellai.com
