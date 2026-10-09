import { editions, periods } from "../data/editions";
import type { Period } from "../types";

/** One published edition: a calendar day plus a daypart. */
export interface Slot {
  date: string; // YYYY-MM-DD in local time
  period: Period;
}

/** The magazine's first day. Nothing exists before it, so the archive starts here. */
export const LAUNCH_DATE = "2026-10-09";

/** How many recent days the archive lists. */
export const ARCHIVE_DAYS = 60;

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

export const slotKey = (s: Slot) => `${s.date}:${s.period}`;

export function parseSlot(key: string | null): Slot | null {
  if (!key) return null;
  const [date, period] = key.split(":");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return null;
  if (!periods.includes(period as Period)) return null;
  return { date, period: period as Period };
}

export const sameSlot = (a: Slot, b: Slot) => a.date === b.date && a.period === b.period;

/** The newest edition published at `now`. Before 08:00 that is the previous evening. */
export function currentSlot(now: Date): Slot {
  const hour = now.getHours();
  const today = dateKey(now);
  if (hour < editions.morning.hour) {
    const yesterday = addDays(today, -1);
    // On launch day there is no "previous evening" yet; the first edition is the launch morning.
    return yesterday < LAUNCH_DATE ? { date: LAUNCH_DATE, period: "morning" } : { date: yesterday, period: "evening" };
  }
  if (today < LAUNCH_DATE) return { date: LAUNCH_DATE, period: "morning" };
  const period = [...periods].reverse().find((p) => hour >= editions[p].hour)!;
  return { date: today, period };
}

function order(s: Slot): number {
  return parseDateKey(s.date).getTime() + periods.indexOf(s.period);
}

export function isPublished(s: Slot, now: Date): boolean {
  return order(s) <= order(currentSlot(now));
}

/** True when the slot is published, on or after launch, and within the archive window. */
export function isAvailable(s: Slot, now: Date): boolean {
  if (!isPublished(s, now) || s.date < LAUNCH_DATE) return false;
  const oldest = addDays(dateKey(now), -(ARCHIVE_DAYS - 1));
  return s.date >= oldest;
}

/** Archive days, newest first, each with its three dayparts. */
export function archiveDays(now: Date): { date: string; slots: { slot: Slot; published: boolean }[] }[] {
  const today = currentSlot(now).date;
  const days = Math.max(1, Math.min(ARCHIVE_DAYS, daysSinceLaunch(today) + 1));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -i);
    return {
      date,
      slots: periods.map((period) => {
        const slot = { date, period };
        return { slot, published: isPublished(slot, now) };
      }),
    };
  });
}

export function relativeDayLabel(date: string, now: Date): string | null {
  const today = dateKey(now);
  if (date === today) return "היום";
  if (date === addDays(today, -1)) return "אתמול";
  return null;
}

function daysSinceLaunch(date: string): number {
  return Math.round((parseDateKey(date).getTime() - parseDateKey(LAUNCH_DATE).getTime()) / 86400000);
}
