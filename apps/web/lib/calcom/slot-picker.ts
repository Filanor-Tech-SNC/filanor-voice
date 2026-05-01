import type { CalcomSlotsResponse, PresentableSlot } from "./types";
import { TZ, detectDaypart } from "./window-parser";

const DAY_NAMES_FR = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

// Convertit la response brute Cal.com en liste plate, sortée par instant ASC.
// L'heure est formatée en TZ Europe/Zurich quel que soit l'offset reçu.
export function flattenCalcomSlots(
  resp: CalcomSlotsResponse,
  durationMin: number,
): PresentableSlot[] {
  const out: PresentableSlot[] = [];
  for (const [dateKey, slots] of Object.entries(resp.data ?? {})) {
    for (const s of slots) {
      const d = new Date(s.start);
      out.push({
        date: dateKey,
        day: dayNameFromDateKey(dateKey),
        time: formatTimeZurich(d),
        duration_min: durationMin,
      });
    }
  }
  out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return out;
}

// Pioche 2-3 slots variés. Fonction PURE (entrées explicites, pas d'I/O).
//
// Règles (cf. constraint A) :
// - 0 input → []
// - "matin" / "après-midi" / "soir" dans window → uniquement le daypart
// - sinon : 1 matin + 1 ou 2 après-midi
// - jamais 2 retenus à moins de 60 min d'écart (anti-effet "salon vide
//   qui propose 10h, 10h30, 11h, 11h30")
// - max 3 sortie
export function pickRealisticSlots(
  allSlots: PresentableSlot[],
  window: string,
): PresentableSlot[] {
  if (allSlots.length === 0) return [];
  const daypart = detectDaypart(window);
  const morning = allSlots.filter((s) => parseHour(s.time) < 12);
  const afternoon = allSlots.filter((s) => parseHour(s.time) >= 12);

  const candidates: PresentableSlot[] =
    daypart === "morning"
      ? takeWithGap(morning, 60, 3)
      : daypart === "afternoon"
        ? takeWithGap(afternoon, 60, 3)
        : interleave(morning, afternoon);

  return candidates.slice(0, 3);
}

// 1 morning au début + 1 ou 2 afternoon en milieu/fin, espacés ≥ 60 min.
function interleave(
  morning: PresentableSlot[],
  afternoon: PresentableSlot[],
): PresentableSlot[] {
  const out: PresentableSlot[] = [];
  if (morning[0]) out.push(morning[0]);

  if (afternoon.length === 1) {
    out.push(afternoon[0]);
  } else if (afternoon.length >= 2) {
    out.push(afternoon[0]);
    const last = afternoon[afternoon.length - 1];
    if (slotInstantMs(last) - slotInstantMs(afternoon[0]) >= 60 * 60_000) {
      out.push(last);
    }
  }

  // Filtre supplémentaire : si les retenus se touchent (< 60 min), on déduplique.
  return takeWithGap(out, 60, 3);
}

function takeWithGap(
  slots: PresentableSlot[],
  gapMin: number,
  max: number,
): PresentableSlot[] {
  const out: PresentableSlot[] = [];
  let lastMs: number | null = null;
  for (const s of slots) {
    const t = slotInstantMs(s);
    if (lastMs === null || t - lastMs >= gapMin * 60_000) {
      out.push(s);
      lastMs = t;
      if (out.length >= max) break;
    }
  }
  return out;
}

function parseHour(time: string): number {
  return Number.parseInt(time.split(":")[0] ?? "0", 10);
}

function slotInstantMs(s: PresentableSlot): number {
  // Approximation suffisante pour les écarts intra-journée :
  // on traite l'heure comme UTC. La TZ ne change pas l'écart en minutes.
  const ms = Date.parse(`${s.date}T${s.time}:00Z`);
  return Number.isFinite(ms) ? ms : 0;
}

function formatTimeZurich(d: Date): string {
  const parts = new Intl.DateTimeFormat("fr-CH", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

function dayNameFromDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return DAY_NAMES_FR[dow] ?? "";
}
