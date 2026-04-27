# SETUP_ACCOUNTS — Création des comptes pro Filanor Voice

> Guide opérationnel pour la création en une fois de tous les comptes services nécessaires au MVP.
> À exécuter AVANT l'ÉTAPE D (`git init` + `pnpm install`).
>
> **Règle d'or** : utiliser `contact@filanor.ch` comme email partout, sauf mention explicite.
> Infos société : **Filanor Tech SNC**, UID **CHE-142.367.808**, Chavornay (VD), Suisse.

---

## Préambule — à lire avant de commencer

### Informations à avoir sous la main

- **Raison sociale** : `Filanor Tech SNC`
- **Forme juridique** : Société en nom collectif (SNC) — en anglais, *General Partnership*
- **UID** : `CHE-142.367.808`
- **Registre du Commerce** : Vaud (extrait RC en PDF)
- **Adresse siège** : Rue de Crause 3, 1373 Chavornay (VD)
- **Email pro** : `contact@filanor.ch`
- **Téléphone de vérification SMS** : [FILIP À CONFIRMER — mobile perso ou futur numéro pro ?]
- **Timezone** : Europe/Zurich partout
- **Site vitrine** : `https://filanor.ch`

### Carte bancaire à utiliser

- **CB pro Filanor** si existe : [FILIP À CONFIRMER oui/non ?]
- Sinon **CB perso Filip** en attendant, avec note comptable pour remboursement ultérieur

Tous les services facturent en **USD** sauf Infomaniak (CHF). Prévoir conversion à ~+2% sur chaque transaction (frais de change CB).

### Stockage temporaire des clés

Pendant la session de création :

```
C:\Filanor\credentials-temp.txt       ← fichier plat, format "SERVICE_KEY: valeur"
```

**Règles strictes :**
- NE PAS stocker sur le Desktop (scrapé par Windows Search)
- NE PAS mettre dans un repo git (même privé)
- PAS de sync Dropbox/iCloud/OneDrive sur ce fichier
- **Purge** du fichier dès que toutes les valeurs sont dans `.env.local` du repo
- `.env.local` est dans `.gitignore`, jamais committé

### Pièges classiques à éviter

- **Vérification téléphone** : certains services demandent un SMS de validation. Utiliser le mobile perso Filip tant que le numéro pro Twilio n'est pas encore acheté.
- **Billing currency** : tous les services facturent en USD (sauf Infomaniak). Pas de bascule CHF native — facturé via conversion CB.
- **Nom légal exact** : `Filanor Tech SNC` (pas `Filanor SNC`, pas `Filanor Tech`). Les KYC échouent sinon.
- **Double compte** : si un compte perso existe déjà chez un provider avec `contact@filanor.ch`, NE PAS créer un second. Upgrade le perso en pro.
- **Email de vérification** : vérifier que `contact@filanor.ch` est bien actif AVANT de commencer (étape 3 ci-dessous).

---

## Ordre d'exécution recommandé

| Ordre | Service | Pourquoi ce rang | Temps actif | Attente |
|-------|---------|------------------|-------------|---------|
| 1 | **Twilio** (KYC) | ✓ Approved 2026-04-25 — Bundle SID en §1.6 | 20 min | **fait** |
| 2 | **GitHub org** | 5 min, débloque `git init` (ÉTAPE D) | 5 min | 0 |
| 3 | **Infomaniak email** | Vérifier que `contact@filanor.ch` existe/fonctionne | 5 min | 0 |
| 4 | **Supabase** | Critique Jour 1 (migration 0001) | 10 min | 0 |
| 5 | **Retell AI** | Critique Jour 1 | 10 min | 0 |
| 6 | **OpenAI** | LLM pour Retell + demande ZDR | 10 min | 24-72h ZDR |
| — | **ElevenLabs** | **NE PAS créer** au MVP — ADR-001, facturé via Retell | — | — |
| — | **Google Cloud** | OAuth Calendar = Jour 6 S2, pas maintenant | — | — |

**Total actif ≈ 1h.** Pendant les 1-2j d'attente Twilio KYC et les 24-72h de ZDR OpenAI, tout le reste est déblocable.

---

## 1. Twilio — KYC + téléphonie

> **Status KYC : APPROVED (2026-04-25)** — Bundle "Filanor Voice — CH Local Business"
> `TWILIO_REGULATORY_BUNDLE_SID=BU8915423173a55add249d07b0c731e20a`
> Achat des 2 numéros démo Sophie + Marc débloqué côté Twilio. Reste l'attente CB pro PostFinance avant de tirer les numéros (cf. JOURNAL 2026-04-25).

### 1.1 Création du compte

- [ ] Aller sur https://www.twilio.com/try-twilio
- [ ] Email : `contact@filanor.ch`
- [ ] Mot de passe fort (stocker dans gestionnaire de mots de passe, PAS dans `credentials-temp.txt`)
- [ ] Validation email
- [ ] Question "What do you want to do?" → **Use my own application** (pas no-code)
- [ ] Langue interface : anglais (FR partiellement supporté)

### 1.2 Onboarding initial

- [ ] First/Last name : `Filip Kuleshov`
- [ ] Company name : `Filanor Tech SNC`
- [ ] Phone verification : SMS sur mobile perso Filip
- [ ] Use case : **Voice** + **SMS**

### 1.3 Business Profile (KYC) — critique pour +41

- [ ] Console Twilio → **Regulatory Compliance** → **Business Profile** → *Create a new business profile*
- [ ] Remplir :
  - Legal business name : `Filanor Tech SNC`
  - Business type : **Partnership** (SNC = General Partnership)
  - Business registration number : `CHE-142.367.808`
  - Registration type : *VAT/Tax ID* (Twilio n'a pas d'option "Swiss UID" dédiée)
  - Business address : `Rue de Crause 3, 1373 Chavornay`
  - Business website : `https://filanor.ch`
  - Business industry : **Technology** → **Software**
- [ ] Uploader l'**extrait du RC Vaud** (PDF) comme pièce justificative
- [ ] Soumettre → **attente validation 1-2 jours ouvrés**

### 1.4 Adresse régulatoire (en parallèle de la validation)

- [ ] Console Twilio → **Phone Numbers** → **Regulatory Compliance** → **Addresses**
- [ ] Créer une adresse pour **Switzerland** avec l'adresse Filanor Chavornay (Rue de Crause 3, 1373)
- [ ] Cette adresse sera référencée par `TWILIO_ADDRESS_SID` plus tard

### 1.5 Activer le billing

- [ ] Console Twilio → **Billing** → Add payment method → CB
- [ ] **Enable auto-recharge** : +20 USD quand le solde passe sous 10 USD (évite coupure pendant un appel en cours)
- [ ] Facturation en USD (pas de CHF natif)

### 1.6 Une fois le KYC validé (email de Twilio)

Clés à noter dans `credentials-temp.txt` :

```
TWILIO_ACCOUNT_SID=              ← Console → Account Info → Account SID (AC...)
TWILIO_AUTH_TOKEN=               ← Console → Account Info → Auth Token (masqué, cliquer pour révéler)
TWILIO_DEFAULT_CALLER_ID=+41...  ← laisser vide au MVP, rempli dès achat du 1er numéro Sophie (Jour 3)
```

Variables non présentes dans `.env.example` mais à noter dès maintenant pour le provisioning :

```
TWILIO_REGULATORY_BUNDLE_SID=BU8915423173a55add249d07b0c731e20a   ← Approved 2026-04-25
TWILIO_ADDRESS_SID=             ← Regulatory Compliance → Addresses → Address SID (AD...)
```

### 1.7 Post-création — actions à planifier

- [ ] **Signer le DPA** Twilio : Console → Legal → Data Protection Addendum (cf. `docs/legal/dpa-checklist.md` §Twilio)
- [ ] Activer **EU data residency** si option disponible : Account Settings → Data Region
- [ ] Achat des 2 numéros démo Sophie + Marc → **Jour 3** via skill `twilio-number`, pas maintenant

### Pièges Twilio

- **KYC refusé** : si `Filanor Tech SNC` ne matche pas exactement le RC, refus automatique. Vérifier l'extrait PDF avant upload.
- **Trial credit $15.50** : offert à l'inscription, OK pour tests API mais **non utilisable pour numéros +41 tant que KYC pas validé**.
- **Numéros +41 local** : exigent l'adresse CH approuvée. Sans KYC, achat bloqué.

---

## 2. GitHub — Organisation `Filanor-Tech-SNC`

### 2.1 Création de l'org

- [ ] Aller sur https://github.com/organizations/new
- [ ] Plan : **Free** (cf. `docs/COSTS.md` — repos privés illimités + 2000 min Actions / mois)
- [ ] Organization account name : `Filanor-Tech-SNC` (exact, casse mixte avec tirets — slug case-sensitive sur l'API GitHub)
- [ ] Contact email : `contact@filanor.ch`
- [ ] This organization belongs to : **a business or institution**
- [ ] Business name : `Filanor Tech SNC`
- [ ] Country : Switzerland

### 2.2 Configuration post-création

- [ ] Org → Settings → Member privileges → *Default repository permission* : **Read**
- [ ] Org → Settings → Billing : ajouter CB (optionnel tant que Free tier suffit)
- [ ] Inviter **Daniel Shevchenko** comme Member (pas Owner) — email GitHub [FILIP À CONFIRMER]
- [ ] Activer **Two-factor authentication required** pour l'org (Settings → Authentication security)

### 2.3 Rien à noter en `.env.local`

Les secrets GitHub Actions (quand on en aura) sont gérés au niveau repo/org directement, pas via `.env.local`.

### Pièges GitHub

- **Nom d'org** : `Filanor-Tech-SNC` (créée). Slug case-sensitive sur l'API GitHub CLI — utiliser exactement cette casse dans toutes les commandes `gh`.
- **Passage Free → Team** (4 USD/user/mois) plus tard pour SSO/audit log, pas au MVP.

---

## 3. Infomaniak — Email pro `contact@filanor.ch`

### 3.1 Vérifier l'existant

Le domaine `filanor.ch` est déjà chez Infomaniak (DNS + hébergement site vitrine). L'email pro `contact@filanor.ch` devrait déjà être configurable gratuitement.

- [ ] Se connecter sur https://manager.infomaniak.com (compte Filip existant)
- [ ] **Mail Service** → vérifier si `contact@filanor.ch` existe déjà
- [ ] Si oui : récupérer/réinitialiser mot de passe, tester login
- [ ] Si non : créer la boîte (plan **Mail Starter** gratuit inclus avec le domaine)

### 3.2 Configuration IMAP/SMTP (pour plus tard)

Pas nécessaire Jour 1. Sera utile quand on voudra envoyer des emails applicatifs (alertes, rapports hebdo tenants). À ce moment :

```
SMTP_HOST=mail.infomaniak.com
SMTP_PORT=465
SMTP_USER=contact@filanor.ch
SMTP_PASSWORD=                   ← à générer dans Infomaniak Mail
```

Ces variables ne sont PAS dans `.env.example` actuel — à ajouter le moment venu.

### 3.3 Rien de bloquant pour Jour 1

L'email pro sert surtout à recevoir les emails de validation des autres services. Vérifier juste que l'inbox fonctionne.

---

## 4. Supabase — DB + Auth + Storage

### 4.1 Création du compte

- [ ] Aller sur https://supabase.com/dashboard/sign-up
- [ ] Option **Sign up with GitHub** (utiliser le compte Filip qui sera owner de `Filanor-Tech-SNC`) ou email `contact@filanor.ch`
- [ ] Validation email

### 4.2 Créer l'organisation

- [ ] Après login → **New Organization**
- [ ] Name : `Filanor Tech`
- [ ] Type : **Business**
- [ ] Plan : **Free** (ADR-012 — upgrade Pro 25 USD/mo dès 1er pilote signé, pas avant)

### 4.3 Créer le projet

- [ ] Dans l'org → **New Project**
- [ ] Name : `filanor-voice-prod`
- [ ] Database password : **générer fort (32+ chars)**, noter dans gestionnaire de mots de passe (PAS credentials-temp.txt)
- [ ] Region : **Frankfurt** (`eu-central-1`) — **critique** pour ADR-006 nLPD
- [ ] Pricing plan : **Free**
- [ ] Cliquer *Create new project* → provisionnement ~2 min

### 4.4 Clés à récupérer

```
NEXT_PUBLIC_SUPABASE_URL=        ← Project Settings → API → Project URL (https://xxxxxx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Project Settings → API → anon/public key
SUPABASE_SERVICE_ROLE_KEY=       ← Project Settings → API → service_role key (⚠️ jamais côté client)
SUPABASE_REGION=eu-central-1     ← déjà pré-rempli dans .env.example
```

### 4.5 Post-création

- [ ] **Signer le DPA** Supabase : Organization Settings → Legal → Data Processing Addendum
- [ ] Vérifier la region : Project Settings → General → Region = `eu-central-1`
- [ ] **PAS** activer `pg_cron` (indisponible en Free, cf. ADR-012) — la purge 30j passera via Vercel Cron
- [ ] Noter le mot de passe DB pour la migration Jour 1

### Pièges Supabase

- **Pause après 7j d'inactivité** en Free tier : projet suspendu si zéro requête pendant 1 semaine. OK en phase 0, il suffit de rouvrir le dashboard pour le réveiller.
- **Service role key** : JAMAIS committée, jamais côté client. Uniquement dans `/api/*` server-side.
- **500 MB DB Free** : largement suffisant pour phase 0-1 (1 client réel pendant 1 an ≈ 50-100 MB).

---

## 5. Retell AI — Moteur voice

### 5.1 Création du compte

- [ ] Aller sur https://dashboard.retellai.com (ou https://beta.retellai.com selon version courante)
- [ ] Sign up avec `contact@filanor.ch`
- [ ] Pas de plan "Free" chez Retell — facturation **pay-as-you-go** dès le premier appel
- [ ] Validation email

### 5.2 Activer le billing

- [ ] Dashboard → **Billing** → Add payment method → CB
- [ ] Pré-charger ~20 USD (environ 150 min de test, large pour Jour 1-3)
- [ ] Enable auto-recharge : +20 USD quand solde < 5 USD

### 5.3 Clés à récupérer

```
RETELL_API_KEY=                 ← Dashboard → API Keys → Create API Key (s'affiche UNE SEULE FOIS, copier de suite)
RETELL_WEBHOOK_SECRET=          ← Dashboard → Webhooks → Signing secret (cf. api-routes/SKILL.md §"Validation signature Retell")
RETELL_AGENT_ID_SALON=          ← vide au MVP, rempli Jour 2 après création agent via /new-agent
RETELL_AGENT_ID_RESTAURANT=     ← idem
```

### 5.4 Post-création

- [ ] **Signer le DPA** Retell : Dashboard → Legal → DPA (si pas visible, demander à support@retellai.com)
- [ ] Vérifier que l'account est en **SOC 2 Type II compliant mode** (par défaut depuis 2025)
- [ ] Activer `data_storage_setting = no_transcript_storage` → au moment de la création agent Jour 2

### Pièges Retell

- **Prix facial $0.07/min trompeur** (`docs/ANTI_PATTERNS.md`) : vrai coût ~$0.13-0.17/min combiné.
- **Latence 800ms observée** (pas 600ms). Pas blocker Jour 1, mais à mesurer.
- **v1 API dépréciée** : utiliser v2 partout (déjà noté dans `retell-config/SKILL.md`).
- **Pas besoin de compte ElevenLabs direct** (ADR-001) : Retell facture ElevenLabs dedans.

---

## 6. OpenAI — LLM GPT-4o mini

### 6.1 Création du compte

- [ ] Aller sur https://platform.openai.com/signup
- [ ] Sign up avec `contact@filanor.ch`
- [ ] Validation email + SMS

### 6.2 Créer une Organization (pas compte individuel)

- [ ] Après signup → **Create organization**
- [ ] Organization name : `Filanor Tech`
- [ ] Company size : **1-10**
- [ ] Role : **Founder**

### 6.3 Activer le billing

- [ ] Dashboard → **Settings** → **Billing** → Add payment method
- [ ] Pré-charger 10 USD (≈ 3M tokens GPT-4o mini, largement phase 0)
- [ ] **Enable usage limits** :
  - Soft limit : 5 USD/mo (alerte email)
  - Hard limit : 20 USD/mo (bloque les appels API au-delà — protection contre boucle infinie)

### 6.4 Demander **Zero Data Retention** (critique nLPD)

- [ ] Aller sur https://help.openai.com → chercher "Zero Data Retention"
- [ ] Remplir le formulaire ZDR pour l'organization `Filanor Tech`
- [ ] Attente approbation : 24-72h
- [ ] Une fois approuvé → les transcripts ne sont plus stockés côté OpenAI (cf. `docs/legal/dpa-checklist.md` §OpenAI)

### 6.5 Clés à récupérer

```
OPENAI_API_KEY=                 ← Dashboard → API Keys → Create new secret key → scope "project"
OPENAI_MODEL=gpt-4o-mini        ← déjà pré-rempli dans .env.example
```

### 6.6 Post-création

- [ ] **Signer le DPA** OpenAI : Dashboard → Legal → Data Processing Addendum
- [ ] Vérifier que `gpt-4o-mini` est accessible (tous les comptes y ont accès par défaut depuis 2024)

### Pièges OpenAI

- **Individual vs Organization** : créer une Organization dès le départ, propre pour DPA + multi-user plus tard.
- **API key "project" vs "user"** : scope **project** (rattachée à l'org, révocable indépendamment).
- **ZDR délai** : ne pas passer en prod réelle avant approbation.

---

## 7. ElevenLabs — NE PAS créer directement (ADR-001)

La voix ElevenLabs est facturée **via Retell**. Inutile au MVP (cf. `docs/ANTI_PATTERNS.md` §"Plan ElevenLabs Creator $22 ≠ conversational AI temps réel").

**Exception** : si tu veux générer des MP3 démo offline pour la landing `filanor.ch/voix` (Semaine 3), prendre un plan Creator $22/mo le moment venu. **Pas au Jour 1.**

Variables `.env.example` concernées (remplies Jour 2 via Retell, pas par un compte ElevenLabs direct) :

```
ELEVENLABS_API_KEY=             ← vide tant que pas de génération offline
ELEVENLABS_VOICE_ID_SOPHIE=     ← voice_id interne Retell (PAS ElevenLabs direct), rempli Jour 2
ELEVENLABS_VOICE_ID_MARC=       ← idem
```

---

## 8. Google Cloud / Workspace — PAS AU JOUR 1

OAuth Google Calendar = **Jour 6 (début S2)**, pas maintenant. Quand on y arrivera, le process sera :

- Créer un projet Google Cloud (gratuit)
- Activer l'API Calendar
- OAuth Consent Screen → External (verification pas nécessaire au MVP tant que <100 utilisateurs)
- Credentials → OAuth 2.0 Client ID → Web application
- Récupérer `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`
- Configurer `GOOGLE_OAUTH_REDIRECT_URI=https://app.filanor.ch/api/oauth/google/callback`

Je mettrai à jour ce doc le moment venu (Jour 5 ou 6).

---

## Récap — à faire APRÈS toutes les créations

### Migration des clés vers `.env.local`

- [ ] Copier `.env.example` → `.env.local` à la racine du repo `filanor-voice/`
- [ ] Remplir chaque variable à partir de `C:\Filanor\credentials-temp.txt`
- [ ] Vérifier que `.env.local` est bien dans `.gitignore` (déjà le cas)
- [ ] **Supprimer `C:\Filanor\credentials-temp.txt`** après validation
- [ ] Vérifier dans gestionnaire de mots de passe que : mot de passe Supabase DB, mot de passe Infomaniak, tokens non-API sont tous stockés

### Checklist DPA signés (source : `docs/legal/dpa-checklist.md`)

- [ ] Retell AI
- [ ] Twilio
- [ ] OpenAI (+ ZDR approuvé par email)
- [ ] Supabase
- [ ] Vercel (à vérifier au niveau org `Filanor-Tech-SNC`, peut déjà être signé côté perso Filip)

⚠️ **Aucun client payant onboardé avant que ces 5 DPA soient signés et classés** dans `docs/compliance/dpa/` (dossier à créer).

### Vérifications post-setup

- [ ] `curl https://api.retellai.com/v2/list-agents -H "Authorization: Bearer $RETELL_API_KEY"` → doit retourner `[]` ou une liste (pas 401)
- [ ] `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"` → doit retourner une liste de modèles
- [ ] Supabase → dashboard projet ouvert, migration 0001 pas encore appliquée (normal)
- [x] Twilio → Business Profile status = **Approved (2026-04-25)** ✓

### Mise à jour du dashboard de suivi coûts

Au bout de 7 jours d'utilisation réelle, ré-ouvrir `docs/COSTS.md` et ajuster les estimations de burn rate avec les vrais chiffres.

---

## Liens rapides

| Service | Dashboard | Docs | Support |
|---------|-----------|------|---------|
| Twilio | https://console.twilio.com | https://www.twilio.com/docs | help@twilio.com |
| GitHub | https://github.com/Filanor-Tech-SNC | https://docs.github.com | — |
| Infomaniak | https://manager.infomaniak.com | https://www.infomaniak.com/fr/support | — |
| Supabase | https://supabase.com/dashboard | https://supabase.com/docs | support@supabase.io |
| Retell AI | https://dashboard.retellai.com | https://docs.retellai.com | support@retellai.com |
| OpenAI | https://platform.openai.com | https://platform.openai.com/docs | https://help.openai.com |

---

**Dernière mise à jour : 2026-04-22 — bootstrap Session 2.**
