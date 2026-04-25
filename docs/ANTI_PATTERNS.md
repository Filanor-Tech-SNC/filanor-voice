# ANTI-PATTERNS

Erreurs à ne pas refaire. Chaque fois que Claude Code (ou Filip) se plante ou
perd du temps sur un piège, ajouter une entrée ici.

Format :

```
## Titre court du piège

**Symptôme** : ce qu'on observe
**Cause** : pourquoi ça arrive
**Correctif** : comment éviter
**Date détectée** : YYYY-MM-DD
```

---

## Seed initial — pièges connus à l'avance (recherche Phase 1)

### Confondre prix facial Retell et coût réel

**Symptôme** : modèle économique calibré sur $0.07/min, marge qui fond en prod.
**Cause** : Retell $0.07/min ne couvre PAS le LLM ni la voix premium ElevenLabs ni les minutes Twilio. Le coût réel tourne entre $0.13 et $0.31/min selon config.
**Correctif** : toujours calculer la marge sur 0.15 CHF/min minimum de coût variable. Vérifier dans le dashboard Retell après 1 semaine de prod réelle.
**Date détectée** : 2026-04-22

### Twilio numéros restreints sur Retell

**Symptôme** : certains numéros Twilio ne se connectent pas automatiquement à Retell.
**Cause** : restrictions récentes Twilio/Retell documentées dans le changelog Retell.
**Correctif** : passer par le "manual fallback" documenté dans Retell, ou utiliser Telnyx en secours. Tester avec un numéro de démo AVANT de promettre à un client.
**Date détectée** : 2026-04-22

### Plan ElevenLabs Creator $22 ≠ conversational AI temps réel

**Symptôme** : Filip pense qu'ElevenLabs Creator $22/mois couvre tout.
**Cause** : le plan Creator = 100k credits TTS (~100 min de génération). La conversational AI temps réel via Retell est facturée à la minute, séparément, en pay-per-use.
**Correctif** : la voix est gérée PAR Retell (on paye Retell, qui paye ElevenLabs). Pas besoin de plan ElevenLabs direct sauf pour générer des audio démos offline.
**Date détectée** : 2026-04-22

### Latence promise 600ms vs réalité 800ms

**Symptôme** : client dit "c'est lent, j'entends un blanc avant la réponse".
**Cause** : Retell communique 600ms mais les reviews concordent sur ~800ms réels. Sur une ligne suisse avec accent régional, ça peut monter.
**Correctif** : mesurer la latence réelle AVEC le set-up complet avant toute démo publique. Si >1s, activer la voix ElevenLabs Flash v2.5 (75ms TTS) au lieu de v3. Ne jamais écrire "instantané" dans le marketing.
**Date détectée** : 2026-04-22

### Oublier le DPA avant de passer en prod

**Symptôme** : un client réel envoie ses données réelles, aucun DPA signé avec Retell/OpenAI/ElevenLabs/Twilio/Supabase.
**Cause** : négligence, ça semble "juste administratif".
**Correctif** : AUCUN client payant n'est onboardé avant que les 5 DPA soient signés et classés dans `docs/compliance/dpa/`. Voir `docs/COMPLIANCE_LPD.md`.
**Date détectée** : 2026-04-22

### Présenter Hair In The City / FlexiRiders comme clients réels

**Symptôme** : un slide ou page web présente ces noms comme "nos clients" alors que ce sont des démos internes.
**Cause** : reflexe marketing.
**Correctif** : toujours étiqueter ces démos "démonstration Filanor" ou "exemple". **Mensonge commercial = risque juridique.**
**Date détectée** : 2026-04-22

### Inventer une URL `$schema` pour settings.json

**Symptôme** : Claude Code au démarrage affiche `Settings Error, Invalid value`.
**Cause** : URL de schema inventée au lieu de l'URL officielle json.schemastore.org.
**Correctif** : toujours utiliser `"https://json.schemastore.org/claude-code-settings.json"` ou omettre complètement la clé `$schema`.
**Date détectée** : 2026-04-22

### Bootstrap initial contenant une structure docs fantôme

**Symptôme** : double arborescence `docs/` détectée en session 2 (série numérotée `00-11` en parallèle de la structure MAJUSCULES canonique référencée dans CLAUDE.md §1). Contenus redondants et potentiellement divergents (architecture, roadmap, pricing, prompts).
**Cause** : erreur de génération au bootstrap initial (Claude chat web), non détectée en relecture.
**Correctif** : CLAUDE.md §1 reste **la seule source de vérité** sur la structure canonique. Nettoyage de la série `00-11` via batch C1.5 (ADR-014 à créer). Ne PAS utiliser ces fichiers comme référence en attendant.
**Date détectée** : 2026-04-22

### Confondre les 3 géographies Filanor

**Symptôme** : document client-facing ou juridique qui mélange siège légal, domicile fondateur, et zone commerciale.
**Cause** : les 3 sont à Vaud mais à des endroits différents. Chavornay = siège RC (chez Daniel). Lausanne = Filip + démarchage + "Fait à Lausanne" (vrai pour le produit). Suisse romande = marché cible.
**Correctif** : voir `docs/GLOSSARY.md` §À propos de la géographie Filanor. Toujours se demander "qui parle et de quoi" avant de choisir la formulation.
**Date détectée** : 2026-04-24
