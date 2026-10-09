// Applies the independent checker's verdicts (content/state/checks/<id>.json) to draft topics.
//   pass   → status "auto-checked", review notes recorded
//   reject → the topic and its photos are removed; the reason is logged in content/state/rejected.json
// Drafts without a verdict stay drafts. Unchecked drafts are never built or scheduled, so a
// failed or interrupted check only delays a topic; it never publishes it.
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_IMG, STATE_DIR, TOPICS_DIR, readJson, writeJson } from "./lib.mjs";

const CHECKS = join(STATE_DIR, "checks");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
const rejected = readJson(join(STATE_DIR, "rejected.json"), {});
let passed = 0;
let dropped = 0;
let waiting = 0;

for (const f of readdirSync(TOPICS_DIR).filter((f) => f.endsWith(".json"))) {
  const file = join(TOPICS_DIR, f);
  const t = readJson(file);
  if (t.origin !== "pipeline" || t.status !== "draft") continue;
  const verdictFile = join(CHECKS, `${t.id}.json`);
  if (!existsSync(verdictFile)) {
    waiting++;
    continue;
  }
  const v = readJson(verdictFile);
  if (v.verdict === "pass") {
    t.status = "auto-checked";
    t.review = { checkedAt: today, ...(v.notes ? { notes: v.notes } : {}) };
    writeJson(file, t);
    passed++;
  } else if (v.verdict === "reject") {
    rmSync(file);
    for (const size of [720, 1400]) rmSync(join(PUBLIC_IMG, `${t.id}-${size}.webp`), { force: true });
    rejected[t.id] = { date: today, name: t.name, reasons: v.issues ?? [] };
    dropped++;
  } else {
    waiting++;
  }
  rmSync(verdictFile);
}
writeJson(join(STATE_DIR, "rejected.json"), rejected);
console.log(`finalize: ${passed} passed, ${dropped} rejected, ${waiting} still waiting for a check`);
