// ⚠️ DEPRECATED — Cf. ADR-015 (2026-05-01).
// Cet endpoint répondait à l'ancien webhook Retell `retrieve_dynamic_variables_url`,
// retiré côté Retell. Le pattern moderne 2026 vit dans
// /api/retell/inbound-webhook/route.ts (event:"call_inbound" + wrapper réponse
// `{call_inbound:{dynamic_variables:...}}`).
// Cette route est conservée pour rollback éventuel + compatibilité Web Calls
// dashboard Retell qui peut consommer l'ancien shape via le panel Test Audio.
// Multi-tenant Supabase : à câbler en S5+, tenant lookup actuellement hardcodé.

import { HAIR_IN_THE_CITY } from "@/lib/tenants/hair-in-the-city";

const DYNAMIC_VARIABLES = HAIR_IN_THE_CITY;

function logHit(method: string, request: Request): void {
  console.log(
    JSON.stringify({
      level: "info",
      route: "/api/retell/dynamic-variables",
      method,
      tenant: DYNAMIC_VARIABLES.tenant_name,
      ts: new Date().toISOString(),
      ua: request.headers.get("user-agent"),
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  logHit("POST", request);
  return Response.json({ dynamic_variables: DYNAMIC_VARIABLES });
}

export async function GET(request: Request): Promise<Response> {
  logHit("GET", request);
  return Response.json({ dynamic_variables: DYNAMIC_VARIABLES });
}
