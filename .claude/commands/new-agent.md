---
description: Créer ou mettre à jour un agent Retell (template SALON ou RESTAURANT)
---

# /new-agent

Créer ou mettre à jour un des deux agents Retell template (SALON ou RESTAURANT).

## Ce que cette commande fait

1. Lit le system prompt dans `docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md` + le variant sectoriel
2. Compile le prompt final avec les placeholders `{{variables}}` laissés intacts (ce sont les dynamic vars Retell)
3. Crée ou met à jour l'agent via l'API Retell (`POST /create-agent` ou `PATCH /update-agent/{id}`)
4. Configure :
   - `retrieve_dynamic_variables_url` : https://app.filanor.ch/api/retell/dynamic-variables
   - `webhook_url` : https://app.filanor.ch/api/retell/events
   - Custom functions : `book_appointment`, `check_availability`, `end_call`, `cancel_appointment`, `modify_appointment`
   - `language: "multi"` (FR/EN/DE)
   - Voice : voice_id par défaut (Charlotte ou Antoine)
   - LLM : GPT-4o mini
5. Store `RETELL_AGENT_ID_SALON` ou `RETELL_AGENT_ID_RESTAURANT` dans `.env.local`
6. MAJ `docs/JOURNAL.md`

## Arguments

- `--sector=salon|restaurant` (obligatoire)
- `--update` (optionnel, pour mettre à jour un agent existant)

## Process

1. Vérifie la présence de `RETELL_API_KEY`
2. Demande confirmation à Filip si c'est un update (changements peuvent casser les appels en cours)
3. Exécute
4. Affiche le nouveau `agent_id` et un lien dashboard Retell pour vérif visuelle
5. Rappelle que la propagation prend 30s environ

## Règle

Ne jamais créer plus de 2 agents template (SALON + RESTAURANT). Si un nouveau secteur
arrive (ex: hôtel, cabinet dentaire), créer une nouvelle entrée dans `DECISIONS.md`
d'abord, ajouter le variant dans `docs/PROMPTS/`, puis seulement créer l'agent.
