import { CalcomApiError, getSlots } from "@/lib/calcom/client";
import {
  DEFAULT_SALON_SERVICE,
  isSalonService,
  serviceDurationMin,
  serviceToEventTypeId,
} from "@/lib/calcom/mapping";
import { assertNoTemplatePlaceholders } from "@/lib/calcom/safety";
import {
  flattenCalcomSlots,
  pickRealisticSlots,
} from "@/lib/calcom/slot-picker";
import type { Service } from "@/lib/calcom/types";
import { parseWindow } from "@/lib/calcom/window-parser";

const ROUTE = "/api/retell/functions/check-availability";

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

// Best-effort mapping d'un service "humain" vers nos slugs Cal.com.
// Si on ne reconnaît pas, on tombe sur le default salon.
function resolveService(input: string): Service {
  const t = input.toLowerCase().trim();
  if (!t) return DEFAULT_SALON_SERVICE;
  if (isSalonService(t)) return t;
  if (t.includes("homme")) return "coupe-homme";
  if (t.includes("femme")) return "coupe-femme";
  if (t.includes("coul") || t.includes("color")) return "coloration";
  if (
    t.includes("balay") ||
    t.includes("mèche") ||
    t.includes("meche") ||
    t.includes("highlight")
  ) {
    return "balayage";
  }
  if (t.includes("coupe")) return "coupe-femme";
  return DEFAULT_SALON_SERVICE;
}

async function handle(window: string, serviceInput: string): Promise<Response> {
  const service = resolveService(serviceInput);
  const eventTypeId = serviceToEventTypeId(service);
  const { start, end } = parseWindow(window, new Date());

  try {
    const slotsResp = await getSlots({
      eventTypeId,
      start,
      end,
      timeZone: "Europe/Zurich",
    });
    const flat = flattenCalcomSlots(slotsResp, serviceDurationMin(service));
    const picked = pickRealisticSlots(flat, window);

    const response = { available_slots: picked };
    assertNoTemplatePlaceholders(response, "check-availability");

    log("info", {
      window,
      service,
      eventTypeId,
      range_start: start,
      range_end: end,
      raw_count: flat.length,
      picked_count: picked.length,
    });

    return Response.json(response);
  } catch (e) {
    if (e instanceof CalcomApiError) {
      log("error", {
        error: "calcom_api",
        window,
        service,
        eventTypeId,
        status: e.status,
        code: e.body?.error?.code,
        message: e.body?.error?.message,
      });
    } else {
      log("error", {
        error: "fetch_failed",
        message: (e as Error).message,
      });
    }
    // Fallback bénin : on rend [] pour que Sophie propose un autre jour
    // au lieu de balancer une erreur cryptique au client.
    const fallback = { available_slots: [] };
    assertNoTemplatePlaceholders(fallback, "check-availability:fallback");
    return Response.json(fallback);
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body vide / non-JSON — on continue avec window="" (fallback "cette semaine")
  }
  const args = (body.args ?? body.arguments ?? {}) as Record<string, unknown>;
  const window = String(args.window ?? "");
  const service = String(args.service ?? "");
  return handle(window, service);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const window = url.searchParams.get("window") ?? "";
  const service = url.searchParams.get("service") ?? "";
  return handle(window, service);
}
