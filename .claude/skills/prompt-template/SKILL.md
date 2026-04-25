---
name: prompt-template
description: Générer un system prompt complet à partir des templates markdown et d'un tenant Supabase. Utilise ce skill chaque fois qu'un nouveau tenant a besoin de ses dynamic variables, ou quand on valide un prompt en preview avant de l'envoyer à Retell. Ne jamais hardcoder un prompt dans le code de l'app — toujours le compiler depuis docs/PROMPTS/.
---

# SKILL — prompt-template

## Quand utiliser

- Pendant le provisioning d'un tenant (`/new-tenant`) pour preview le prompt final
- Quand on modifie les templates `docs/PROMPTS/*.md` pour vérifier le rendu
- Pour debugger le comportement d'un agent — repartir du prompt final généré
- Pour créer un nouveau variant sectoriel (ex: hôtel, cabinet dentaire)

## Architecture

Le prompt final injecté à Retell est **compilé** à partir de :

1. `docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md` — template universel avec `{{placeholders}}`
2. `docs/PROMPTS/SECTOR_<sector>.md` — contexte spécifique au secteur
3. Les valeurs du tenant Supabase — nom, horaires, services, etc.

Les `{{dynamic_variables}}` qui viennent du tenant restent **intactes** dans le prompt envoyé à Retell.
Retell les remplacera au runtime via l'endpoint `/api/retell/dynamic-variables`.

## Workflow

### 1. Lire les templates

```typescript
import { readFileSync } from 'fs';

const universal = readFileSync('docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md', 'utf8');
const sectorBlock = readFileSync(`docs/PROMPTS/SECTOR_${sector.toUpperCase()}.md`, 'utf8');
```

### 2. Extraire la section `sector_specific_context` du fichier sectoriel

Le fichier `SECTOR_SALON.md` contient une section markdown entre ``` avec le bloc à injecter. L'extraire avec une regex ou un parser markdown basique.

### 3. Remplacer les placeholders "statiques" (non tenant-specific)

```typescript
const compiled = universal
  .replace('{{sector_mission}}', sectorVariables.mission)
  .replace('{{booking_noun}}', sectorVariables.bookingNoun)
  .replace('{{sector_specific_context}}', sectorContext);
```

Les `{{tenant_name}}`, `{{services}}`, etc. **restent dans le prompt** (Retell les injecte).

### 4. Valider

- Longueur : le prompt final doit être < 8000 tokens (limite confortable pour GPT-4o mini context)
- Aucun `{{placeholder}}` statique n'a été oublié
- Les mentions obligatoires de conformité nLPD sont présentes (accueil "assistant automatique")

### 5. Envoyer à Retell

Via le skill `retell-config`, update l'agent avec le nouveau prompt compilé.

## Exemple d'output (extrait)

```
# IDENTITÉ

Tu es {{agent_persona}}, l'assistant téléphonique de {{tenant_name}}.
[...]

# CONTEXTE DU LIEU

Nom : {{tenant_name}}
Type : {{tenant_type}}
Adresse : {{tenant_address}}
Horaires d'ouverture :
{{opening_hours}}
[...]

# CONTEXTE SALON DE COIFFURE   ← injecté depuis SECTOR_SALON.md

Praticien·nes disponibles :
{{praticiens_list}}

Durées standards des prestations :
- Coupe femme : 45-60 min
[...]
```

## Variables Retell dynamic_variables finales

À l'heure du call, Retell appelle `/api/retell/dynamic-variables` avec le `to_number`,
et attend en retour :

```json
{
  "dynamic_variables": {
    "agent_persona": "Sophie",
    "agent_gender": "féminine",
    "tenant_name": "Hair In The City",
    "tenant_type": "salon de coiffure",
    "tenant_address": "Rue du Bourg 21, 1003 Lausanne",
    "language_default": "français",
    "opening_hours": "Mardi à vendredi 9h-19h, samedi 9h-17h. Fermé dimanche et lundi.",
    "services": "Coupe femme (45 CHF), coupe homme (30 CHF), balayage (120 CHF), couleur (80 CHF)",
    "praticiens_list": "Julie, Sarah, Amélie"
  }
}
```

## Pièges connus

- **Oublier le mapping** : si on ajoute un `{{nouveau_placeholder}}` dans le template, il faut le mapper dans `/api/retell/dynamic-variables` ET dans le schéma Supabase `tenants`. Sinon Retell met la string "{{nouveau_placeholder}}" littérale dans la conversation
- **Caractères spéciaux dans le contenu tenant** : accents OK, mais pas de `{{` ou `}}` dans le texte (sinon ça casse le parsing Retell)
- **Prompt trop long** : si le tenant a 50 services, on ne peut pas tout mettre. Limiter à 15-20 max, ou faire une RAG (hors scope MVP)
- **Langue du template vs langue du tenant** : les templates sont en français côté instructions. Le runtime comprend FR/EN/DE grâce à `language: "multi"` Retell. Ne pas traduire les templates
