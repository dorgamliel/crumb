// Rasterizes public/icon.svg into the PNG sizes the manifest lists.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, file, bg] of [
  [192, "public/icon-192.png", "transparent"],
  [512, "public/icon-512.png", "transparent"],
  [512, "public/icon-maskable-512.png", "#f5ede0"],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = bg === "transparent" ? svg : svg.replace('rx="112"', 'rx="0"');
  await page.setContent(`<style>html,body{margin:0;background:${bg}}svg{display:block;width:${size}px;height:${size}px}</style>${inner}`);
  await page.screenshot({ path: file, omitBackground: bg === "transparent" });
}
await browser.close();
