# PRICING — Unit Economics Filanor Voice

## Grille tarifaire publique

| Plan | Prix | Minutes incluses | Langues | Appels simultanés | Rapport |
|------|------|------------------|---------|-------------------|---------|
| **Starter** | 199 CHF/mois | 120 | FR + EN + DE | 2 | hebdomadaire |
| **Pro** | 349 CHF/mois | 350 | FR + EN + DE | 5 | hebdomadaire + détails par appel |
| **Setup one-shot** | 590 CHF | — | — | — | — |
| **Overage** | 0.35 CHF/min | — | — | — | — |

Engagement : 3 mois minimum pour bénéficier du setup à 590 CHF (sinon setup 890 CHF one-shot sans engagement).

## Coûts (ce qu'on paie, nous)

### Coût variable par minute d'appel

| Composant | Coût (CHF/min) |
|-----------|----------------|
| Retell base | 0.07 |
| Twilio inbound +41 local | 0.02 |
| ElevenLabs surcharge (voix premium FR Charlotte/Antoine) | 0.06 |
| OpenAI GPT-4o mini tokens (avg 500 tokens/min) | 0.003 |
| **Total variable** | **~0.15 CHF/min** |

Hypothèse prudente, chiffres vérifiés contre sources multiples en avril 2026.

### Coût fixe par tenant par mois

| Composant | CHF/mois |
|-----------|----------|
| Numéro Twilio +41 local | 1 |
| Pro-rata Supabase Pro | 1 |
| Pro-rata Vercel Pro | 1 |
| SMS confirmation (20 appels × 2 SMS × 0.05) | 2 |
| **Total fixe** | **~6 CHF/mois/tenant** ⚠️ recalcul C3 |

### Coût fixe global (non imputable à un tenant précis)

| Composant | CHF/mois |
|-----------|----------|
| Supabase Pro (base) | 25 |
| Vercel Pro | 20 |
| OpenAI baseline (dev + tests) | 5 |
| Twilio baseline | 10 |
| **Total fixe global** | **~75 CHF/mois** ⚠️ recalcul C3 |

Cette partie est couverte par l'ensemble des clients, pas imputée par tenant.

## Simulation marges

### Starter (199 CHF, 120 min)

| Poste | Montant |
|-------|---------|
| Revenu | 199 |
| Coût variable (120 × 0.15) | -18 |
| Coût fixe par tenant | -6 |
| **Marge brute** | **175** |
| **% marge brute** | **88%** |

### Pro (349 CHF, 350 min)

| Poste | Montant |
|-------|---------|
| Revenu | 349 |
| Coût variable (350 × 0.15) | -53 |
| Coût fixe par tenant | -6 |
| **Marge brute** | **290** |
| **% marge brute** | **83%** |

### Setup 590 CHF one-shot

| Poste | Montant |
|-------|---------|
| Revenu | 590 |
| Temps Filip (3-4h × 120 CHF/h équivalent) | -480 |
| **Marge brute** | **~110** |

Le setup est un **ticket d'entrée** plus qu'un centre de profit. Il paie le temps d'onboarding.

### Overage

- Facturé 0.35 CHF/min
- Coût 0.15 CHF/min
- **Marge 0.20 CHF/min = 57%**

## Point mort

Coûts fixes globaux : 75 CHF/mois ⚠️ recalcul C3
Marge brute moyenne par client Starter : 175 CHF ⚠️ recalcul C3

**Point mort : 1 client Starter.**

Après 3 clients Starter, marge nette = 3×175 - 75 = **450 CHF/mois net**. ⚠️ recalcul C3

## Objectif 12 mois (réaliste)

- 20 clients (mix 60% Starter, 40% Pro) : 12×199 + 8×349 = 2388 + 2792 = 5180 CHF/mois revenu
- Coûts variables+fixes : ~800 CHF/mois ⚠️ recalcul C3
- **Marge nette mensuelle : ~4400 CHF/mois** ⚠️ recalcul C3
- **Annualisé : ~53 000 CHF de marge** (hors temps Filip/Daniel) ⚠️ recalcul C3

## Positionnement vs concurrents (vérifié 2026-04-22)

| Concurrent | Starter | Min incluses | Prix effectif/min | Langues inclus |
|------------|---------|--------------|-------------------|----------------|
| **Filanor Voice** | 199 CHF | 120 | 1.66 CHF/min | FR+EN+DE ✅ |
| Vocal-IA.ch | 159 CHF | 100 | 1.59 CHF/min | FR seul (DE/EN payant) |
| AIAgens.ch | sur devis | ? | ? | FR+EN+IT+DE |
| Nerolia (FR) | sur devis | ? | ? | FR |
| AirAgent (FR) | 49€ base + 0.25€/min | pay-per-use | 0.25€/min | FR |
| Voice Pilot | freemium | ? | ? | FR |

**Différenciation Filanor** :
1. Langues multiples inclus dès le Starter (vocal-ia les facture en Pro 259 CHF)
2. Setup physique à Lausanne (présence locale, pas juste numéro)
3. SLA écrit
4. Pricing transparent (pas de "contactez-nous")

## Règles de pricing

- **Pas de discount sous 199 CHF.** Si négocié plus bas, on refuse poliment.
- **Premier mois gratuit** possible en échange d'un témoignage vidéo + autorisation d'utiliser le nom/logo du client sur filanor.ch.
- **Engagement 3 mois** pour le prix setup 590 CHF. Sinon 890 CHF.
- **Facturation mensuelle d'avance**, par TWINT ou virement bancaire IBAN Suisse. Pas de carte de crédit au MVP (éviter Stripe fees + complexité).

## Révision prévue

- Semaine 8 : auditer les coûts Retell réels vs estimés. Ajuster quotas si marge < 75%.
- Semaine 12 : envisager un plan Enterprise à 599 CHF (1000 min, multi-sites, intégration Planity/POS).
