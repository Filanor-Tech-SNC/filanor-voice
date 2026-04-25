# COMPLIANCE nLPD — Filanor Voice

## Cadre légal applicable

- **nLPD** (nouvelle Loi fédérale sur la protection des données) — en vigueur depuis 1er septembre 2023
- **RGPD** — applicable pour les appelants résidents UE (fréquent en Suisse romande frontalière)
- **OPDo** (Ordonnance sur la protection des données) — détails d'application

Principe : comme Filanor Tech SNC est responsable du traitement (RT) et que Retell/OpenAI/ElevenLabs/Twilio/Supabase sont sous-traitants (ST), **un DPA signé avec chaque ST est obligatoire** (art. 9 nLPD).

## Checklist obligatoire AVANT le premier client payant

- [ ] DPA signé avec Retell AI (US entity) — récupérable sur leur page legal
- [ ] DPA signé avec OpenAI (US entity) — via le portail OpenAI (paramètres organisation)
- [ ] DPA signé avec ElevenLabs (US entity) — contacter legal@elevenlabs.io
- [ ] DPA signé avec Twilio — Twilio DPA standard via console
- [ ] DPA signé avec Supabase — Supabase DPA standard via dashboard
- [ ] Registre des traitements à jour (`docs/compliance/registre-traitements.md`)
- [ ] Politique de confidentialité Filanor publiée sur `filanor.ch/confidentialite`
- [ ] Mentions légales sur `filanor.ch/mentions-legales` (raison sociale, RC, UID)
- [ ] Clause dans le contrat client : transfert de données à ST EU/US listés
- [ ] Message d'accueil agent : annonce l'usage d'un assistant automatique
- [ ] Processus d'effacement sur demande (art. 32 nLPD) documenté
- [ ] Processus de portabilité (art. 28 nLPD) documenté

## Rétention des données

| Type de donnée | Durée | Base légale | Mécanisme |
|----------------|-------|-------------|-----------|
| Audio brut appel | **0 jour** (non stocké) | minimisation art. 6 | Retell ne stocke pas l'audio côté Filanor |
| Transcript appel | **30 jours** | intérêt prépondérant (amélioration service) | cron `pg_cron` Supabase |
| Résumé appel | illimité (jusqu'à résiliation tenant) | exécution contrat | conservé pour historique client |
| Infos bookings | durée relation contractuelle + 1 an | exécution contrat | conservé tenant actif |
| Logs techniques | 90 jours | sécurité | rotation Vercel/Supabase |
| PII appelant (nom, tél) | durée booking + 1 an | exécution contrat | purgé via job mensuel |

## KYC Twilio — numéros suisses

### Pour Filanor Tech SNC (société)

Documents requis (selon guidelines officielles Twilio CH, vérifiés 2026-04-22) :

**Numéros locaux +41 (géographiques ex +4121 Lausanne, +4122 Genève)** :
- Business Name : extrait du Registre du Commerce Vaud ✅ (disponible)
- Business Address IN Switzerland : extrait RC montrant adresse Chavornay (VD) ✅
- UID suisse (CHE-xxx.xxx.xxx) : pas de doc additionnel requis

**Numéros mobiles +417** :
- Business Name : extrait RC ✅
- Business Address : peut être n'importe où (l'adresse Chavornay fait l'affaire)
- UID : idem

**Numéros toll-free +41800** :
- Business Name : extrait RC ✅
- Address : n'importe où

**Conclusion** : l'extrait du RC Vaud de Filanor Tech SNC (avec l'UID) **couvre les 3 types**. Upload unique dans Twilio Console → Regulatory Bundles → Switzerland → Business, validation en 2-5 jours ouvrables.

## Information des appelants

Message d'accueil obligatoire en début d'appel (intégré dans tous les prompts) :

**FR :** *"Bonjour, vous êtes en contact avec l'assistant téléphonique automatique de [nom du salon]. Votre appel peut être résumé pour améliorer le service. Comment puis-je vous aider ?"*

**EN :** *"Hello, you've reached the automated phone assistant for [salon name]. Your call may be summarized to improve our service. How can I help you?"*

**DE :** *"Hallo, Sie sprechen mit dem automatischen Telefonassistenten von [Salonname]. Ihr Anruf kann zusammengefasst werden, um unseren Service zu verbessern. Wie kann ich Ihnen helfen?"*

## Transfert de données à l'étranger

Tous les sous-traitants sont **US** sauf Supabase (serveurs EU Frankfurt). Pour le transfert US :
- nLPD art. 16 al. 2 let. d : transfert OK si ST s'engage contractuellement à un niveau de protection équivalent
- Les DPA standards des 5 ST incluent les clauses contractuelles types (SCC) conformes RGPD et adéquates nLPD
- Mention explicite dans la politique de confidentialité Filanor

## Responsable de la protection des données

Pour Filanor Tech SNC (<250 salariés, pas de risque élevé systématique) : **pas d'obligation de désigner un DPO**. Mais il est recommandé de :
- Désigner Filip comme point de contact interne
- Publier `privacy@filanor.ch` dans la politique

## En cas de breach

Art. 24 nLPD : obligation d'annoncer au PFPDT dans les **meilleurs délais** (aucun délai fixe comme RGPD 72h, mais interprété comme "rapidement").

Process interne à documenter dans `docs/compliance/incident-response.md` (à créer dès le premier client payant).

## Liens utiles

- Guidelines officielles Twilio CH : https://www.twilio.com/en-us/guidelines/ch/regulatory
- Préposé fédéral (PFPDT) : https://www.edoeb.admin.ch
- Texte complet nLPD : https://www.fedlex.admin.ch/eli/cc/2022/491/fr
