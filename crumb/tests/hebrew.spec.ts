import { expect, test } from "@playwright/test";
import { EVENING, MORNING, openAt } from "./helpers";

test("document is Hebrew and right-to-left", async ({ page }) => {
  await openAt(page, MORNING);
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe("rtl");
});

/** Visible text that contains Latin letters, outside places where Latin is legitimate. */
async function strayLatin(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const allowed = (el: Element | null) =>
      !!el?.closest('[lang="en"], .sources, .wordmark, script, style, svg, noscript');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found: string[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      if (!el || allowed(el) || el.closest("[hidden]")) continue;
      // The botanical name of black pepper is the one Latin term the content uses on purpose.
      const text = (n.textContent ?? "").replace("Piper nigrum", "");
      if (/[A-Za-z]{2,}/.test(text)) found.push((n.textContent ?? "").trim().slice(0, 60));
    }
    // Accessible names too.
    document.querySelectorAll("[aria-label]").forEach((el) => {
      if (!allowed(el) && /[A-Za-z]{2,}/.test(el.getAttribute("aria-label")!)) found.push("aria-label: " + el.getAttribute("aria-label"));
    });
    return found;
  });
}

for (const hash of ["#/today", "#/atlas", "#/learn", "#/saved", "#/today/pepper", "#/atlas/pizza/browning"]) {
  test(`no stray English in the interface: ${hash}`, async ({ page }) => {
    await openAt(page, EVENING, hash);
    expect(await strayLatin(page)).toEqual([]);
  });
}

test("every article: no English outside names, sources and credits", async ({ page }) => {
  await openAt(page, MORNING, "#/atlas");
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".atlas__list a[href]")).map((a) => a.getAttribute("href")!.split("/").pop()!),
  );
  for (const id of ids) {
    await page.goto(`/#/atlas/${id}`);
    await expect(page.locator("h1.article__title")).toBeVisible();
    const stray = await strayLatin(page);
    expect(stray, id).toEqual([]);
  }
});

test("dates and times are formatted for Hebrew readers", async ({ page }) => {
  await openAt(page, MORNING);
  await expect(page.getByText("יום שישי, 9 באוקטובר · מהדורת בוקר")).toBeVisible();
  const times = await page.locator(".daypart__time bdi").allTextContents();
  expect(times).toEqual(["08:00", "13:00", "19:00"]);
  await page.getByRole("link", { name: "לחם טוב צריך זמן." }).click();
  await expect(page.getByText("עודכן לאחרונה: 9 באוקטובר 2026")).toBeVisible();
});

test("quiz options use Hebrew letters", async ({ page }) => {
  await openAt(page, MORNING, "#/learn");
  const letters = await page.locator(".learn .quiz").first().locator(".quiz__letter").allTextContents();
  expect(letters).toEqual(["א", "ב", "ג", "ד"]);
});

test("horizontal collections start from the right", async ({ page }) => {
  await openAt(page, MORNING);
  const strip = page.locator(".strip__list");
  await strip.scrollIntoViewIfNeeded();
  const [first, listBox] = await Promise.all([strip.locator("li").first().boundingBox(), strip.boundingBox()]);
  expect(first!.x + first!.width).toBeGreaterThan(listBox!.x + listBox!.width - 40);
});

test("back arrows point right and forward arrows point left", async ({ page }) => {
  await openAt(page, MORNING, "#/today/coffee");
  const back = page.getByRole("button", { name: "חזרה", exact: true }).locator("svg");
  await expect(back).toHaveClass(/lucide-arrow-right/);
  await expect(page.locator(".related__arrow").first()).toHaveClass(/lucide-arrow-left/);
});
