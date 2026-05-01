/**
 * scripts/update-retell-agent-prompt.mjs
 *
 * Recompile le system prompt SALON depuis docs/PROMPTS/ et PATCH le Retell LLM
 * existant via /update-retell-llm/{llm_id}. Ne touche ni l'agent, ni la voix,
 * ni le retrieve_dynamic_variables_url. Idempotent.
 *
 * Usage :
 *   node --env-file=.env.local scripts/update-retell-agent-prompt.mjs
 *
 * Lit RETELL_API_KEY + RETELL_LLM_ID_SALON depuis l'env.
 *
 * TODO (post-MVP) : convertir en .ts via tsx, généraliser aux 2 secteurs
 * (--sector=salon|restaurant) une fois SECTOR_RESTAURANT.md / RETELL_LLM_ID_RESTAURANT
 * en place.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_LLM_ID_SALON = process.env.RETELL_LLM_ID_SALON;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!RETELL_API_KEY || !RETELL_API_KEY.startsWith("key_")) {
  console.error("ERROR: RETELL_API_KEY missing or malformed.");
  console.error(
    "Run with: node --env-file=.env.local scripts/update-retell-agent-prompt.mjs",
  );
  process.exit(1);
}

if (!RETELL_LLM_ID_SALON || !RETELL_LLM_ID_SALON.startsWith("llm_")) {
  console.error("ERROR: RETELL_LLM_ID_SALON missing or malformed in .env.local.");
  process.exit(1);
}

if (!APP_URL || !APP_URL.startsWith("https://")) {
  console.error("ERROR: NEXT_PUBLIC_APP_URL missing or malformed in .env.local.");
  process.exit(1);
}

const RETELL_BASE = "https://api.retellai.com";

async function retell(method, path, body) {
  const r = await fetch(`${RETELL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RETELL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) {
    console.error(`Retell ${method} ${path} -> HTTP ${r.status}`);
    console.error(text);
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// 1. Compile prompt -----------------------------------------------------------

const universal = readFileSync(
  resolve(repoRoot, "docs/PROMPTS/SYSTEM_PROMPT_UNIVERSAL.md"),
  "utf8",
);
const sectorSalon = readFileSync(
  resolve(repoRoot, "docs/PROMPTS/SECTOR_SALON.md"),
  "utf8",
);

function extractFirstFencedBlock(md) {
  const m = md.match(/```\s*\n([\s\S]+?)\n```/);
  if (!m) throw new Error("No fenced block found in UNIVERSAL.md");
  return m[1];
}

function extractSectorContext(md) {
  const m = md.match(
    /## `sector_specific_context` — bloc à injecter\s*\n+```\s*\n([\s\S]+?)\n```/,
  );
  if (!m) throw new Error("Sector context block not found in SECTOR_SALON.md");
  return m[1];
}

const tpl = extractFirstFencedBlock(universal);
const sectorContext = extractSectorContext(sectorSalon);

const compiled = tpl
  .replaceAll(
    "{{sector_mission}}",
    "aider la personne à prendre un rendez-vous pour une prestation (coupe, couleur, balayage, soin, etc.)",
  )
  .replaceAll("{{booking_noun}}", "un rendez-vous")
  .replace("{{sector_specific_context}}", sectorContext);

// Sanity check #1 : aucun {{placeholder}} STATIQUE oublié
const leftoverStatic = compiled.match(/\{\{(sector_mission|booking_noun|sector_specific_context)\}\}/g);
if (leftoverStatic) {
  console.error("ERROR: placeholders statiques non remplacés :", leftoverStatic);
  process.exit(1);
}

// Sanity check #2 : les placeholders DYNAMIQUES sont-ils bien INTACTS ?
// Garde-fou contre une interpolation accidentelle Node-side (cf. constraint C).
// Retell substitue ces placeholders au runtime via retell_llm_dynamic_variables
// du panel Test Audio. S'ils ont disparu d'ici, le prompt sera cassé.
const REQUIRED_DYNAMIC_PLACEHOLDERS = [
  "{{tenant_name}}",
  "{{agent_persona}}",
  "{{agent_gender}}",
  "{{tenant_type}}",
];
const missingDynamic = REQUIRED_DYNAMIC_PLACEHOLDERS.filter(
  (ph) => !compiled.includes(ph),
);
if (missingDynamic.length > 0) {
  console.error(
    "ERROR: placeholders dynamiques manquants dans le prompt compilé :",
    missingDynamic,
  );
  console.error(
    "Cela signifie qu'ils ont été interpolés / supprimés par erreur.",
  );
  process.exit(1);
}

console.log(`[1/2] Prompt compilé : ${compiled.length} chars`);

// 2. PATCH le Retell LLM ------------------------------------------------------

const generalTools = [
  {
    type: "end_call",
    name: "end_call",
    description: "Met fin à l'appel proprement après confirmation client.",
  },
  {
    type: "custom",
    name: "check_availability",
    description:
      "Vérifie les créneaux disponibles dans la fenêtre demandée par le client. À APPELER OBLIGATOIREMENT dès que tu connais la fenêtre temporelle (jour ou demi-journée), AVANT toute autre question. Si available_slots revient vide, propose le jour le plus proche disponible.",
    url: `${APP_URL}/api/retell/functions/check-availability`,
    speak_during_execution: false,
    speak_after_execution: true,
    parameters: {
      type: "object",
      properties: {
        window: {
          type: "string",
          description:
            "Fenêtre temporelle demandée par le client en français naturel (ex: 'samedi après-midi', 'mardi matin', 'vendredi', 'cette semaine').",
        },
        service: {
          type: "string",
          enum: ["coupe-femme", "coupe-homme", "coloration", "balayage"],
          description:
            "Prestation demandée par le client. Si elle n'a pas été précisée, demande au client (coupe femme ou homme ?) avant d'appeler la function.",
        },
      },
      required: ["window"],
    },
  },
  {
    type: "custom",
    name: "book_appointment",
    description:
      "À APPELER après que le client a confirmé un créneau précis ET que tu as collecté nom + téléphone. Récupère name, phone, slot_date (YYYY-MM-DD), slot_time (HH:MM Europe/Zurich), service. Ne jamais appeler 2 fois pour le même slot. Si retour success=false avec error='slot_taken', dis 'Désolée, ce créneau vient juste d'être pris' et relance check_availability sur la même fenêtre.",
    url: `${APP_URL}/api/retell/functions/book-appointment`,
    speak_during_execution: true,
    speak_after_execution: true,
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nom complet du client tel qu'il l'a énoncé.",
        },
        phone: {
          type: "string",
          description:
            "Numéro de mobile suisse (format +41... ou 0... — sera normalisé en E.164 côté backend).",
        },
        slot_date: {
          type: "string",
          description:
            "Date du RDV au format YYYY-MM-DD (ex: 2026-05-09 pour samedi 9 mai 2026).",
        },
        slot_time: {
          type: "string",
          description:
            "Heure du RDV au format HH:MM en 24h, heure locale Europe/Zurich (ex: 15:00).",
        },
        service: {
          type: "string",
          enum: ["coupe-femme", "coupe-homme", "coloration", "balayage"],
          description: "Prestation à réserver.",
        },
      },
      required: ["name", "phone", "slot_date", "slot_time", "service"],
    },
  },
];

const updated = await retell(
  "PATCH",
  `/update-retell-llm/${RETELL_LLM_ID_SALON}`,
  {
    general_prompt: compiled,
    general_tools: generalTools,
  },
);

const llmId = updated.llm_id || RETELL_LLM_ID_SALON;
console.log(`[2/2] LLM mis à jour : llm_id=${llmId}`);

console.log("");
console.log("=== Sanity check ===");
console.log(
  `general_prompt length : ${(updated.general_prompt || compiled).length} chars`,
);
console.log(`general_tools count   : ${(updated.general_tools || []).length}`);
console.log(`model                 : ${updated.model || "(unchanged)"}`);
console.log("");
console.log(
  "Test Web Call : ouvrir le dashboard Retell, agent Sophie, bouton 'Test agent in browser'.",
);
