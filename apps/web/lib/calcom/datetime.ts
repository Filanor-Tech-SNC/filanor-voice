// Helpers datetime pour Cal.com.
// On évite date-fns-tz / luxon pour ne pas alourdir le bundle ; les besoins
// sont limités (offset Zurich CET/CEST + format français lisible).

const TZ = "Europe/Zurich";

// Construit un ISO 8601 avec offset Zurich pour une date+heure perçue par
// l'utilisateur (ex: slot_date="2026-05-09", slot_time="15:00" → "2026-05-09T15:00:00.000+02:00").
// Robuste DST : on probe l'offset Zurich pour la date donnée via Intl.
export function buildZurichIso(date: string, time: string): string {
  const probe = new Date(`${date}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const tzn = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const offset = tzn.replace("GMT", "") || "+01:00";
  return `${date}T${time}:00.000${offset}`;
}

// Format date YYYY-MM-DD en "samedi 9 mai" (sans année, ton parlé).
export function frenchDateLong(date: string): string {
  const [y, m, d] = date.split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !d) return date;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("fr-CH", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dt);
}

// "15:00" → "15h00", "09:30" → "9h30"
export function frenchTime(time: string): string {
  const [h, m] = time.split(":");
  if (!h || !m) return time;
  return `${Number.parseInt(h, 10)}h${m}`;
}

// Normalise un numéro de téléphone : "+41 78 123 45 67" → "+41781234567".
// Conserve le + initial s'il existe.
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}
