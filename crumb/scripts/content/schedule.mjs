// Extends the published schedule so editions always exist well ahead of today.
// Past and already-scheduled days are never changed, so the archive stays stable.
//
// Usage: node scripts/content/schedule.mjs [--days 21] [--from YYYY-MM-DD]
import { join } from "node:path";
import {
  CONTENT, PERIODS, TOPICS_PER_EDITION, addDays, daysBetween, israelToday, loadSchedule, loadTopics, readJson, saveSchedule,
} from "./lib.mjs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const AHEAD = Number(arg("days", 21));
const FROM = arg("from", israelToday());
// A topic is not shown again for this many days once the library is large enough.
const MIN_GAP = 45;
const MAX_PER_KIND = 3;

// Only published topics: pipeline drafts wait until the independent check passes them.
const topics = loadTopics().filter((t) => !(t.origin === "pipeline" && t.status === "draft"));

const days = loadSchedule();
const titles = readJson(join(CONTENT, "titles.json"));

// Last date each topic appeared, and last date it carried an edition's quiz.
const lastShown = {};
const lastQuiz = {};
for (const [date, day] of Object.entries(days).sort()) {
  for (const p of PERIODS) {
    if (!day[p]) continue;
    for (const id of day[p].topics) lastShown[id] = date;
    if (day[p].quiz) lastQuiz[day[p].quiz] = date;
  }
}

// Deterministic pseudo-random tie-breaker per date, so reruns produce the same schedule.
function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

function pickEdition(date, period, usedToday) {
  const candidates = topics.filter((t) => !usedToday.has(t.id));
  const score = (t, picked) => {
    const last = lastShown[t.id];
    const age = last ? daysBetween(last, date) : 10000; // never shown = most wanted
    let s = Math.min(age, 400);
    if (last && age < MIN_GAP) s -= 1000; // recently shown: only if nothing else is left
    if (!t.image) s -= 50; // photo still pending: usable, but not first choice
    // Prefer topics connected to what is already in this edition, for a coherent read.
    if (picked.some((p) => p.related.some((r) => r.target === t.id) || t.related.some((r) => r.target === p.id))) s += 30;
    if (picked.filter((p) => p.kind === t.kind).length >= MAX_PER_KIND) s -= 500;
    return s + hash(date + period + t.id) * 5;
  };
  const picked = [];
  while (picked.length < TOPICS_PER_EDITION && picked.length < candidates.length) {
    const best = candidates.filter((t) => !picked.includes(t)).sort((a, b) => score(b, picked) - score(a, picked))[0];
    picked.push(best);
  }
  // The cover needs a photo; move the first topic with one to the front.
  const coverIdx = picked.findIndex((t) => t.image);
  if (coverIdx > 0) picked.unshift(...picked.splice(coverIdx, 1));
  const quizzable = picked.filter((t) => t.quiz);
  const quiz = quizzable.sort((a, b) => (lastQuiz[a.id] ?? "").localeCompare(lastQuiz[b.id] ?? ""))[0];
  for (const t of picked) lastShown[t.id] = date;
  if (quiz) lastQuiz[quiz.id] = date;
  const pool = titles[period];
  const t = pool[Math.floor(hash(date + period) * pool.length)];
  return { title: t.title, subtitle: t.subtitle, topics: picked.map((t) => t.id), ...(quiz ? { quiz: quiz.id } : {}) };
}

let added = 0;
for (let i = 0; i <= AHEAD; i++) {
  const date = addDays(FROM, i);
  if (days[date] && PERIODS.every((p) => days[date][p])) continue;
  const day = days[date] ?? {};
  const used = new Set(PERIODS.flatMap((p) => day[p]?.topics ?? []));
  for (const p of PERIODS) {
    if (day[p]) continue;
    day[p] = pickEdition(date, p, used);
    day[p].topics.forEach((id) => used.add(id));
  }
  days[date] = day;
  added++;
}
saveSchedule(days);
const fresh = topics.filter((t) => !lastShown[t.id]).length;
console.log(`schedule: added ${added} day(s) through ${addDays(FROM, AHEAD)}; ${topics.length} topics, ${fresh} never scheduled`);
