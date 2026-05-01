import { CalcomApiError, createBooking } from "@/lib/calcom/client";
import {
  buildZurichIso,
  frenchDateLong,
  frenchTime,
  normalizePhone,
} from "@/lib/calcom/datetime";
import {
  isSalonService,
  serviceToEventTypeId,
} from "@/lib/calcom/mapping";
import { assertNoTemplatePlaceholders } from "@/lib/calcom/safety";
import type { Service } from "@/lib/calcom/types";

const ROUTE = "/api/retell/functions/book-appointment";
const TZ = "Europe/Zurich";
const DEMO_EMAIL_DOMAIN = "filanor-demo.ch";

function log(level: "info" | "warn" | "error", payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    route: ROUTE,
    ts: new Date().toISOString(),
    ...payload,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

type BookArgs = {
  name: string;
  phone: string;
  slot_date: string; // YYYY-MM-DD
  slot_time: string; // HH:MM
  service: string;
};

function parseArgs(raw: Record<string, unknown>): BookArgs | { error: string } {
  const name = String(raw.name ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const slot_date = String(raw.slot_date ?? "").trim();
  const slot_time = String(raw.slot_time ?? "").trim();
  const service = String(raw.service ?? "").trim();

  if (!name) return { error: "missing_name" };
  if (!phone) return { error: "missing_phone" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slot_date)) return { error: "invalid_slot_date" };
  if (!/^\d{1,2}:\d{2}$/.test(slot_time)) return { error: "invalid_slot_time" };
  if (!service) return { error: "missing_service" };
  if (!isSalonService(service)) return { error: "unknown_service" };

  return { name, phone, slot_date, slot_time, service };
}

async function handle(raw: Record<string, unknown>): Promise<Response> {
  const parsed = parseArgs(raw);
  if ("error" in parsed) {
    log("warn", { issue: "validation_failed", error: parsed.error, raw });
    const response = {
      success: false,
      error: parsed.error,
      confirmation_message: "",
    };
    assertNoTemplatePlaceholders(response, "book-appointment:validation");
    return Response.json(response, { status: 400 });
  }

  const { name, phone, slot_date, slot_time, service } = parsed;
  const eventTypeId = serviceToEventTypeId(service as Service);
  const startIso = buildZurichIso(slot_date, slot_time);
  const phoneE164 = normalizePhone(phone);
  const email = `${phoneE164.replace(/^\+/, "")}@${DEMO_EMAIL_DOMAIN}`;

  try {
    const booking = await createBooking({
      eventTypeId,
      start: startIso,
      attendee: {
        name,
        email,
        phoneNumber: phoneE164,
        timeZone: TZ,
        language: "fr",
      },
      metadata: {
        source: "filanor-voice",
        agent: "sophie",
      },
    });

    const confirmation = `Réservation confirmée pour ${frenchDateLong(slot_date)} à ${frenchTime(slot_time)} au nom de ${name}.`;
    const response = {
      success: true,
      booking_id: booking.data?.uid ?? String(booking.data?.id ?? ""),
      confirmation_message: confirmation,
    };
    assertNoTemplatePlaceholders(response, "book-appointment:success");

    log("info", {
      result: "booked",
      service,
      eventTypeId,
      slot_date,
      slot_time,
      booking_id: response.booking_id,
    });
    return Response.json(response);
  } catch (e) {
    if (e instanceof CalcomApiError) {
      const slotTaken = e.isSlotTaken();
      log(slotTaken ? "warn" : "error", {
        result: "calcom_api_error",
        slot_taken: slotTaken,
        status: e.status,
        code: e.body?.error?.code,
        message: e.body?.error?.message,
        slot_date,
        slot_time,
        service,
      });
      const response = {
        success: false,
        error: slotTaken ? "slot_taken" : "calcom_error",
        confirmation_message: "",
      };
      assertNoTemplatePlaceholders(response, "book-appointment:calcom-error");
      return Response.json(response);
    }
    log("error", {
      result: "unexpected_error",
      message: (e as Error).message,
    });
    const response = {
      success: false,
      error: "unexpected_error",
      confirmation_message: "",
    };
    assertNoTemplatePlaceholders(response, "book-appointment:unexpected");
    return Response.json(response, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    log("warn", { issue: "body_parse_failed" });
  }
  const args = (body.args ?? body.arguments ?? body) as Record<string, unknown>;
  return handle(args);
}
