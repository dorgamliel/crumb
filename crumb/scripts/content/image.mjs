// Finds and stores openly licensed photos for topics, politely and with caching.
//
//   node scripts/content/image.mjs search "<english query>"
//       Searches Openverse (Wikimedia Commons, Flickr, rawpixel…) for CC0 / public-domain /
//       CC BY / CC BY-SA photos. Results are cached in content/state/image-search-cache.json,
//       so a query is never sent twice. Thumbnails are saved to .image-candidates/ and a
//       contact sheet (contact-<slug>.jpg) is written for a human or model to look at.
//
//   node scripts/content/image.mjs use <topic-id> <candidate-key> "<hebrew alt text>"
//       Downloads the chosen candidate once, writes img/<topic>-720.webp and -1400.webp,
//       and records the image and its credit in the topic file.
//
//   node scripts/content/image.mjs pending
//       Lists topics that still have no photo (they show drawn artwork meanwhile).
//
// Rate limits: every request waits for a per-host interval and retries 429/5xx with
// exponential backoff. If a host keeps refusing, the command exits with code 3 and the
// pipeline simply moves on; the topic keeps its artwork and is retried on the next run.
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { PUBLIC_IMG, ROOT, STATE_DIR, TOPICS_DIR, loadTopics, readJson, writeJson } from "./lib.mjs";

const UA = "CrumbContentBot/1.0 (educational prototype; https://dorgamliel.github.io/ra/crumb-app/)";
const CACHE = join(STATE_DIR, "image-search-cache.json");
const CANDIDATES = join(ROOT, ".image-candidates");
const MIN_INTERVAL = { "api.openverse.org": 4000, "upload.wikimedia.org": 1500, default: 1000 };
const lastHit = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class RateLimited extends Error {}

async function politeFetch(url, { tries = 5 } = {}) {
  const host = new URL(url).host;
  for (let attempt = 0; attempt < tries; attempt++) {
    const wait = (lastHit[host] ?? 0) + (MIN_INTERVAL[host] ?? MIN_INTERVAL.default) - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit[host] = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch {
      res = null;
    }
    if (res?.ok) return res;
    if (res && res.status !== 429 && res.status < 500) throw new Error(`${res.status} for ${url}`);
    const retryAfter = Number(res?.headers.get("retry-after")) || 0;
    await sleep(Math.max(retryAfter * 1000, 2000 * 2 ** attempt));
  }
  throw new RateLimited(`gave up on ${host} after ${tries} tries`);
}

/** A small, cache-friendly thumbnail URL for a result (Wikimedia only serves standard widths). */
function thumbUrl(url, width) {
  const m = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w)\/(\w\w)\/(.+)$/);
  if (m) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}/${width}px-${m[3]}${/\.(tiff?|png)$/i.test(m[3]) ? ".jpg" : ""}`;
  const f = url.match(/^(https:\/\/live\.staticflickr\.com\/.+?)(_[a-z])?\.jpg$/);
  if (f) return `${f[1]}_${width <= 500 ? "n" : "b"}.jpg`;
  return url;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

async function search(query) {
  const cache = readJson(CACHE, {});
  let results = cache[query];
  if (!results) {
    const url =
      "https://api.openverse.org/v1/images/?" +
      new URLSearchParams({ q: query, page_size: "8", license: "cc0,pdm,by,by-sa", mature: "false", size: "large" });
    const data = await (await politeFetch(url)).json();
    results = data.results.map((r) => ({
      id: r.id,
      url: r.url,
      title: r.title ?? "",
      creator: r.creator ?? null,
      license: `${r.license === "pdm" ? "Public Domain" : r.license === "cc0" ? "CC0" : "CC " + r.license.toUpperCase()}${r.license_version && !["cc0", "pdm"].includes(r.license) ? " " + r.license_version : ""}`,
      source: r.source === "wikimedia" ? "Wikimedia Commons" : r.source === "flickr" ? "Flickr" : r.source,
      landing: r.foreign_landing_url,
      width: r.width,
      height: r.height,
    }));
    cache[query] = results;
    writeJson(CACHE, cache);
  }
  mkdirSync(CANDIDATES, { recursive: true });
  const tiles = [];
  for (const [i, r] of results.entries()) {
    const key = `${slug(query)}-${i}`;
    const file = join(CANDIDATES, `${key}.jpg`);
    try {
      if (!existsSync(file)) {
        const buf = Buffer.from(await (await politeFetch(thumbUrl(r.url, 330), { tries: 3 })).arrayBuffer());
        await sharp(buf).resize(300, 300, { fit: "cover" }).jpeg({ quality: 70 }).toFile(file);
      }
      tiles.push({ key, file, r });
    } catch (e) {
      if (e instanceof RateLimited) break;
    }
  }
  // Contact sheet: thumbnails in a grid, each labeled with its candidate key.
  if (tiles.length) {
    const cols = 4;
    const rows = Math.ceil(tiles.length / cols);
    const composites = await Promise.all(
      tiles.flatMap((t, i) => {
        const left = (i % cols) * 304;
        const top = Math.floor(i / cols) * 330;
        const label = Buffer.from(
          `<svg width="300" height="26"><rect width="300" height="26" fill="black"/><text x="6" y="18" font-size="15" fill="white" font-family="sans-serif">${t.key}</text></svg>`,
        );
        return [
          { input: t.file, left, top },
          { input: label, left, top: top + 302 },
        ];
      }),
    );
    const sheet = join(CANDIDATES, `contact-${slug(query)}.jpg`);
    await sharp({ create: { width: cols * 304, height: rows * 330, channels: 3, background: "#ffffff" } })
      .composite(composites)
      .jpeg({ quality: 75 })
      .toFile(sheet);
    console.log(`contact sheet: ${sheet}`);
  }
  for (const t of tiles) console.log(`${t.key}\t${t.r.width}x${t.r.height}\t${t.r.license}\t${t.r.source}\t${(t.r.title ?? "").slice(0, 60)}`);
  if (!tiles.length) console.log("no usable candidates");
}

async function use(topicId, key, alt) {
  const topicFile = join(TOPICS_DIR, `${topicId}.json`);
  const topic = readJson(topicFile);
  if (!topic) throw new Error(`no topic ${topicId}`);
  const m = key.match(/^(.*)-(\d+)$/);
  const cache = readJson(CACHE, {});
  const query = Object.keys(cache).find((q) => slug(q) === m?.[1]);
  const r = query && cache[query][Number(m[2])];
  if (!r) throw new Error(`unknown candidate ${key}; run search first`);
  const buf = Buffer.from(await (await politeFetch(thumbUrl(r.url, 1280))).arrayBuffer());
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  if ((meta.width ?? 0) < 700) throw new Error(`image too small (${meta.width}px)`);
  mkdirSync(PUBLIC_IMG, { recursive: true });
  await img.clone().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(PUBLIC_IMG, `${topicId}-720.webp`));
  const big = await img.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 72 }).toFile(join(PUBLIC_IMG, `${topicId}-1400.webp`));
  topic.image = {
    key: topicId,
    width: big.width,
    height: big.height,
    alt,
    credit: { ...(r.creator ? { author: r.creator } : {}), source: r.source, license: r.license, url: r.landing },
  };
  writeFileSync(topicFile, JSON.stringify(topic, null, 2) + "\n");
  console.log(`stored ${topicId}: ${big.width}x${big.height}, ${r.license}, ${r.source}`);
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === "search") await search(args.join(" "));
  else if (cmd === "use") await use(args[0], args[1], args.slice(2).join(" "));
  else if (cmd === "pending") for (const t of loadTopics().filter((t) => !t.image)) console.log(t.id);
  else console.log("usage: search <query> | use <topic> <candidate> <alt> | pending");
} catch (e) {
  console.error(e.message);
  process.exit(e instanceof RateLimited ? 3 : 1);
}
