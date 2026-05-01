import type {
  CalcomBookingResponse,
  CalcomError,
  CalcomSlotsResponse,
} from "./types";

// Cal.com v2 versionne les endpoints indépendamment.
// /v2/slots accepte 2024-09-04 (404 sur 2024-08-13).
// /v2/bookings accepte 2024-08-13 (404 sur 2024-09-04).
// Cf. https://api.cal.eu/v2/docs — chaque endpoint indique sa version.
const API_VERSION_SLOTS = "2024-09-04";
const API_VERSION_BOOKINGS = "2024-08-13";

function getConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.CALCOM_BASE_URL;
  const apiKey = process.env.CALCOM_API_KEY;
  if (!baseUrl) {
    throw new Error("CALCOM_BASE_URL not set");
  }
  if (!apiKey) {
    throw new Error("CALCOM_API_KEY not set");
  }
  return { baseUrl, apiKey };
}

async function calcomFetch(
  path: string,
  apiVersion: string,
  init?: RequestInit,
): Promise<Response> {
  const { baseUrl, apiKey } = getConfig();
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": apiVersion,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

// GET /v2/slots — créneaux disponibles pour un eventTypeId sur une fenêtre.
export async function getSlots(args: {
  eventTypeId: number;
  start: string;
  end: string;
  timeZone?: string;
}): Promise<CalcomSlotsResponse> {
  const { eventTypeId, start, end, timeZone = "Europe/Zurich" } = args;
  const qs = new URLSearchParams({
    eventTypeId: String(eventTypeId),
    start,
    end,
    timeZone,
  });
  const r = await calcomFetch(`/slots?${qs.toString()}`, API_VERSION_SLOTS);
  if (!r.ok) {
    const body = await safeJson<CalcomError>(r);
    throw new CalcomApiError(r.status, body);
  }
  return (await r.json()) as CalcomSlotsResponse;
}

// POST /v2/bookings — crée un booking. Throw CalcomApiError sur 4xx/5xx ;
// le caller décide comment traduire (slot pris vs autre erreur) vers le LLM.
export async function createBooking(args: {
  eventTypeId: number;
  start: string;
  attendee: {
    name: string;
    email: string;
    phoneNumber?: string;
    timeZone: string;
    language?: string;
  };
  metadata?: Record<string, string>;
}): Promise<CalcomBookingResponse> {
  const r = await calcomFetch(`/bookings`, API_VERSION_BOOKINGS, {
    method: "POST",
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const body = await safeJson<CalcomError>(r);
    throw new CalcomApiError(r.status, body);
  }
  return (await r.json()) as CalcomBookingResponse;
}

async function safeJson<T>(r: Response): Promise<T | null> {
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export class CalcomApiError extends Error {
  public readonly status: number;
  public readonly body: CalcomError | null;

  constructor(status: number, body: CalcomError | null) {
    super(
      `Cal.com API error ${status}: ${body?.error?.code ?? "Unknown"} — ${
        body?.error?.message ?? ""
      }`,
    );
    this.status = status;
    this.body = body;
  }

  // Heuristique pour détecter "ce créneau vient d'être pris" → success: false côté LLM.
  isSlotTaken(): boolean {
    if (this.status !== 409 && this.status !== 400 && this.status !== 422) {
      return false;
    }
    const code = this.body?.error?.code?.toLowerCase() ?? "";
    const msg = this.body?.error?.message?.toLowerCase() ?? "";
    return (
      code.includes("slot") ||
      code.includes("booking") ||
      code.includes("conflict") ||
      msg.includes("not available") ||
      msg.includes("already booked") ||
      msg.includes("conflict") ||
      msg.includes("no longer available")
    );
  }
}
