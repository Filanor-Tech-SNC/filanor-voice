-- =====================================================================
-- Filanor Voice — Migration 0001 — Schéma initial multi-tenant
-- =====================================================================
-- Appliquer via : pnpm supabase:migrate
-- =====================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================================
-- 1. TENANTS — les clients Filanor (salons, restos)
-- =====================================================================
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,                     -- ex: "hair-in-the-city"
  business_name text NOT NULL,                   -- ex: "Hair In The City"
  sector text NOT NULL CHECK (sector IN ('salon', 'restaurant')),
  address text,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,                   -- téléphone "vrai" du tenant
  agent_persona text NOT NULL,                   -- "Sophie" ou "Marc"
  agent_gender text NOT NULL CHECK (agent_gender IN ('féminine', 'masculin')),
  voice_id text NOT NULL,                        -- ElevenLabs voice_id
  language_default text NOT NULL DEFAULT 'fr',
  languages_enabled text[] NOT NULL DEFAULT ARRAY['fr', 'en', 'de'],

  -- Config horaires/services (dénormalisé pour simplicité MVP)
  opening_hours_text text,                       -- texte libre injecté dans prompt
  services_text text,                            -- idem
  praticiens_text text,                          -- pour salons
  cuisine_type text,                             -- pour restos
  total_seats int,                               -- pour restos
  spaces_list text,                              -- pour restos
  breakfast_hours text,                          -- pour restos
  lunch_hours text,
  dinner_hours text,
  brunch_or_sunday_service text,

  -- Google Calendar
  google_calendar_id text,
  google_oauth_refresh_token text,               -- ⚠️ chiffré au niveau app

  -- Plan
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'trial')),
  minutes_quota int NOT NULL DEFAULT 120,
  concurrent_calls_max int NOT NULL DEFAULT 2,

  -- État
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- =====================================================================
-- 2. PHONE_NUMBERS — mapping numéros Twilio → tenants
-- =====================================================================
CREATE TABLE phone_numbers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number text UNIQUE NOT NULL,             -- format E.164 ex: +41215191234
  twilio_sid text UNIQUE NOT NULL,               -- PN... SID Twilio
  retell_agent_id text NOT NULL,                 -- agent_id Retell (SALON ou RESTAURANT)
  is_primary boolean NOT NULL DEFAULT true,      -- un tenant peut avoir un 2e numéro plus tard
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_number ON phone_numbers(phone_number);

-- =====================================================================
-- 3. CALL_LOGS — un enregistrement par appel
-- =====================================================================
CREATE TABLE call_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  retell_call_id text UNIQUE NOT NULL,
  twilio_call_sid text,
  from_number text NOT NULL,                     -- qui appelle
  to_number text NOT NULL,                       -- le numéro appelé (= phone_numbers.phone_number)
  language_detected text,                        -- fr, en, de
  direction text NOT NULL DEFAULT 'inbound',
  duration_seconds int,                          -- durée réelle
  minutes_billed numeric(10,2),                  -- pour calcul quota

  -- Outcome
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'failed', 'no_answer', 'busy')),
  outcome text,                                  -- 'booking_created', 'info_only', 'cancellation', 'group_lead', etc.
  booking_id uuid,                               -- FK vers bookings si applicable

  -- Résumé post-call
  summary text,                                  -- résumé GPT-4o mini
  sentiment text,                                -- 'positive', 'neutral', 'negative'

  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_call_tenant_started ON call_logs(tenant_id, started_at DESC);
CREATE INDEX idx_call_retell ON call_logs(retell_call_id);

-- =====================================================================
-- 4. CALL_TRANSCRIPTS — purge automatique après 30 jours
-- =====================================================================
CREATE TABLE call_transcripts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id uuid NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transcript jsonb NOT NULL,                     -- structure turn-by-turn Retell
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transcript_created ON call_transcripts(created_at);
CREATE INDEX idx_transcript_call ON call_transcripts(call_log_id);

-- =====================================================================
-- 5. BOOKINGS — RDV / réservations créés
-- =====================================================================
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_log_id uuid REFERENCES call_logs(id) ON DELETE SET NULL,

  -- Client final
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,

  -- Détails RDV
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  duration_min int NOT NULL DEFAULT 30,
  service text,                                  -- "coupe + balayage", "table 4 terrasse"
  praticien text,                                -- pour salons
  num_guests int,                                -- pour restos
  space text,                                    -- pour restos (terrasse, salle)
  notes text,                                    -- allergies, demandes spéciales

  -- État
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'modified', 'pending_sync', 'no_show', 'completed')),
  google_event_id text,                          -- id event Google Calendar

  -- Notifications
  sms_confirmation_sent_at timestamptz,
  sms_reminder_sent_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_tenant_date ON bookings(tenant_id, booking_date, booking_time);
CREATE INDEX idx_booking_status ON bookings(status);
CREATE INDEX idx_booking_phone ON bookings(client_phone);

-- =====================================================================
-- 6. USAGE_COUNTERS — tracking minutes consommées par mois
-- =====================================================================
CREATE TABLE usage_counters (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  minutes_used numeric(10,2) NOT NULL DEFAULT 0,
  minutes_overage numeric(10,2) NOT NULL DEFAULT 0,
  calls_total int NOT NULL DEFAULT 0,
  calls_completed int NOT NULL DEFAULT 0,
  bookings_created int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period_year, period_month)
);

-- =====================================================================
-- 7. LEADS — prospects / demandes qui n'aboutissent pas en booking direct
-- =====================================================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_log_id uuid REFERENCES call_logs(id) ON DELETE SET NULL,
  lead_type text NOT NULL CHECK (lead_type IN ('group_large', 'event', 'question_unresolved', 'callback_requested')),
  contact_name text,
  contact_phone text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);

-- =====================================================================
-- 8. RLS — Row Level Security
-- =====================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Politique : service_role voit tout (utilisé par nos API routes côté serveur)
-- Politique MVP : au niveau MVP, seul Filip/Daniel accèdent via service role.
-- Quand un dashboard client sera ajouté plus tard, on ajoutera des policies par auth.uid().

CREATE POLICY "service_role_all_tenants" ON tenants
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_phones" ON phone_numbers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_calls" ON call_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_transcripts" ON call_transcripts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_bookings" ON bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_usage" ON usage_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_leads" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================================
-- 9. CRON — purge transcripts après 30 jours (conformité nLPD)
-- =====================================================================
SELECT cron.schedule(
  'purge-old-transcripts',
  '0 3 * * *',  -- tous les jours à 3h du matin UTC
  $$ DELETE FROM call_transcripts WHERE created_at < NOW() - INTERVAL '30 days'; $$
);

-- =====================================================================
-- 10. Triggers — updated_at auto
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- FIN migration 0001
-- =====================================================================
