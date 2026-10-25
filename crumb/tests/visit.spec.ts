import { test, expect } from "@playwright/test";
import { openAt, MORNING } from "./helpers";

test("the Bishulim link token is kept and removed from the address bar", async ({ page }) => {
  await page.clock.install({ time: new Date(MORNING) });
  await page.goto("/?from=bishulim&k=abcdefghijklmnop1234#/today");
  await expect(page.locator("#main")).toBeVisible();

  expect(new URL(page.url()).search).toBe("");
  expect(new URL(page.url()).hash).toBe("#/today");
  expect(await page.evaluate(() => localStorage.getItem("crumb:v2:bishulim"))).toBe("abcdefghijklmnop1234");
});

test("nothing is sent while reporting is off", async ({ page }) => {
  const reports: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/crumb/visit")) reports.push(r.url());
  });
  await openAt(page, MORNING);
  expect(reports).toEqual([]);
});
