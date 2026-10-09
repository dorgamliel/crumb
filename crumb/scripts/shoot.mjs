// Dev helper: screenshots of key screens at a phone viewport. Usage: node scripts/shoot.mjs [baseUrl] [time]
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:5180/";
const time = process.argv[3] ?? "2026-10-09T09:30:00";
const out = process.env.OUT ?? "/tmp/claude-0/shots";
const width = Number(process.env.W ?? 390);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, locale: "he-IL", timezoneId: "UTC" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.clock.install({ time: new Date(time) });
await page.goto(base + "#/today");
await page.waitForTimeout(1200);
const shots = (process.env.SHOTS ?? "feed").split(",");
async function loadAll() {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}
await page.screenshot({ path: `${out}/feed-top.png` });
if (shots.includes("feed")) await loadAll();
if (shots.includes("feed")) await page.screenshot({ path: `${out}/feed-full.png`, fullPage: true });
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
await browser.close();
