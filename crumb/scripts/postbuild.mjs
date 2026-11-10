// Runs after `vite build`:
//  1. fills in the service worker's version and app-shell file list;
//  2. writes one small static page per topic (dist/t/<id>.html) with its own title, description
//     and photo, so a shared link previews properly in WhatsApp and elsewhere, then opens the app.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./content/lib.mjs";

const DIST = join(ROOT, "dist");
const SITE = (process.env.CRUMB_SITE_URL ?? "https://dorgamliel.github.io/crumb/").replace(/\/?$/, "/");

// 1. Service worker
const html = readFileSync(join(DIST, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]);
const shell = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", ...assets.map((a) => "./" + a)];
const version = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const sw = readFileSync(join(DIST, "sw.js"), "utf8").replace("__VERSION__", version).replace("__SHELL__", JSON.stringify(shell));
writeFileSync(join(DIST, "sw.js"), sw);

// 2. Share pages
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const T = join(DIST, "content", "t");
mkdirSync(join(DIST, "t"), { recursive: true });
let n = 0;
for (const f of readdirSync(T)) {
  const t = JSON.parse(readFileSync(join(T, f), "utf8"));
  const target = `../#/today/${encodeURIComponent(t.id)}`;
  const image = t.image ? `${SITE}img/${t.image.key}-1400.webp` : `${SITE}icon-512.png`;
  const page = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.headline)} · Crumb</title>
<meta name="description" content="${esc(t.dek)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Crumb · משהו טעים לגלות">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="${esc(t.headline)}">
<meta property="og:description" content="${esc(t.dek)}">
<meta property="og:url" content="${SITE}t/${encodeURIComponent(t.id)}.html">
<meta property="og:image" content="${image}">
${t.image ? `<meta property="og:image:width" content="${t.image.width}">\n<meta property="og:image:height" content="${t.image.height}">\n<meta property="og:image:alt" content="${esc(t.image.alt)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${SITE}#/today/${encodeURIComponent(t.id)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:2em">
<p><a href="${target}">${esc(t.headline)}</a></p>
</body>
</html>
`;
  writeFileSync(join(DIST, "t", `${t.id}.html`), page);
  n++;
}
console.log(`postbuild: service worker ${version} (${shell.length} shell files), ${n} share pages`);
