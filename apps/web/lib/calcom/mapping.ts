import type { Service } from "./types";

// Map service métier Filanor → env var qui contient l'eventTypeId Cal.com.
// Throw si service inconnu OU env manquante. Pas de fallback silencieux —
// on veut un crash bruyant, pas une démo qui réserve "coupe-femme" alors
// que le client a demandé "balayage".
const ENV_KEY_BY_SERVICE: Record<Service, string> = {
  "coupe-femme": "CALCOM_EVENT_ID_COUPE_FEMME",
  "coupe-homme": "CALCOM_EVENT_ID_COUPE_HOMME",
  coloration: "CALCOM_EVENT_ID_COLORATION",
  balayage: "CALCOM_EVENT_ID_BALAYAGE",
  "reservation-2": "CALCOM_EVENT_ID_RESERVATION_2",
  "reservation-4": "CALCOM_EVENT_ID_RESERVATION_4",
  "reservation-6": "CALCOM_EVENT_ID_RESERVATION_6",
  "groupe-special": "CALCOM_EVENT_ID_GROUPE_SPECIAL",
};

export function serviceToEventTypeId(service: Service): number {
  const envKey = ENV_KEY_BY_SERVICE[service];
  if (!envKey) {
    throw new Error(`Unknown service: ${service}`);
  }
  const raw = process.env[envKey];
  if (!raw) {
    throw new Error(`Env var ${envKey} not set (service: ${service})`);
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Env var ${envKey} not a valid event_type_id: "${raw}"`);
  }
  return parsed;
}

// Service par défaut quand le LLM ne le précise pas (ex: "Je voudrais une coupe").
export const DEFAULT_SALON_SERVICE: Service = "coupe-femme";

// Durées (min) configurées dans Cal.com côté event types.
// Utilisé pour informer Sophie ("c'est environ 1h") sans round-trip extra.
const DURATION_BY_SERVICE: Record<Service, number> = {
  "coupe-femme": 60,
  "coupe-homme": 30,
  coloration: 120,
  balayage: 150,
  "reservation-2": 90,
  "reservation-4": 90,
  "reservation-6": 120,
  "groupe-special": 15,
};

export function serviceDurationMin(service: Service): number {
  return DURATION_BY_SERVICE[service];
}

// Liste exhaustive pour validation runtime (input du LLM).
export const SALON_SERVICES: ReadonlyArray<Service> = [
  "coupe-femme",
  "coupe-homme",
  "coloration",
  "balayage",
];

export const RESTAURANT_SERVICES: ReadonlyArray<Service> = [
  "reservation-2",
  "reservation-4",
  "reservation-6",
  "groupe-special",
];

export function isSalonService(s: string): s is Service {
  return (SALON_SERVICES as ReadonlyArray<string>).includes(s);
}
