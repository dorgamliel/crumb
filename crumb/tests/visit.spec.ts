import { test, expect } from "@playwright/test";
import { openAt, MORNING } from "./helpers";

const API = "https://bishulim-api.example";

test("the Bishulim link is kept, removed from the address bar, and reports the visit", async ({ page }) => {
  const reports: { url: string; body: unknown }[] = [];
  await page.route(`${API}/**`, (route) => {
    reports.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.clock.install({ time: new Date(MORNING) });
  await page.goto(`/?from=bishulim&k=abcdefghijklmnop1234&api=${encodeURIComponent(API)}#/today`);
  await expect(page.locator("#main")).toBeVisible();

  expect(new URL(page.url()).search).toBe("");
  expect(new URL(page.url()).hash).toBe("#/today");
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0].url).toBe(`${API}/api/crumb/visit`);
  expect(reports[0].body).toMatchObject({ k: "abcdefghijklmnop1234", visitor: expect.any(String) });
  const visitor = (reports[0].body as { visitor: string }).visitor;

  // A later visit straight to Crumb, without the link, still reports as the same visitor and user.
  await page.reload();
  await expect(page.locator("#main")).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  await expect.poll(() => reports.length).toBe(2);
  expect(reports[1].body).toEqual({ k: "abcdefghijklmnop1234", visitor });
});

test("nothing is sent from a browser that never followed the Bishulim link", async ({ page }) => {
  const reports: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/crumb/visit")) reports.push(r.url());
  });
  await openAt(page, MORNING);
  expect(reports).toEqual([]);
});

test("a non-https report address is ignored", async ({ page }) => {
  const reports: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/crumb/visit")) reports.push(r.url());
  });
  await page.goto(`/?from=bishulim&k=abcdefghijklmnop1234&api=${encodeURIComponent("http://evil.example")}#/today`);
  await expect(page.locator("#main")).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  expect(reports).toEqual([]);
});
