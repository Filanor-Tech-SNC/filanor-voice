// Logique pure du webhook Retell `call_inbound`.
// Cf. ADR-015 — Pattern moderne 2026 : Retell POST `event:"call_inbound"` au
// `inbound_webhook_url` configuré sur le PHONE NUMBER (pas l'agent), notre
// réponse `{call_inbound:{dynamic_variables:{...}}}` injecte les variables
// du tenant identifié par to_number.
//
// Fonction PURE (pas d'I/O, pas de Date.now), testable en isolation.

import { HAIR_IN_THE_CITY, type TenantConfig } from "@/lib/tenants/hair-in-the-city";

// MOCK — remplacer par un lookup Supabase en S5+.
const TENANT_BY_NUMBER: Record<string, TenantConfig> = {
  "+41215391391": HAIR_IN_THE_CITY,
};

export type InboundOk = {
  ok: true;
  to_number: string;
  from_number: string;
  tenant_name: string;
  response: {
    call_inbound: {
      dynamic_variables: TenantConfig;
    };
  };
};

export type InboundFail = {
  ok: false;
  status: number;
  error: string;
  to_number?: string;
};

export type InboundResult = InboundOk | InboundFail;

export function buildInboundResponse(body: unknown): InboundResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "invalid_body" };
  }
  const obj = body as Record<string, unknown>;

  if (obj.event !== "call_inbound") {
    return { ok: false, status: 400, error: "expected_call_inbound" };
  }

  const callInbound = obj.call_inbound;
  if (typeof callInbound !== "object" || callInbound === null) {
    return { ok: false, status: 400, error: "missing_call_inbound" };
  }

  const ci = callInbound as Record<string, unknown>;
  const toNumber = String(ci.to_number ?? "").trim();
  const fromNumber = String(ci.from_number ?? "").trim();

  if (!toNumber) {
    return { ok: false, status: 400, error: "missing_to_number" };
  }

  const tenant = TENANT_BY_NUMBER[toNumber];
  if (!tenant) {
    return {
      ok: false,
      status: 404,
      error: "tenant_not_found",
      to_number: toNumber,
    };
  }

  return {
    ok: true,
    to_number: toNumber,
    from_number: fromNumber,
    tenant_name: tenant.tenant_name,
    response: {
      call_inbound: {
        dynamic_variables: { ...tenant },
      },
    },
  };
}
