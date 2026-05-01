// Parse une fenêtre temporelle en français naturel ("samedi", "vendredi matin",
// "cette semaine", "demain") vers un range { start, end } ISO 8601 utilisable
// par GET /v2/slots de Cal.com.
//
// Convention Cal.com : start/end en ISO, et timeZone passée séparément contrôle
// le formatage des slots retournés. Pour le range on utilise UTC midnight côté
// serveur et on laisse Cal.com filtrer selon son schedule en Europe/Zurich.
//
// On NE filtre PAS matin/après-midi ici — c'est le job de pickRealisticSlots
// qui s'appuie sur detectDaypart() exporté ci-dessous.

export const TZ = "Europe/Zurich";

const DOW_FR: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

export function parseWindow(
  window: string,
  today: Date,
): { start: string; end: string } {
  const w = window.toLowerCase().trim();

  if (!w || w.includes("semaine") || w.includes("bientôt") || w.includes("prochainement")) {
    return rangeForDays(today, 0, 7);
  }

  if (w.includes("après-demain") || w.includes("apres-demain")) {
    return rangeForDays(today, 2, 3);
  }

  if (w.includes("demain")) {
    return rangeForDays(today, 1, 2);
  }

  if (w.includes("aujourd'hui") || w.includes("aujourdhui") || w.includes("ce soir")) {
    return rangeForDays(today, 0, 1);
  }

  for (const [name, dow] of Object.entries(DOW_FR)) {
    if (w.includes(name)) {
      const target = nextOccurrence(dow, today);
      const startBase = new Date(today);
      startBase.setUTCHours(0, 0, 0, 0);
      const offsetDays = Math.round(
        (target.getTime() - startBase.getTime()) / (24 * 3600 * 1000),
      );
      return rangeForDays(today, offsetDays, offsetDays + 1);
    }
  }

  return rangeForDays(today, 0, 7);
}

export function detectDaypart(window: string): "morning" | "afternoon" | "any" {
  const w = window.toLowerCase();
  if (w.includes("matin") || w.includes("matinée")) return "morning";
  if (
    w.includes("après-midi") ||
    w.includes("apres-midi") ||
    w.includes("aprem") ||
    w.includes("soir")
  ) {
    return "afternoon";
  }
  return "any";
}

function rangeForDays(
  today: Date,
  fromDelta: number,
  toDelta: number,
): { start: string; end: string } {
  const start = new Date(today);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + fromDelta);
  const end = new Date(today);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + toDelta);
  return { start: start.toISOString(), end: end.toISOString() };
}

function nextOccurrence(targetDow: number, fromDate: Date): Date {
  const out = new Date(fromDate);
  out.setUTCHours(0, 0, 0, 0);
  let delta = (targetDow - out.getUTCDay() + 7) % 7;
  if (delta === 0) delta = 7; // strictement après today (cohérent avec mock précédent)
  out.setUTCDate(out.getUTCDate() + delta);
  return out;
}
