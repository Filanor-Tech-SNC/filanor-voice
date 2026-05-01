/**
 * scripts/create-retell-agent.mjs
 *
 * Compile le system prompt SALON depuis docs/PROMPTS/, sélectionne une voix
 * ElevenLabs Charlotte FR via /list-voices, crée un Retell LLM (gpt-4o-mini)
 * puis un agent qui pointe son retrieve_dynamic_variables_url sur l'endpoint
 * Vercel preview courant.
 *
 * Usage :
 *   node --env-file=.env.local scripts/create-retell-agent.mjs
 *
 * Affiche en stdout les IDs (llm_id, agent_id) à reporter dans .env.local.
 * Aucun secret n'est affiché.
 *
 * TODO (post-MVP) : convertir en .ts via tsx, généraliser aux 2 secteurs
 * (--sector=salon|restaurant), supporter PATCH update.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY || !RETELL_API_KEY.startsWith("key_")) {
  console.error("ERROR: RETELL_API_KEY missing or malformed.");
  console.error("Run with: node --env-file=.env.local scripts/create-retell-agent.mjs");
  process.exit(1);
}

const RETRIEVE_URL =
  process.env.RETRIEVE_DYNAMIC_VARIABLES_URL ||
  "https://filanor-voice-muv8tnbcd-fkuleshov01-cpus-projects.vercel.app/api/retell/dynamic-variables";

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
  if (!m) throw new Error("No fenced block found");
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

console.log(`[1/4] Prompt compilé : ${compiled.length} chars`);

// 2. Sélection voix -----------------------------------------------------------

const voicesResp = await retell("GET", "/list-voices");
const voices = Array.isArray(voicesResp) ? voicesResp : voicesResp.voices || [];
if (!voices.length) {
  console.error("Aucune voix retournée par /list-voices.");
  process.exit(1);
}

function pickVoice(list) {
  const has = (v, s) =>
    [v.voice_name, v.voice_id, v.accent, v.language]
      .filter(Boolean)
      .some((x) => String(x).toLowerCase().includes(s));
  // 1) Charlotte chez ElevenLabs/11labs
  let v = list.find(
    (x) =>
      has(x, "charlotte") &&
      (has(x, "11labs") || has(x, "elevenlabs")),
  );
  if (v) return v;
  // 2) Toute Charlotte
  v = list.find((x) => has(x, "charlotte"));
  if (v) return v;
  // 3) Voix FR féminine ElevenLabs
  v = list.find(
    (x) =>
      (x.gender || "").toLowerCase() === "female" &&
      has(x, "fr") &&
      (has(x, "11labs") || has(x, "elevenlabs")),
  );
  if (v) return v;
  // 4) Première voix FR féminine
  v = list.find(
    (x) => (x.gender || "").toLowerCase() === "female" && has(x, "fr"),
  );
  if (v) return v;
  return null;
}

const voice = pickVoice(voices);
if (!voice) {
  console.error("Aucune voix Charlotte/FR-female trouvée. Aperçu :");
  console.error(
    voices
      .slice(0, 15)
      .map(
        (v) =>
          `  - ${v.voice_id} | ${v.voice_name || "?"} | ${v.gender || "?"} | ${
            v.accent || v.language || "?"
          } | ${v.provider || "?"}`,
      )
      .join("\n"),
  );
  process.exit(1);
}

console.log(
  `[2/4] Voix sélectionnée : ${voice.voice_id} (${
    voice.voice_name || "?"
  }) [${voice.gender || "?"}/${voice.accent || voice.language || "?"}]`,
);

// 3. Create Retell LLM --------------------------------------------------------

const llm = await retell("POST", "/create-retell-llm", {
  model: "gpt-4o-mini",
  general_prompt: compiled,
  general_tools: [
    {
      type: "end_call",
      name: "end_call",
      description: "Met fin à l'appel proprement après confirmation client.",
    },
  ],
});
const llmId = llm.llm_id;
if (!llmId) {
  console.error("Pas de llm_id dans la réponse :", llm);
  process.exit(1);
}
console.log(`[3/4] LLM créé : llm_id=${llmId}`);

// 4. Create agent -------------------------------------------------------------

const agentBody = {
  agent_name: "Sophie - Hair In The City (test)",
  voice_id: voice.voice_id,
  language: "multi",
  response_engine: { type: "retell-llm", llm_id: llmId },
  retrieve_dynamic_variables_url: RETRIEVE_URL,
  data_storage_setting: "basic_attributes_only",
  enable_backchannel: true,
  interruption_sensitivity: 0.8,
  responsiveness: 0.9,
  end_call_after_silence_ms: 30000,
  max_call_duration_ms: 1800000,
};

const agent = await retell("POST", "/create-agent", agentBody);
const agentId = agent.agent_id;
if (!agentId) {
  console.error("Pas de agent_id dans la réponse :", agent);
  process.exit(1);
}
console.log(`[4/4] Agent créé : agent_id=${agentId}`);

// Récap final ----------------------------------------------------------------

console.log("");
console.log("=== À reporter dans .env.local ===");
console.log(`RETELL_LLM_ID_SALON=${llmId}`);
console.log(`RETELL_AGENT_ID_SALON=${agentId}`);
console.log("");
console.log(
  `Test Web Call : https://dashboard.retellai.com/agents/${agentId}`,
);
