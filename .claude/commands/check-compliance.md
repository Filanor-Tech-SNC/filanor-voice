---
description: Audit conformité nLPD et état des DPA
---

# /check-compliance

Vérifie que l'état actuel du projet est conforme nLPD avant d'accueillir ou de
continuer à servir des clients réels.

## Checklist à exécuter

### 1. DPA (contrats de sous-traitance)
Pour chaque fournisseur, vérifier qu'un DPA signé est présent dans `docs/compliance/dpa/` :
- [ ] Retell AI
- [ ] OpenAI
- [ ] ElevenLabs
- [ ] Twilio
- [ ] Supabase

Si manquant → bloquer tout onboarding client et alerter Filip.

### 2. Registre des traitements
- [ ] `docs/compliance/registre-traitements.md` existe et est à jour
- [ ] Liste chaque type de donnée traitée, base légale, durée rétention, ST impliqué

### 3. Textes légaux publiés
- [ ] `filanor.ch/confidentialite` accessible, date de dernière MAJ < 12 mois
- [ ] `filanor.ch/mentions-legales` accessible, RC + UID mentionnés

### 4. Configuration technique
- [ ] Supabase projet est bien en region `eu-central-1` (Frankfurt)
- [ ] `pg_cron` job de purge transcripts 30j est actif (`SELECT * FROM cron.job`)
- [ ] Prompts agents contiennent la mention "assistant téléphonique automatique" en accueil
- [ ] `.env.local` ne contient pas de clé d'ancien employé

### 5. Prompts agents
- [ ] Aucun prompt n'invite à collecter des données sensibles non nécessaires
- [ ] Message d'accueil en FR/EN/DE mentionne l'usage d'un assistant automatique

### 6. Accès
- [ ] Seuls Filip et Daniel ont accès au Supabase service_role
- [ ] Rotation des secrets < 90 jours

## Output attendu

Rapport structuré avec ✅ / ⚠️ / ❌ pour chaque item, et les actions à entreprendre.

Exemple :
```
# Audit conformité nLPD — 2026-04-29

✅ DPA Retell AI (signé le 2026-04-23)
✅ DPA OpenAI (signé le 2026-04-24)
❌ DPA ElevenLabs — MANQUANT, bloque l'onboarding du client X
✅ Registre à jour
⚠️ Politique de confidentialité — dernière MAJ 2026-01-01, refresh à prévoir
✅ Supabase region Frankfurt
✅ Cron purge 30j actif
✅ Accueils prompts conformes

ACTIONS REQUISES :
1. Obtenir DPA ElevenLabs (contact legal@elevenlabs.io)
2. Mettre à jour politique de confidentialité filanor.ch/confidentialite

🚫 Onboarding de nouveaux clients BLOQUÉ tant que DPA ElevenLabs manquant.
```

Log le rapport complet dans `docs/compliance/audit-YYYY-MM-DD.md`.
