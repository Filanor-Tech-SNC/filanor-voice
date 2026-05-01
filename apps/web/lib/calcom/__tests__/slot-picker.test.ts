import { describe, it, expect } from "vitest";
import { pickRealisticSlots } from "../slot-picker";
import type { PresentableSlot } from "../types";

function slot(
  time: string,
  date = "2026-05-04",
  day = "lundi",
): PresentableSlot {
  return { date, day, time, duration_min: 60 };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => Number.parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

describe("pickRealisticSlots", () => {
  it("returns [] for empty input", () => {
    expect(pickRealisticSlots([], "samedi")).toEqual([]);
  });

  it("returns single slot when only one available", () => {
    const out = pickRealisticSlots([slot("10:00")], "lundi");
    expect(out).toHaveLength(1);
    expect(out[0].time).toBe("10:00");
  });

  it("caps at 3 slots even with 20+ available, all spaced >= 60 min", () => {
    const all: PresentableSlot[] = [];
    for (let h = 9; h < 19; h++) {
      all.push(slot(`${String(h).padStart(2, "0")}:00`));
      all.push(slot(`${String(h).padStart(2, "0")}:30`));
    }
    const out = pickRealisticSlots(all, "lundi");
    expect(out.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < out.length; i++) {
      const gap = timeToMinutes(out[i].time) - timeToMinutes(out[i - 1].time);
      expect(gap).toBeGreaterThanOrEqual(60);
    }
  });

  it("returns only morning slots when window mentions 'matin'", () => {
    const all = [
      slot("09:00"),
      slot("10:00"),
      slot("11:00"),
      slot("14:00"),
      slot("15:00"),
      slot("16:00"),
    ];
    const out = pickRealisticSlots(all, "samedi matin");
    expect(out.length).toBeGreaterThan(0);
    expect(
      out.every((s) => Number.parseInt(s.time.split(":")[0], 10) < 12),
    ).toBe(true);
  });

  it("returns only afternoon slots when window mentions 'après-midi'", () => {
    const all = [
      slot("09:00"),
      slot("10:00"),
      slot("14:00"),
      slot("15:00"),
      slot("16:00"),
    ];
    const out = pickRealisticSlots(all, "samedi après-midi");
    expect(out.length).toBeGreaterThan(0);
    expect(
      out.every((s) => Number.parseInt(s.time.split(":")[0], 10) >= 12),
    ).toBe(true);
  });

  it("interleaves 1 morning + afternoon for vague window", () => {
    const all = [
      slot("09:00"),
      slot("10:00"),
      slot("11:00"),
      slot("14:00"),
      slot("15:00"),
      slot("16:00"),
      slot("17:00"),
    ];
    const out = pickRealisticSlots(all, "");
    expect(out.length).toBeLessThanOrEqual(3);
    const hasMorning = out.some(
      (s) => Number.parseInt(s.time.split(":")[0], 10) < 12,
    );
    const hasAfternoon = out.some(
      (s) => Number.parseInt(s.time.split(":")[0], 10) >= 12,
    );
    expect(hasMorning).toBe(true);
    expect(hasAfternoon).toBe(true);
  });

  it("never returns two consecutive 30-min slots (anti 'salon vide')", () => {
    const all = [slot("10:00"), slot("10:30"), slot("11:00"), slot("11:30")];
    const out = pickRealisticSlots(all, "lundi matin");
    for (let i = 1; i < out.length; i++) {
      const gap = timeToMinutes(out[i].time) - timeToMinutes(out[i - 1].time);
      expect(gap).toBeGreaterThanOrEqual(60);
    }
  });
});
