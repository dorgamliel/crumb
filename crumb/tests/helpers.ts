import { expect, type Page } from "@playwright/test";

/** Opens the app at a fixed local time. */
export async function openAt(page: Page, time: string, hash = "#/today") {
  await page.clock.install({ time: new Date(time) });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/" + hash);
  await expect(page.locator("#main")).toBeVisible();
  return errors;
}

export const MORNING = "2026-10-09T09:30:00";
export const AFTERNOON = "2026-10-09T14:10:00";
export const EVENING = "2026-10-09T20:30:00";
