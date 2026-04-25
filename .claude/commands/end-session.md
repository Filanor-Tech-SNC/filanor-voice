---
description: Clôture de session — MAJ obligatoire du JOURNAL et des anti-patterns
---

# /end-session

À exécuter à la fin de chaque session de travail avec Claude Code.

## Ce que cette commande fait

1. Résume ce qui a été fait dans la session
2. Liste les fichiers modifiés (via `git diff --name-only`)
3. Ajoute une entrée au `docs/JOURNAL.md` avec le template standard
4. Si une nouvelle décision technique a été prise cette session → demande à Filip
   si on doit l'ajouter en ADR dans `DECISIONS.md`
5. Si un nouveau piège a été rencontré → l'ajouter à `ANTI_PATTERNS.md`
6. Si un pattern utile a été développé plusieurs fois → proposer de le transformer
   en skill dans `.claude/skills/`
7. Si la session a modifié le schéma DB → vérifier qu'une migration a bien été créée
8. Affiche la "prochaine étape recommandée" pour la session suivante

## Template d'entrée JOURNAL à générer

```markdown
## YYYY-MM-DD · HHhMM · Claude Code · <Titre court session>

### Ce qui a été fait
- Bullet 1
- Bullet 2

### Ce qui bloque / questions ouvertes
- Question 1 pour Filip
- Blocage technique X

### Prochaine étape recommandée
- Étape concrète et actionnable

### Fichiers modifiés
- chemin/fichier1
- chemin/fichier2

### Décisions prises
- Référence ADR si applicable

### Anti-patterns ajoutés
- Référence titre si applicable
```

## Règle

**Ne jamais terminer une session sans exécuter `/end-session`.** Sinon la session
suivante perd le contexte et Claude Code tourne en rond.

Si la session est très courte (juste une question, pas de modif) — le JOURNAL peut
être skippé, mais alors rien ne doit avoir été modifié côté fichiers.

**Chiffres / infos temporairement incohérents.** Si un batch partiel laisse un chiffre ou une info temporairement incohérente (ex. total caduc en attendant un recalcul), marquer la valeur inline avec ⚠️ + référence au batch qui la finalisera (ex. `⚠️ recalcul C3`). **Ne JAMAIS laisser un chiffre caduc sans marqueur** — un lecteur futur pourrait le citer comme vérité.
