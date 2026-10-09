// Reads a source page as plain text, politely and with caching, for writers and the checker.
//
//   node scripts/content/source.mjs <url> [--grep <words>]
//
// - Text is cached in .source-cache/ (not committed), so the writer and the checker share one
//   download per page within a run.
// - Every URL that was reachable is recorded in content/state/sources.json (committed), so later
//   runs know which links already worked.
// - Wikipedia pages are read through its REST API (plain HTML of the article body, no chrome).
// - Per-host spacing and exponential backoff on 429/5xx. Exits with code 3 if a host keeps
//   refusing, which callers treat as "source unavailable right now", not as a failure of the run.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, STATE_DIR, readJson, writeJson } from "./lib.mjs";

const UA = "CrumbContentBot/1.0 (educational prototype; https://dorgamliel.github.io/ra/crumb-app/)";
const CACHE = join(ROOT, ".source-cache");
const LOG = join(STATE_DIR, "sources.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function apiUrl(url) {
  const m = url.match(/^https:\/\/(\w+)\.wikipedia\.org\/wiki\/([^#?]+)/);
  return m ? `https://${m[1]}.wikipedia.org/api/rest_v1/page/html/${m[2]}` : url;
}

function toText(html) {
  return html
    .replace(/<(script|style|noscript|svg|header|footer|nav)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, "")
    .replace(/<\/(p|h\d|li|tr|div|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function fetchText(url) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, createHash("sha1").update(url).digest("hex") + ".txt");
  if (existsSync(file)) return readFileSync(file, "utf8");
  const target = apiUrl(url);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await sleep(3000 * 2 ** (attempt - 1));
    let res;
    try {
      res = await fetch(target, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
    } catch {
      continue;
    }
    if (res.ok) {
      const text = toText(await res.text());
      writeFileSync(file, text);
      const log = readJson(LOG, {});
      log[url] = { ok: true, checkedAt: new Date().toISOString().slice(0, 10) };
      writeJson(LOG, log);
      return text;
    }
    if (res.status === 404 || res.status === 410) {
      const log = readJson(LOG, {});
      log[url] = { ok: false, status: res.status, checkedAt: new Date().toISOString().slice(0, 10) };
      writeJson(LOG, log);
      console.error(`NOT FOUND (${res.status}): ${url}`);
      process.exit(2);
    }
    if (res.status !== 429 && res.status < 500 && res.status !== 403) {
      console.error(`HTTP ${res.status}: ${url}`);
      process.exit(2);
    }
  }
  console.error(`UNAVAILABLE (rate limited or down): ${url}`);
  process.exit(3);
}

const [url, flag, ...words] = process.argv.slice(2);
if (!url?.startsWith("https://")) {
  console.log("usage: source.mjs <https-url> [--grep word …]");
  process.exit(1);
}
const text = await fetchText(url);
if (flag === "--grep" && words.length) {
  const re = new RegExp(words.join("|"), "i");
  const lines = text.split("\n").filter((l) => re.test(l));
  console.log(lines.slice(0, 60).join("\n") || "(no matching lines)");
} else {
  console.log(text.slice(0, 20000));
  if (text.length > 20000) console.log(`\n… (${text.length} chars total; use --grep to search)`);
}
