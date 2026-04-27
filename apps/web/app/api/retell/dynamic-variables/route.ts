const DYNAMIC_VARIABLES = {
  agent_persona: "Sophie",
  agent_gender: "féminine",
  tenant_name: "Hair In The City",
  tenant_type: "salon de coiffure",
  tenant_address: "Rue du Bourg 21, 1003 Lausanne",
  language_default: "français",
  opening_hours:
    "Mardi à vendredi 9h-19h, samedi 9h-17h. Fermé dimanche et lundi.",
  services:
    "Coupe femme (45 CHF), coupe homme (30 CHF), balayage (120 CHF), couleur (80 CHF), brushing (35 CHF)",
  praticiens_list: "Julie, Sarah, Amélie",
} as const;

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
