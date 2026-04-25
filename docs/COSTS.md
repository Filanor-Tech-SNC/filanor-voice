# COSTS — Services payants actifs ou prévus

Source de vérité pour le burn rate de Filanor Voice.
**Mise à jour obligatoire** chaque fois qu'un service est ajouté, retiré, ou qu'un plan change.

Statuts : `actif` (créé et payant) · `prévu` (à créer dans les jours à venir) · `suspendu` · `à clarifier`

---

## État courant — Phase 0 (aucun client payant)

| Service | Plan | Coût mensuel | Statut | Notes |
|---------|------|--------------|--------|-------|
| Supabase | Free | 0 CHF | prévu Jour 1 | Pro 25 USD/mo dès 1er pilote signé (ADR-012) |
| Vercel | Hobby | 0 CHF | actif (compte Filip) | partagé avec filanor.ch, app.filanor.ch ajouté en S1 |
| GitHub | Organization Free | 0 CHF | actif | org `Filanor-Tech-SNC` créée. Repos privés illimités + 2000 min Actions CI/CD / mois |
| Twilio | pay-as-you-go | ~2 CHF/mo | prévu Jour 3 | 2 numéros +41 démo (Sophie, Marc) à ~1 CHF/mois chacun |
| Retell AI | pay-as-you-go | ~8 CHF/mo | prévu Jour 1 | phase dev estimée 50 min/mois × ~0.15 CHF coût réel |
| OpenAI | pay-as-you-go | ~2 CHF/mo | prévu Jour 1 | GPT-4o mini, volume dev |
| ElevenLabs | inclus via Retell | 0 CHF direct | actif (facturé via Retell) | ADR-001 |
| Email pro `contact@filanor.ch` | Infomaniak | 0 CHF | actif | inclus dans l'hébergement du domaine filanor.ch |
| Domaine filanor.ch | Infomaniak | ~15 CHF/an (~1.25 CHF/mo) | actif | hors périmètre projet |

**Burn rate phase 0 estimé : ~12-15 CHF/mois** (hors domaine déjà amorti).

---

## Phase 1 — dès 1er pilote payant signé

| Service | Plan | Coût mensuel | Déclencheur |
|---------|------|--------------|-------------|
| Supabase | Pro | 25 USD (~22 CHF) | signature 1er pilote (ADR-012) |
| Vercel | Hobby | 0 CHF | tant que suffisant |
| Twilio | pay-as-you-go | 3-5 CHF | +1 numéro par client |
| Retell | pay-as-you-go | 30-80 CHF | selon volume clients |
| OpenAI | pay-as-you-go | 10-25 CHF | selon volume |

**Burn rate phase 1 estimé : ~55-75 CHF/mois** (hors coût variable Retell/OpenAI/Twilio facturé au client via le pricing 199/349).

---

## Services retirés

| Service | Raison | Date | ADR |
|---------|--------|------|-----|
| n8n self-hosted (Railway/Hetzner) | workflows codés dans Next.js API routes | 2026-04-22 | ADR-013 |
