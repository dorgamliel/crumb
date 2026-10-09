import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { EVENING, MORNING, AFTERNOON, openAt } from "./helpers";

const screens: [string, string, string][] = [
  ["morning feed", MORNING, "#/today"],
  ["afternoon feed", AFTERNOON, "#/today"],
  ["evening feed", EVENING, "#/today"],
  ["article", MORNING, "#/today/sourdough"],
  ["evening article", EVENING, "#/today/pasta/pasta-water"],
  ["atlas", MORNING, "#/atlas"],
  ["learn", MORNING, "#/learn"],
  ["saved (empty)", MORNING, "#/saved"],
];

for (const [name, time, hash] of screens) {
  test(`axe: ${name}`, async ({ page }) => {
    await openAt(page, time, hash);
    await page.waitForTimeout(700); // let image fades finish so contrast is measured on final colors
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`);
    expect(summary).toEqual([]);
  });
}

test("axe: archive dialog and answered quiz", async ({ page }) => {
  await openAt(page, MORNING);
  await page.locator(".quiz").first().getByRole("button").first().click();
  await page.getByRole("button", { name: "ארכיון מהדורות" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("keyboard: open an article from the feed and return focus to the card", async ({ page }) => {
  await openAt(page, MORNING);
  const link = page.getByRole("link", { name: "מה משנה את הטעם של הקפה?" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "מה משנה את הטעם של הקפה?" })).toBeFocused();
  await page.goBack();
  await expect(link).toBeFocused();
});

test("skip link moves focus to the main content", async ({ page }) => {
  await openAt(page, MORNING);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "דילוג לתוכן" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("reduced motion: no view transitions or long animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAt(page, MORNING);
  const duration = await page.locator(".cover__pic img").evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(duration.split(",").every((d) => parseFloat(d) < 0.01)).toBe(true);
  await page.getByRole("link", { name: "לחם טוב צריך זמן." }).click();
  await expect(page.getByRole("heading", { level: 1, name: "לחם טוב צריך זמן." })).toBeVisible();
});
