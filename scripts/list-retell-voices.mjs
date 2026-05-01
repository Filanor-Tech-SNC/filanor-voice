/**
 * scripts/list-retell-voices.mjs
 *
 * List all Retell voices, filter by gender + language, dump in a readable form.
 *
 * Usage:
 *   node --env-file=.env.local scripts/list-retell-voices.mjs
 *   node --env-file=.env.local scripts/list-retell-voices.mjs --raw   # full JSON dump
 */

const RETELL_API_KEY = process.env.RETELL_API_KEY;
if (!RETELL_API_KEY) {
  console.error("RETELL_API_KEY missing");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const raw = args.has("--raw");

const r = await fetch("https://api.retellai.com/list-voices", {
  headers: { Authorization: `Bearer ${RETELL_API_KEY}` },
});
if (!r.ok) {
  console.error("HTTP", r.status, await r.text());
  process.exit(1);
}
const data = await r.json();
const voices = Array.isArray(data) ? data : data.voices || [];
console.error(`Total voices returned: ${voices.length}`);

if (raw) {
  console.log(JSON.stringify(voices, null, 2));
  process.exit(0);
}

function isFrench(v) {
  const blob = JSON.stringify(v).toLowerCase();
  return (
    blob.includes("french") ||
    blob.includes('"fr-fr"') ||
    blob.includes('"fr"') ||
    blob.includes('"language":"fr')
  );
}

function isFemale(v) {
  return (v.gender || "").toLowerCase() === "female";
}

function isMultilingual(v) {
  const blob = JSON.stringify(v).toLowerCase();
  return blob.includes("multilingual") || blob.includes("multi");
}

const frFemale = voices.filter((v) => isFemale(v) && isFrench(v));
const multiFemale = voices.filter(
  (v) => isFemale(v) && !isFrench(v) && isMultilingual(v),
);

function fmt(v) {
  return [
    `voice_id      : ${v.voice_id}`,
    `voice_name    : ${v.voice_name || "?"}`,
    `provider      : ${v.provider || "?"}`,
    `gender        : ${v.gender || "?"}`,
    `accent        : ${v.accent || "?"}`,
    `age           : ${v.age || "?"}`,
    `language      : ${
      Array.isArray(v.language) ? v.language.join(",") : v.language || "?"
    }`,
    `preview_audio : ${v.preview_audio_url || "?"}`,
    `extras        : ${JSON.stringify(
      Object.fromEntries(
        Object.entries(v).filter(
          ([k]) =>
            ![
              "voice_id",
              "voice_name",
              "provider",
              "gender",
              "accent",
              "age",
              "language",
              "preview_audio_url",
            ].includes(k),
        ),
      ),
    )}`,
  ].join("\n  ");
}

console.log("\n=== FRENCH FEMALE VOICES (tagged French) ===");
console.log(`Count: ${frFemale.length}`);
for (const v of frFemale) {
  console.log("\n• " + fmt(v));
}

console.log("\n\n=== PROVIDERS / ACCENTS BREAKDOWN ===");
const byProvider = {};
const byAccent = {};
for (const v of voices) {
  byProvider[v.provider || "?"] = (byProvider[v.provider || "?"] || 0) + 1;
  byAccent[v.accent || "?"] = (byAccent[v.accent || "?"] || 0) + 1;
}
console.log("Providers:", JSON.stringify(byProvider, null, 2));
console.log("Accents (top):", JSON.stringify(
  Object.fromEntries(Object.entries(byAccent).sort((a,b) => b[1]-a[1]).slice(0, 20)),
  null, 2
));

console.log("\n\n=== ALL ELEVENLABS / 11LABS FEMALE ===");
const elevenFemale = voices.filter(v =>
  isFemale(v) && /eleven|11labs/i.test(`${v.provider || ""} ${v.voice_id || ""}`)
);
console.log(`Count: ${elevenFemale.length}`);
for (const v of elevenFemale) {
  console.log("\n• " + fmt(v));
}

console.log("\n\n=== ALL CARTESIA FEMALE (non-FR-tagged, may be multilingual) ===");
const cartesiaFemale = voices.filter(v =>
  isFemale(v) && /cartesia/i.test(v.provider || "") && !isFrench(v)
);
console.log(`Count: ${cartesiaFemale.length}`);
for (const v of cartesiaFemale.slice(0, 20)) {
  console.log("\n• " + fmt(v));
}

console.log("\n\n=== RETELL NATIVE FEMALE ===");
const retellNativeFemale = voices.filter(v =>
  isFemale(v) && /retell/i.test(v.provider || "")
);
console.log(`Count: ${retellNativeFemale.length}`);
for (const v of retellNativeFemale.slice(0, 20)) {
  console.log("\n• " + fmt(v));
}
