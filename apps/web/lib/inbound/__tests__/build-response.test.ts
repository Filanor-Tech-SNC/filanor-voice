import { describe, it, expect } from "vitest";
import { buildInboundResponse } from "../build-response";

const VALID_PAYLOAD = {
  event: "call_inbound",
  call_inbound: {
    agent_id: "agent_50ee299b737045e8eb753fd44a",
    agent_version: 1,
    from_number: "+41788881122",
    to_number: "+41215391391",
  },
};

describe("buildInboundResponse", () => {
  it("Cas 1 — payload valide pour Hair In The City : retourne 10 dynamic_variables", () => {
    const r = buildInboundResponse(VALID_PAYLOAD);
    expect(r.ok).toBe(true);
    if (!r.ok) return; // narrowing
    expect(r.response.call_inbound).toBeTruthy();
    const dv = r.response.call_inbound.dynamic_variables;
    expect(dv.tenant_name).toBe("Hair In The City");
    expect(dv.agent_persona).toBe("Sophie");
    expect(dv.agent_gender).toBe("féminine");
    expect(dv.tenant_type).toBe("salon de coiffure");
    expect(Object.keys(dv).length).toBe(10);
    expect(r.tenant_name).toBe("Hair In The City");
    expect(r.from_number).toBe("+41788881122");
  });

  it("Cas 2 — to_number inconnu : 404 tenant_not_found", () => {
    const r = buildInboundResponse({
      event: "call_inbound",
      call_inbound: { to_number: "+41229990000", from_number: "+41788881122" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(404);
    expect(r.error).toBe("tenant_not_found");
    expect(r.to_number).toBe("+41229990000");
  });

  it("Cas 3a — payload sans wrapper event:'call_inbound' : 400", () => {
    const r = buildInboundResponse({
      call_inbound: { to_number: "+41215391391" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).toBe("expected_call_inbound");
  });

  it("Cas 3b — payload sans bloc call_inbound : 400", () => {
    const r = buildInboundResponse({ event: "call_inbound" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).toBe("missing_call_inbound");
  });

  it("Cas 3c — payload sans to_number : 400", () => {
    const r = buildInboundResponse({
      event: "call_inbound",
      call_inbound: { from_number: "+41788881122" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.error).toBe("missing_to_number");
  });

  it("Cas 3d — body non-objet (string, null) : 400", () => {
    expect(buildInboundResponse(null).ok).toBe(false);
    expect(buildInboundResponse("string").ok).toBe(false);
    expect(buildInboundResponse(42).ok).toBe(false);
  });

  it("Cas 4 — anti-régression : aucun {{placeholder}} dans la réponse", () => {
    const r = buildInboundResponse(VALID_PAYLOAD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const blob = JSON.stringify(r.response);
    expect(blob).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
