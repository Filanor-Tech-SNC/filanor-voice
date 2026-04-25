# DPA Checklist (Data Processing Agreements)

À signer **avant le 1er client payant**. Tous ces sous-traitants traitent des données personnelles
de tes clients finaux pour ton compte. La nLPD Suisse 2023 (art. 9) impose un contrat écrit avec
chacun.

## Sous-traitants à contractualiser

### 1. Retell AI (US)

- **Type de données traitées** : audio voix, transcripts, métadonnées d'appel
- **Localisation** : États-Unis
- **Mécanisme de transfert** : SCC (Standard Contractual Clauses) UE + addendum suisse
- **Lien DPA** : https://www.retellai.com/legal/dpa (à vérifier)
- **Action** : signer le DPA, configurer `data_storage_setting = no_transcript_storage` au niveau agent

### 2. Twilio (US, infrastructure EU possible)

- **Type de données traitées** : numéros de téléphone, métadonnées d'appel, contenu SMS
- **Localisation** : États-Unis (entité contractante), infrastructure EU activable
- **Mécanisme de transfert** : SCC + Privacy Shield successor
- **Lien DPA** : https://www.twilio.com/en-us/legal/data-protection-addendum
- **Action** : accepter le DPA dans Console Twilio + activer EU residency dans les settings du compte

### 3. OpenAI (US)

- **Type de données traitées** : transcripts (pour générer les réponses LLM)
- **Localisation** : États-Unis
- **Mécanisme de transfert** : SCC
- **Lien DPA** : https://openai.com/policies/data-processing-addendum
- **Action** : signer le DPA via le formulaire ; demander l'activation **zero data retention** sur ton
  organisation OpenAI (formulaire dédié sur https://help.openai.com)

### 4. Supabase (US-headquartered, project Frankfurt)

- **Type de données traitées** : toutes les données métier (tenants, calls, appointments, contacts, transcripts)
- **Localisation** : Frankfurt (eu-central-1) pour le project, mais entité contractante US
- **Mécanisme de transfert** : SCC + project EU = pas de transfert effectif des données hors EU
- **Lien DPA** : https://supabase.com/legal/dpa
- **Action** : signer DPA dans le dashboard Supabase (section Organization Settings)

### 5. ElevenLabs (US, optionnel)

- **Type de données traitées** : audio voix (uniquement si client achète l'option voix clonée)
- **Localisation** : États-Unis
- **Mécanisme de transfert** : SCC
- **Lien DPA** : https://elevenlabs.io/dpa (à vérifier)
- **Action** : ne pas signer tant que pas activé. Quand un 1er client achète l'upsell voix : signer.

### 6. Google (Calendar, OAuth)

- **Type de données traitées** : événements de calendrier, identifiants OAuth
- **Localisation** : Google Cloud, Google traite les données via leurs propres conditions
- **Mécanisme de transfert** : SCC dans les Workspace terms
- **Lien DPA** : https://workspace.google.com/terms/dpa_terms.html (Workspace) ou Google Cloud Data Processing Addendum si on passe en GCP
- **Note** : si le client final connecte SON compte Google personnel, le DPA est entre lui et Google, pas
  entre nous et Google. On reste collecteur via OAuth.

### 7. Vercel (US)

- **Type de données traitées** : logs applicatifs, headers HTTP (potentiellement IP)
- **Localisation** : possibilité de configurer Vercel Edge en EU
- **Mécanisme de transfert** : SCC
- **Lien DPA** : https://vercel.com/legal/dpa
- **Action** : signer DPA via dashboard Vercel team settings

---

## Ton propre DPA Filanor ↔ client final

Ton client (le coiffeur, le restaurateur) est aussi en position de **responsable du traitement** vis-à-vis
de ses propres clients finaux (les appelants). Toi, Filanor, es **sous-traitant** pour lui.

Donc tu dois lui faire signer un **DPA Filanor → Client** (que tu fournis avec le contrat de prestation).
Ce DPA doit lister :
- Les finalités du traitement (gestion des appels et RDV)
- Les catégories de données (nom, téléphone, contenu d'appel, RDV)
- Les sous-traitants ultérieurs (la liste ci-dessus, avec leurs garanties)
- La durée de conservation (90 jours par défaut pour transcripts, indéfini pour métadonnées d'appel et RDV jusqu'à demande de suppression)
- La région d'hébergement (EU pour les données métier, US pour les sous-traitants techniques avec SCC)
- Les droits du client final (accès, rectification, suppression)
- Procédure en cas de violation de données (notification sous 72h)

Template à rédiger (fait par un avocat sera plus propre que ce que tu peux faire seul, budget ~300-600 CHF
pour l'avoir une fois et le réutiliser à vie).

---

## Registre des activités de traitement (RAT)

Obligatoire en pratique (art. 12 nLPD) bien que les TPE soient exemptées si traitement faible risque.
Le mieux : tenir un RAT dans un Notion ou Google Sheet, avec une ligne par activité :

| Activité | Finalité | Catégories de données | Catégories de personnes | Destinataires (sous-traitants) | Lieu de stockage | Durée | Mesures de sécurité |
|---|---|---|---|---|---|---|---|
| Réception d'appel téléphonique | Gestion appel + RDV | Audio voix, transcript, numéro tel, nom | Clients finaux du commerce client | Retell, Twilio, OpenAI | Frankfurt (DB) + traitement temporaire US | 90j transcripts, indéfini RDV | TLS, RLS Supabase, DPA signés |
| Envoi SMS de confirmation | Confirmation RDV | Numéro tel, nom, infos RDV | Clients finaux | Twilio | Frankfurt (DB) + Twilio | indéfini ou suppression sur demande | TLS |
| Pilotage interne (admin) | Visualisation appels | Tout ce qui est dans la DB | Clients finaux + nous | aucun supplémentaire | Frankfurt | tant que client actif | Auth Supabase, RLS |

Sera demandé en cas de contrôle PFPDT.

---

## Politique de confidentialité publique

À publier sur filanor.ch (lien obligatoire en footer). Template à adapter dans
`docs/legal/privacy-policy-template.md`.

---

## En cas de violation de données (data breach)

Procédure 72h (art. 24 nLPD) :
1. Identifier l'incident (qui, quoi, quand, comment, ampleur)
2. Contenir (couper les accès compromis, etc.)
3. Notifier le PFPDT via le formulaire en ligne (https://www.edoeb.admin.ch)
4. Si risque élevé pour les personnes : notifier les personnes concernées également

À mettre en place : un contact `security@filanor.ch` qui forward sur Filip + Daniel.
