-- =====================================================================
-- Seed local dev — Filanor Voice
-- =====================================================================
-- Ne PAS appliquer en prod. Données fictives pour tester localement.
-- =====================================================================

-- Tenant démo salon
INSERT INTO tenants (
  slug, business_name, sector, address, contact_email, contact_phone,
  agent_persona, agent_gender, voice_id, language_default,
  opening_hours_text, services_text, praticiens_text,
  plan, minutes_quota, concurrent_calls_max
) VALUES (
  'hair-in-the-city',
  'Hair In The City',
  'salon',
  'Rue du Bourg 21, 1003 Lausanne',
  'demo+sophie@filanor.ch',
  '+41211234567',
  'Sophie',
  'féminine',
  'voice_charlotte_fr',
  'fr',
  'Mardi à vendredi 9h-19h, samedi 9h-17h. Fermé dimanche et lundi.',
  'Coupe femme (45 CHF), coupe homme (30 CHF), balayage (120 CHF), couleur (80 CHF), brushing (35 CHF)',
  'Julie, Sarah, Amélie',
  'pro',
  350,
  5
) ON CONFLICT (slug) DO NOTHING;

-- Tenant démo restaurant
INSERT INTO tenants (
  slug, business_name, sector, address, contact_email, contact_phone,
  agent_persona, agent_gender, voice_id, language_default,
  opening_hours_text, services_text,
  cuisine_type, total_seats, spaces_list,
  lunch_hours, dinner_hours,
  plan, minutes_quota, concurrent_calls_max
) VALUES (
  'trattoria-bellavita',
  'Trattoria Bellavita',
  'restaurant',
  'Place de la Palud 10, 1003 Lausanne',
  'demo+marc@filanor.ch',
  '+41217654321',
  'Marc',
  'masculin',
  'voice_antoine_fr',
  'fr',
  'Mardi à dimanche. Fermé le lundi.',
  'Menu italien traditionnel, plat du jour à 24 CHF, menu midi 19 CHF',
  'italienne traditionnelle',
  60,
  'Salle principale (40 places), terrasse (20 places, météo permettant)',
  '12h-14h',
  '19h-22h',
  'starter',
  120,
  2
) ON CONFLICT (slug) DO NOTHING;
