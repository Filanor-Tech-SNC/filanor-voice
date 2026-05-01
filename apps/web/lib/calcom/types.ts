// Types partagés pour l'intégration Cal.com v2 (instance EU).

export type CalcomSlot = {
  start: string; // ISO 8601, ex "2026-05-04T09:00:00.000+02:00" si timeZone=Europe/Zurich
};

export type CalcomSlotsResponse = {
  data: Record<string, CalcomSlot[]>; // key = YYYY-MM-DD (date locale Europe/Zurich)
};

export type CalcomBooking = {
  id: number;
  uid: string;
  status?: string;
  start?: string;
  end?: string;
};

export type CalcomBookingResponse = {
  status: "success";
  data: CalcomBooking;
};

export type CalcomError = {
  status: "error";
  timestamp: string;
  path: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type SalonService =
  | "coupe-femme"
  | "coupe-homme"
  | "coloration"
  | "balayage";

export type RestaurantService =
  | "reservation-2"
  | "reservation-4"
  | "reservation-6"
  | "groupe-special";

export type Service = SalonService | RestaurantService;

// Shape exposé au LLM Retell par check_availability.
// Pas de champ stylist (Cal.com Free single-user, ajustement Filip 2026-05-01).
export type PresentableSlot = {
  date: string; // YYYY-MM-DD
  day: string; // "samedi", "vendredi", etc.
  time: string; // "10:00" (heure locale Europe/Zurich)
  duration_min: number;
};
