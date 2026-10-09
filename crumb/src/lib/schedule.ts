import { editions, periods } from "../data/editions";
import type { Period } from "../types";

/** One published edition: a calendar day plus a daypart. */
export interface Slot {
  date: string; // YYYY-MM-DD in local time
  period: Period;
}

export const ARCHIVE_DAYS = 7;

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
  if (hour < editions.morning.hour) return { date: addDays(today, -1), period: "evening" };
  const period = [...periods].reverse().find((p) => hour >= editions[p].hour)!;
  return { date: today, period };
}

function order(s: Slot): number {
  return parseDateKey(s.date).getTime() + periods.indexOf(s.period);
}

export function isPublished(s: Slot, now: Date): boolean {
  return order(s) <= order(currentSlot(now));
}

/** True when the slot is within the demo archive window and already published. */
export function isAvailable(s: Slot, now: Date): boolean {
  if (!isPublished(s, now)) return false;
  const oldest = addDays(dateKey(now), -(ARCHIVE_DAYS - 1));
  return s.date >= oldest;
}

/** Archive days, newest first, each with its three dayparts. */
export function archiveDays(now: Date): { date: string; slots: { slot: Slot; published: boolean }[] }[] {
  const today = dateKey(now);
  return Array.from({ length: ARCHIVE_DAYS }, (_, i) => {
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
