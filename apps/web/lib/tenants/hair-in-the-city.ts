// Tenant config statique pour la démo Hair In The City (Sophie).
// Source unique de vérité — consommée par /api/retell/inbound-webhook (call_inbound)
// ET par /api/retell/dynamic-variables (legacy, voir ADR-015).
//
// MOCK — replace with Supabase tenant lookup keyed by to_number in S5+.

export type TenantConfig = {
  agent_persona: string;
  agent_gender: string;
  tenant_name: string;
  tenant_type: string;
  tenant_address: string;
  language_default: string;
  opening_hours: string;
  services: string;
  praticiens_list: string;
  closing_time_ref: string;
};

export const HAIR_IN_THE_CITY: TenantConfig = {
  agent_persona: "Sophie",
  agent_gender: "féminine",
  tenant_name: "Hair In The City",
  tenant_type: "salon de coiffure",
  tenant_address: "Rue du Bourg 21, 1003 Lausanne",
  language_default: "français",
  opening_hours:
    "Mardi à vendredi 9 heures à 19 heures, samedi 9 heures à 17 heures. Fermé dimanche et lundi.",
  services:
    "Coupe femme (45 CHF), coupe homme (30 CHF), balayage (120 CHF), couleur (80 CHF), brushing (35 CHF)",
  praticiens_list: "Julie, Sarah, Amélie",
  closing_time_ref: "à bientôt",
};
