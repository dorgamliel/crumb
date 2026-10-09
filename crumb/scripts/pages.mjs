// Dev helper: viewport screenshots of several routes. Usage: node scripts/pages.mjs time route1 route2 ...
import { chromium } from "@playwright/test";
const [time, ...routes] = process.argv.slice(2);
const out = process.env.OUT ?? "/tmp/claude-0/shots";
const width = Number(process.env.W ?? 390);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, locale: "he-IL", timezoneId: "UTC" });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text()));
await page.clock.install({ time: new Date(time) });
for (const r of routes) {
  const [hash, scroll = "0"] = r.split("@");
  await page.goto((process.env.BASE ?? "http://localhost:5180/") + hash);
  await page.waitForTimeout(900);
  await page.evaluate((y) => window.scrollTo(0, Number(y)), scroll);
  await page.waitForTimeout(700);
  const name = (hash + "_" + scroll).replace(/[^a-z0-9_-]/gi, "_");
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
}
await browser.close();
