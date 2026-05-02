/**
 * scripts/import-twilio-number.mjs
 *
 * Importe le numéro Twilio +41 21 539 13 91 dans Retell via SIP Trunking.
 * Cf. ADR-015 — Pattern Retell call_inbound webhook + SIP Trunking Twilio.
 *
 * POST https://api.retellai.com/import-phone-number avec body :
 *   {
 *     phone_number,
 *     termination_uri,
 *     inbound_agents: [{ agent_id, weight }],
 *     inbound_webhook_url,
 *     sip_trunk_auth_username,
 *     sip_trunk_auth_password,
 *     nickname
 *   }
 *
 * Pré-requis avant exécution (étape SIP côté Filip — guide session 4) :
 *   - Elastic SIP Trunk créé côté Twilio dashboard
 *   - Origination URI du trunk = sip:sip.retellai.com
 *   - Termination URI Twilio renseignée dans .env.local TWILIO_SIP_TRUNK_TERMINATION_URI
 *   - Credentials renseignées dans TWILIO_SIP_TRUNK_AUTH_USERNAME / _PASSWORD
 *   - +41 21 539 13 91 assigné au SIP trunk côté Twilio
 *
 * Usage :
 *   node --env-file=.env.local scripts/import-twilio-number.mjs
 */

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const RETELL_AGENT_ID_SALON = process.env.RETELL_AGENT_ID_SALON;
const PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER_DEMO;
const TERMINATION_URI = process.env.TWILIO_SIP_TRUNK_TERMINATION_URI;
const SIP_AUTH_USERNAME = process.env.TWILIO_SIP_TRUNK_AUTH_USERNAME;
const SIP_AUTH_PASSWORD = process.env.TWILIO_SIP_TRUNK_AUTH_PASSWORD;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!RETELL_API_KEY || !RETELL_API_KEY.startsWith("key_")) {
  fail("RETELL_API_KEY missing or malformed.");
}
if (!RETELL_AGENT_ID_SALON || !RETELL_AGENT_ID_SALON.startsWith("agent_")) {
  fail("RETELL_AGENT_ID_SALON missing or malformed.");
}
if (!PHONE_NUMBER || !PHONE_NUMBER.startsWith("+")) {
  fail("TWILIO_PHONE_NUMBER_DEMO missing (E.164 format expected, e.g. +41215391391).");
}
if (!TERMINATION_URI || !TERMINATION_URI.includes(".pstn.twilio.com")) {
  fail("TWILIO_SIP_TRUNK_TERMINATION_URI missing — Filip must create the SIP trunk côté Twilio dashboard (cf. guide session 4) and paste it here.");
}
if (!SIP_AUTH_USERNAME) {
  fail("TWILIO_SIP_TRUNK_AUTH_USERNAME missing.");
}
if (!SIP_AUTH_PASSWORD) {
  fail("TWILIO_SIP_TRUNK_AUTH_PASSWORD missing.");
}
if (!APP_URL || !APP_URL.startsWith("https://")) {
  fail("NEXT_PUBLIC_APP_URL missing or malformed.");
}

const inboundWebhookUrl = `${APP_URL}/api/retell/inbound-webhook`;

const body = {
  phone_number: PHONE_NUMBER,
  termination_uri: TERMINATION_URI,
  inbound_agents: [{ agent_id: RETELL_AGENT_ID_SALON, weight: 1 }],
  inbound_webhook_url: inboundWebhookUrl,
  sip_trunk_auth_username: SIP_AUTH_USERNAME,
  sip_trunk_auth_password: SIP_AUTH_PASSWORD,
  nickname: "Filanor Demo - Sophie - Hair In The City",
};

console.log("[1/2] Importing phone number into Retell:");
console.log(`  phone_number       : ${PHONE_NUMBER}`);
console.log(`  termination_uri    : ${TERMINATION_URI}`);
console.log(`  inbound_agent_id   : ${RETELL_AGENT_ID_SALON}`);
console.log(`  inbound_webhook_url: ${inboundWebhookUrl}`);
console.log("");

const r = await fetch("https://api.retellai.com/import-phone-number", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RETELL_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await r.text();
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = text;
}

if (r.status === 201 || r.status === 200) {
  console.log(`[2/2] Imported successfully (HTTP ${r.status}):`);
  console.log(JSON.stringify(parsed, null, 2));
  console.log("");
  console.log("Next: Filip composes +41215391391 from his iPhone, Retell routes via SIP, our inbound-webhook injects HitC dynamic_variables, Sophie picks up.");
  process.exit(0);
}

if (r.status === 409 || (typeof parsed === "object" && parsed?.error_code === "phone_number_already_exists")) {
  console.error(`[2/2] Number already imported (HTTP ${r.status}). Falling back to PATCH /update-phone-number…`);
  const updateBody = {
    inbound_agents: body.inbound_agents,
    inbound_webhook_url: body.inbound_webhook_url,
    nickname: body.nickname,
  };
  const r2 = await fetch(
    `https://api.retellai.com/update-phone-number/${encodeURIComponent(PHONE_NUMBER)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    },
  );
  const text2 = await r2.text();
  if (!r2.ok) {
    console.error(`update-phone-number failed (HTTP ${r2.status}):`);
    console.error(text2);
    process.exit(1);
  }
  console.log(`PATCH OK (HTTP ${r2.status}): ${text2.slice(0, 400)}`);
  process.exit(0);
}

console.error(`[2/2] Import failed (HTTP ${r.status}):`);
console.error(JSON.stringify(parsed, null, 2));
process.exit(1);
