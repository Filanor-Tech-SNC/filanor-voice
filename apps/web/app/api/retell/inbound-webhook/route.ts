import { buildInboundResponse } from "@/lib/inbound/build-response";
import { assertNoTemplatePlaceholders } from "@/lib/calcom/safety";

const ROUTE = "/api/retell/inbound-webhook";

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

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    log("warn", { issue: "body_parse_failed" });
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = buildInboundResponse(body);

  if (!result.ok) {
    log("warn", {
      issue: result.error,
      to_number: result.to_number,
      status: result.status,
    });
    const respBody: Record<string, unknown> = { error: result.error };
    if (result.to_number) respBody.to_number = result.to_number;
    return Response.json(respBody, { status: result.status });
  }

  // Garde-fou anti-régression : aucun {{placeholder}} non résolu côté tenant.
  assertNoTemplatePlaceholders(result.response, "inbound-webhook");

  log("info", {
    event: "call_inbound",
    to_number: result.to_number,
    from_number: result.from_number,
    tenant: result.tenant_name,
    dynamic_variables_count: Object.keys(result.response.call_inbound.dynamic_variables).length,
  });

  return Response.json(result.response);
}
