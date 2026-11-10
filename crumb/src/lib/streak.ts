import { addDays, dateKey } from "./schedule";

export interface Streak {
  /** Active days in the current run, counting today if the reader already did something. */
  count: number;
  /** True once the reader read, answered or played today. */
  today: boolean;
  /** Days skipped inside the run that were forgiven. */
  forgiven: number;
}

/**
 * A streak that bends rather than breaks: a single missed day is forgiven, at most once in any
 * seven days. Losing a long run to one busy day makes people quit; this keeps the run honest
 * (two days in a row off still ends it) without punishing an ordinary life.
 */
export function computeStreak(days: string[], now: Date): Streak {
  const active = new Set(days);
  const today = dateKey(now);
  const doneToday = active.has(today);
  // An unfinished today does not break the run yet: start counting from yesterday.
  let cursor = doneToday ? today : addDays(today, -1);
  let count = 0;
  let forgiven = 0;
  let lastForgiveAt: number | null = null;
  let walked = 0;
  for (;;) {
    if (active.has(cursor)) {
      count++;
    } else {
      const prev = addDays(cursor, -1);
      // Before today's first read, yesterday's gap can still be forgiven by reading today.
      const canForgive = (count > 0 || !doneToday) && active.has(prev) && (lastForgiveAt === null || walked - lastForgiveAt >= 7);
      if (!canForgive) break;
      forgiven++;
      lastForgiveAt = walked;
    }
    cursor = addDays(cursor, -1);
    walked++;
    if (walked > 800) break;
  }
  return { count, today: doneToday, forgiven };
}

/** Milestones worth a small celebration. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
