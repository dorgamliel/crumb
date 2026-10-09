// Shared helpers for the content scripts. Plain Node, no dependencies.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONTENT = join(ROOT, "content");
export const TOPICS_DIR = join(CONTENT, "topics");
export const SCHEDULE_DIR = join(CONTENT, "schedule");
export const STATE_DIR = join(CONTENT, "state");
export const PUBLIC_IMG = join(ROOT, "public", "img");

export const PERIODS = ["morning", "afternoon", "evening"];
export const KINDS = ["baking", "science", "ingredients", "dishes", "drinks", "techniques"];
export const RELATION_KINDS = ["process", "explains", "ingredient", "technique", "relative", "affects", "example"];
export const TOPICS_PER_EDITION = 8;

export const readJson = (p, fallback) => {
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, "utf8"));
};

export const writeJson = (p, data) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
};

export function loadTopics() {
  return readdirSync(TOPICS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(join(TOPICS_DIR, f)));
}

/** All scheduled days, merged from the monthly files: { "YYYY-MM-DD": { morning, afternoon, evening } } */
export function loadSchedule() {
  const days = {};
  if (!existsSync(SCHEDULE_DIR)) return days;
  for (const f of readdirSync(SCHEDULE_DIR).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort()) {
    Object.assign(days, readJson(join(SCHEDULE_DIR, f)));
  }
  return days;
}

export function saveSchedule(days) {
  const months = {};
  for (const [date, day] of Object.entries(days).sort()) (months[date.slice(0, 7)] ??= {})[date] = day;
  for (const [m, data] of Object.entries(months)) writeJson(join(SCHEDULE_DIR, `${m}.json`), data);
}

/** Today's date in Israel, as YYYY-MM-DD. */
export function israelToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
}

export function addDays(date, n) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
