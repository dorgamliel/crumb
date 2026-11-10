// Structural checks for content/. Exits non-zero if anything is wrong.
// Usage: node scripts/content/validate.mjs            (whole library + schedule)
//        node scripts/content/validate.mjs <id> [...]  (only these topics; used by the pipeline)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { KINDS, PERIODS, PUBLIC_IMG, RELATION_KINDS, TOPICS_DIR, loadSchedule, loadTopics, readJson } from "./lib.mjs";

// --legacy lists older topics that miss the newer editorial rules, for the nightly polish step.
const LEGACY_LIST = process.argv.includes("--legacy");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const all = loadTopics();
const ids = new Set(all.map((t) => t.id));
const topics = only.length ? only.map((id) => readJson(join(TOPICS_DIR, `${id}.json`), { id, missing: true })) : all;
const errors = [];
const warn = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);

const LATIN = /[A-Za-z]{2,}/;
const hebrew = (id, field, s, { min = 2, max = 2000 } = {}) => {
  if (typeof s !== "string" || s.trim().length < min) return err(id, `${field} missing or too short`);
  if (s.length > max) err(id, `${field} longer than ${max} characters`);
  if (!/[א-ת]/.test(s)) err(id, `${field} has no Hebrew`);
  // Latin is allowed only for a botanical or scientific name in parentheses or after "בשם".
  const stripped = s.replace(/\(([^)]*)\)/g, "").replace(/בשם [A-Z][a-z]+ [a-z]+/g, "");
  if (LATIN.test(stripped)) err(id, `${field} contains Latin text: ${s.slice(0, 60)}`);
};

const COLUMNS = ["המטבח הישראלי", "מיתוס או אמת", "מעבדה", "מאחורי המנה", "בשוק עכשיו", "טכניקה בדקה"];
const isWiki = (s) => /wikipedia\.org|wikidata\.org/.test(s.url ?? "");
const optLen = (o) => (o ?? "").length;
// The stricter editorial rules apply to new work (topics named on the command line, and drafts);
// for the existing library they are reported as warnings so it can be improved over time.
const legacy = {};
const strict = (t) => only.length > 0 || (t.status === "draft" && t.origin === "pipeline");

for (const t of topics) {
  const id = t.id ?? "?";
  if (t.missing) { err(id, "file not found"); continue; }
  const editorial = (msg) => {
    if (strict(t)) return err(id, msg);
    legacy[msg] = (legacy[msg] ?? 0) + 1;
    if (LEGACY_LIST) console.log(`legacy ${id}: ${msg}`);
  };
  if (/^בפעם הבאה/.test(t.takeaway ?? "")) editorial("takeaway must not start with \"בפעם הבאה\"");
  if ((t.sources ?? []).length && (t.sources ?? []).every(isWiki)) editorial("needs at least one source that is not Wikipedia");
  if (t.column !== undefined && !COLUMNS.includes(t.column)) err(id, `column must be one of ${COLUMNS.join(", ")}`);
  if (t.quiz?.options?.length) {
    const right = optLen(t.quiz.options[t.quiz.correct]);
    const longestWrong = Math.max(...t.quiz.options.filter((_, i) => i !== t.quiz.correct).map(optLen));
    if (right > longestWrong * 1.3) editorial("the correct quiz option is much longer than the others, which gives it away");
  }
  if (t.season !== undefined && !(Array.isArray(t.season) && t.season.length && t.season.every((m) => Number.isInteger(m) && m >= 1 && m <= 12)))
    err(id, "season must be a non-empty list of months 1–12");
  for (const [field, r] of [["recipe", t.recipe], ["recipeDraft", t.recipeDraft]]) {
    if (!r) continue;
    if (!(Number.isInteger(r.serves) && r.serves >= 1 && r.serves <= 24)) err(id, "recipe.serves must be 1–24");
    if (r.minutes !== undefined && !(r.minutes >= 1 && r.minutes <= 2880)) err(id, "recipe.minutes out of range");
    if (!(Array.isArray(r.ingredients) && r.ingredients.length >= 2 && r.ingredients.length <= 25)) err(id, "recipe needs 2–25 ingredients");
    else r.ingredients.forEach((g, i) => {
      hebrew(id, `recipe.ingredients[${i}].item`, g.item, { max: 80 });
      if (g.amount !== undefined && !(typeof g.amount === "number" && g.amount > 0)) err(id, `recipe.ingredients[${i}].amount must be a positive number`);
    });
    if (!(Array.isArray(r.steps) && r.steps.length >= 2 && r.steps.length <= 12)) err(id, "recipe needs 2–12 steps");
    else r.steps.forEach((st, i) => hebrew(id, `recipe.steps[${i}]`, st, { min: 15, max: 400 }));
    if (r.source && !/^https:\/\//.test(r.source.url ?? "")) err(id, "recipe.source.url must be https");
    if ((strict(t) || field === "recipeDraft") && !r.source) err(id, `a new ${field} needs a source (the tested recipe it is based on)`);
  }
}

// Variety across a night's batch: question headlines are good, a wall of them is not.
if (only.length) {
  const why = topics.filter((t) => /^למה/.test(t.headline ?? ""));
  if (why.length > 3) err(why.map((t) => t.id).join(","), `${why.length} headlines start with "למה"; at most 3 per run`);
}

for (const t of topics) {
  const id = t.id ?? "?";
  if (t.missing) continue;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err(id, "id must be lowercase-kebab-case");
  hebrew(id, "name", t.name, { max: 40 });
  hebrew(id, "headline", t.headline, { max: 70 });
  hebrew(id, "dek", t.dek, { min: 30, max: 260 });
  if (!KINDS.includes(t.kind)) err(id, `kind must be one of ${KINDS.join(", ")}`);
  if (!(t.minutes >= 1 && t.minutes <= 6)) err(id, "minutes must be 1–6");
  if (!Array.isArray(t.body) || t.body.length < 2 || t.body.length > 6) err(id, "body must have 2–6 paragraphs");
  else t.body.forEach((p, i) => hebrew(id, `body[${i}]`, p, { min: 80, max: 900 }));
  (t.facts ?? []).forEach((f, i) => hebrew(id, `facts[${i}]`, f, { max: 90 }));
  hebrew(id, "takeaway", t.takeaway, { min: 40, max: 400 });
  if (!Array.isArray(t.related) || t.related.length < 2) err(id, "needs at least 2 relations");
  for (const r of t.related ?? []) {
    if (r.target === id) err(id, "relates to itself");
    if (!RELATION_KINDS.includes(r.kind)) err(id, `relation kind ${r.kind} invalid`);
    hebrew(id, `related.${r.target}.why`, r.why, { min: 10, max: 160 });
    if (!ids.has(r.target)) warn.push(`${id}: relation to ${r.target}, which does not exist yet (hidden until it does)`);
  }
  if ((t.related ?? []).filter((r) => ids.has(r.target)).length < 2) err(id, "needs at least 2 relations to existing topics");
  for (const s of t.sources ?? []) {
    if (!/^https:\/\//.test(s.url ?? "")) err(id, `source URL must be https: ${s.url}`);
    if (!s.title || !s.publisher) err(id, "source needs title and publisher");
  }
  if (!["draft", "source-linked", "auto-checked"].includes(t.status)) err(id, `status ${t.status} invalid`);
  if (t.status !== "draft" && !(t.sources ?? []).length) err(id, "a non-draft topic needs sources");
  if (t.image) {
    for (const size of [720, 1400]) if (!existsSync(join(PUBLIC_IMG, `${t.image.key}-${size}.webp`))) err(id, `image file ${t.image.key}-${size}.webp missing`);
    hebrew(id, "image.alt", t.image.alt, { max: 160 });
    if (!t.image.credit?.source || !t.image.credit?.license) err(id, "image credit needs source and license");
  }
  if (t.quiz) {
    const q = t.quiz;
    hebrew(id, "quiz.question", q.question, { max: 120 });
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) err(id, "quiz needs 3–4 options");
    else q.options.forEach((o, i) => hebrew(id, `quiz.options[${i}]`, o, { min: 1, max: 110 }));
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < (q.options?.length ?? 0))) err(id, "quiz.correct out of range");
    hebrew(id, "quiz.explanation", q.explanation, { min: 40, max: 500 });
  }
  const a = t.angles ?? {};
  if (a.note) { hebrew(id, "angles.note.kicker", a.note.kicker, { max: 30 }); hebrew(id, "angles.note.text", a.note.text, { min: 30, max: 220 }); }
  if (a.compare) {
    hebrew(id, "angles.compare.title", a.compare.title, { max: 60 });
    if (a.compare.sides?.length !== 2) err(id, "compare needs exactly 2 sides");
    else a.compare.sides.forEach((s, i) => { hebrew(id, `compare.sides[${i}].label`, s.label, { max: 30 }); hebrew(id, `compare.sides[${i}].text`, s.text, { min: 20, max: 200 }); });
  }
  if (a.steps) {
    hebrew(id, "angles.steps.title", a.steps.title, { max: 60 });
    if (!(a.steps.steps?.length >= 2 && a.steps.steps.length <= 5)) err(id, "steps needs 2–5 steps");
    else a.steps.steps.forEach((s, i) => hebrew(id, `steps[${i}]`, s, { min: 15, max: 200 }));
  }
}

if (!only.length) {
  const names = new Map();
  for (const t of all) {
    const key = t.name.replace(/[֑-ׇ]/g, "");
    if (names.has(key)) err(t.id, `same name as ${names.get(key)}`);
    names.set(key, t.id);
  }
  for (const [date, day] of Object.entries(loadSchedule())) {
    for (const p of PERIODS) {
      const e = day[p];
      if (!e) { err(date, `missing ${p}`); continue; }
      for (const id of e.topics) if (!ids.has(id)) err(date, `${p} uses unknown topic ${id}`);
      if (e.quiz && !e.topics.includes(e.quiz)) err(date, `${p} quiz ${e.quiz} is not in the edition`);
    }
  }
}

for (const w of warn) console.warn("warn  " + w);
for (const [msg, n] of Object.entries(legacy)) console.warn(`note  ${n} older topic(s): ${msg} (to improve when they are next edited)`);
if (errors.length) {
  for (const e of errors) console.error("error " + e);
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`valid: ${topics.length} topic(s)${only.length ? "" : " and the schedule"}`);
