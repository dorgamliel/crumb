// Compiles content/ into the static files the app fetches (public/content/), so the app never
// downloads the whole library: a light index for search, maps and cards, plus one file per topic.
import { rmSync, readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { ROOT, SCHEDULE_DIR, loadTopics } from "./lib.mjs";

const writeJson = (p, data) => {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
};

const OUT = join(ROOT, "public", "content");
rmSync(OUT, { recursive: true, force: true });

// Pipeline drafts that have not passed the independent check are never published.
const topics = loadTopics().filter((t) => !(t.origin === "pipeline" && t.status === "draft"));
const ids = new Set(topics.map((t) => t.id));

// Oldest first, so tests and tools can sample "the newest" from the end.
const ordered = [...topics].sort((a, b) => (a.addedAt ?? a.updatedAt).localeCompare(b.addedAt ?? b.updatedAt) || a.id.localeCompare(b.id));
const index = ordered.map((t) => ({
  id: t.id,
  name: t.name,
  headline: t.headline,
  kind: t.kind,
  minutes: t.minutes,
  image: t.image ? { key: t.image.key, width: t.image.width, height: t.image.height, alt: t.image.alt, ...(t.image.focus ? { focus: t.image.focus } : {}) } : null,
  keywords: t.keywords ?? [],
  related: t.related.filter((r) => ids.has(r.target)).map((r) => ({ target: r.target, kind: r.kind })),
  hasQuiz: Boolean(t.quiz),
  status: t.status,
  added: t.addedAt ?? t.updatedAt,
}));
writeJson(join(OUT, "index.json"), { generatedAt: new Date().toISOString(), topics: index });

for (const t of topics) {
  writeJson(join(OUT, "t", `${t.id}.json`), { ...t, related: t.related.filter((r) => ids.has(r.target)) });
}

mkdirSync(join(OUT, "schedule"), { recursive: true });
for (const f of readdirSync(SCHEDULE_DIR).filter((f) => f.endsWith(".json"))) copyFileSync(join(SCHEDULE_DIR, f), join(OUT, "schedule", f));

console.log(`content: ${topics.length} topics, ${readdirSync(SCHEDULE_DIR).length} schedule months`);
