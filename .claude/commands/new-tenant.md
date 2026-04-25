---
description: Provisionner un nouveau client (tenant) Filanor Voice de A à Z
---

# /new-tenant

Créer un nouveau tenant Filanor Voice, de la fiche client à l'agent opérationnel.

## Ce que cette commande fait

1. Demande à Filip les infos du client (nom, secteur, adresse, horaires, services, plan)
2. Valide que l'extrait RC / infos KYC du client sont dispo (pour la facturation, pas pour Twilio — Twilio est au nom de Filanor)
3. Crée la ligne `tenants` dans Supabase avec les valeurs fournies
4. Achète un numéro Twilio +41 adapté au canton du client (Lausanne → +4121, Genève → +4122, etc.)
5. Assigne le numéro dans `phone_numbers`, lie le `retell_agent_id` approprié (SALON ou RESTAURANT)
6. Configure le webhook Twilio inbound → Retell
7. Lance OAuth Google Calendar pour lier l'agenda du client (envoie lien par email au client)
8. Génère un SMS de bienvenue au client avec son numéro Filanor et les instructions de renvoi d'appel
9. MAJ `docs/JOURNAL.md` avec une entrée "tenant provisioned: <slug>"

## Prérequis

- `.env.local` complet avec clés Retell, Twilio, Supabase service_role
- DPA signés avec les 5 fournisseurs (voir `docs/COMPLIANCE_LPD.md`)
- Client a signé le contrat (pas géré par cette commande, confirmer manuellement)

## Workflow détaillé à suivre

1. Lance d'abord `scripts/provision-tenant.ts` en mode `--dry-run` pour afficher ce qui sera créé
2. Si Filip valide → relance sans `--dry-run`
3. Vérifie après chaque étape que le résultat est cohérent (numéro bien acheté, tenant bien créé, etc.)
4. En cas d'erreur partielle (ex: tenant créé mais numéro pas acheté), log clairement l'état
   incomplet dans le JOURNAL et demande à Filip comment procéder (retry ou rollback)

## Formulaire minimal pour Filip

Demande dans l'ordre :

- Slug (ex: `coiffure-lausanne-centre`) — kebab-case, unique
- Business name
- Sector (`salon` ou `restaurant`)
- Canton (VD, GE, NE, FR, VS, JU) pour le choix du numéro
- Adresse complète
- Email contact
- Téléphone contact (le "vrai" numéro du client)
- Horaires d'ouverture (texte libre)
- Services + prix (texte libre)
- Pour salon : liste des praticien·nes
- Pour resto : type cuisine, capacité, espaces
- Plan : starter / pro
- Voix agent (défaut : Charlotte pour salon, Antoine pour resto)

## Output attendu à la fin

```
✅ Tenant créé : <business_name> (slug: <slug>)
✅ Numéro Twilio : +41 21 519 XX XX (SID: PNxxx)
✅ Agent Retell assigné : <AGENT_SALON | AGENT_RESTAURANT>
✅ Webhook Twilio configuré
📧 Email OAuth Google envoyé à <email>
📱 SMS de bienvenue envoyé à <phone>

Prochaine étape : le client clique sur le lien OAuth pour lier son Google Calendar.
```

## Règles

- **Jamais** de création manuelle dans le dashboard Supabase en parallèle — tout passe par le script
- Si étape 7 (OAuth Google) échoue, le tenant reste en `status='paused'` jusqu'à résolution
- Loguer chaque action dans `docs/JOURNAL.md` à la fin
