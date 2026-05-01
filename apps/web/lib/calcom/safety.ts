// Garde-fou anti-régression : aucune string {{placeholder}} ne doit fuiter
// dans une réponse JSON sortante vers le LLM Retell. Sophie dirait
// littéralement "Bonjour {{tenant_name}}" sinon, comme le 25/04.
//
// Inspecté côté serveur juste avant Response.json(). Throw Error → la route
// renvoie 500, ce qui est PRÉFÉRABLE à laisser un placeholder partir.

const TEMPLATE_RE = /\{\{[^}]+\}\}/g;

export function assertNoTemplatePlaceholders(
  payload: unknown,
  context: string,
): void {
  const blob = JSON.stringify(payload);
  const matches = blob.match(TEMPLATE_RE);
  if (matches && matches.length > 0) {
    console.warn(
      JSON.stringify({
        level: "warn",
        placeholder_leak: true,
        context,
        placeholders: matches,
        ts: new Date().toISOString(),
      }),
    );
    throw new Error(
      `Template placeholder leaked in ${context}: ${matches.join(", ")}`,
    );
  }
}
