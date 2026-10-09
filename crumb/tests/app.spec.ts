import { expect, test } from "@playwright/test";
import { AFTERNOON, MORNING, openAt } from "./helpers";

test("a five-minute journey: cover story, a connection, back, and close", async ({ page }) => {
  const errors = await openAt(page, MORNING);
  await expect(page.getByRole("heading", { level: 1, name: "בוקר בלי למהר." })).toBeVisible();
  await expect(page.getByText("0 מתוך 9 גילויים", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "לחם טוב צריך זמן." }).click();
  const title = page.getByRole("heading", { level: 1, name: "לחם טוב צריך זמן." });
  await expect(title).toBeFocused();
  await expect(page).toHaveURL(/#\/today\/sourdough$/);
  await expect(page.getByRole("navigation", { name: "מסלול הקריאה" })).toContainText("היום");

  await page.locator(".related__item").filter({ has: page.locator(".related__name", { hasText: /^תסיסה$/ }) }).click();
  await expect(page.getByRole("heading", { level: 1, name: "מי מתפיח את הבצק?" })).toBeVisible();
  await expect(page).toHaveURL(/#\/today\/sourdough\/fermentation$/);
  const crumbs = page.getByRole("navigation", { name: "מסלול הקריאה" });
  await expect(crumbs.getByRole("button", { name: "מחמצת" })).toBeVisible();

  await page.getByRole("button", { name: "חזרה", exact: true }).click();
  await expect(page).toHaveURL(/#\/today\/sourdough$/);

  await page.getByRole("button", { name: "סגירה: חזרה למהדורה" }).click();
  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.getByText("2 מתוך 9 גילויים", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("closing an article restores the feed scroll position and focus", async ({ page }) => {
  await openAt(page, MORNING);
  const link = page.getByRole("link", { name: "מי מתפיח את הבצק?" });
  await link.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(1500);
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "מי מתפיח את הבצק?" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await page.getByRole("button", { name: "חזרה למהדורה" }).last().click();
  await expect(page).toHaveURL(/#\/today$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 5);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before + 5);
  await expect(link).toBeFocused();
});

test("browser back and forward move between feed and article", async ({ page }) => {
  await openAt(page, MORNING);
  await page.getByRole("link", { name: "הסוד ללחם רך יותר." }).click();
  await expect(page.getByRole("heading", { level: 1, name: "הסוד ללחם רך יותר." })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "בוקר בלי למהר." })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name: "הסוד ללחם רך יותר." })).toBeVisible();
});

test("a deep link survives a refresh, and close/back still make sense", async ({ page }) => {
  await openAt(page, MORNING, "#/atlas/sourdough/fermentation");
  await expect(page.getByRole("heading", { level: 1, name: "מי מתפיח את הבצק?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "מי מתפיח את הבצק?" })).toBeVisible();
  await page.getByRole("button", { name: "חזרה", exact: true }).click();
  await expect(page).toHaveURL(/#\/atlas\/sourdough$/);
  await page.getByRole("button", { name: "סגירה: חזרה לאטלס" }).click();
  await expect(page).toHaveURL(/#\/atlas$/);
  await expect(page.getByRole("heading", { level: 1, name: "אטלס" })).toBeVisible();
});

test("breadcrumbs jump back to an earlier topic", async ({ page }) => {
  await openAt(page, MORNING);
  await page.getByRole("link", { name: "לחם טוב צריך זמן." }).click();
  await page.locator(".related__item").filter({ has: page.locator(".related__name", { hasText: /^גלוטן$/ }) }).click();
  await expect(page).toHaveURL(/sourdough\/gluten$/);
  await page.locator(".related__item").filter({ has: page.locator(".related__name", { hasText: /^פסטה$/ }) }).click();
  await expect(page).toHaveURL(/sourdough\/gluten\/pasta$/);
  await page.getByRole("navigation", { name: "מסלול הקריאה" }).getByRole("button", { name: "מחמצת" }).click();
  await expect(page).toHaveURL(/#\/today\/sourdough$/);
  await page.getByRole("navigation", { name: "מסלול הקריאה" }).getByRole("button", { name: "היום" }).click();
  await expect(page).toHaveURL(/#\/today$/);
});

test("saving survives a reload, and removal can be undone", async ({ page }) => {
  await openAt(page, MORNING);
  await page.getByRole("button", { name: "שמירה: טנגזונג" }).click();
  await expect(page.getByRole("status").filter({ hasText: "נשמר לקריאה בהמשך" })).toBeVisible();
  await page.reload();
  await page.getByRole("navigation", { name: "ניווט ראשי" }).getByRole("link", { name: "שמורים" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "שמורים" })).toBeVisible();
  const saved = page.locator(".saved .rows").first();
  await expect(saved).toContainText("טנגזונג");

  await page.locator(".saved").getByRole("button", { name: "הסרה מהשמורים: טנגזונג" }).click();
  await expect(page.getByText("עוד לא שמרתם שום דבר.")).toBeVisible();
  await page.getByRole("button", { name: "ביטול" }).click();
  await expect(saved).toContainText("טנגזונג");
  await page.locator(".saved").getByRole("button", { name: "הסרה מהשמורים: טנגזונג" }).click();
  await page.reload();
  await expect(page.getByText("עוד לא שמרתם שום דבר.")).toBeVisible();
});

test("quiz feedback explains, persists across screens, and can be retried", async ({ page }) => {
  await openAt(page, MORNING);
  const quiz = page.locator(".quiz", { hasText: "מה בעצם מתפיח בצק שמרים?" }).first();
  await quiz.getByRole("button", { name: /האוויר שנכנס/ }).click();
  await expect(quiz.getByText("לא הפעם. הנה ההסבר.")).toBeVisible();
  await expect(quiz.getByText("התשובה הנכונה")).toBeAttached();
  await expect(quiz.getByText("הבחירה שלכם")).toBeAttached();
  await expect(quiz.getByRole("button", { name: /גז שהשמרים/ })).toBeDisabled();

  await page.reload();
  await expect(quiz.getByText("לא הפעם. הנה ההסבר.")).toBeVisible();
  await page.getByRole("navigation", { name: "ניווט ראשי" }).getByRole("link", { name: "לומדים" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "לומדים" })).toBeVisible();
  const learnQuiz = page.locator(".learn .quiz", { hasText: "מה בעצם מתפיח בצק שמרים?" });
  await expect(learnQuiz.getByText("לא הפעם. הנה ההסבר.")).toBeVisible();
  await learnQuiz.getByRole("button", { name: "לנסות שוב" }).click();
  await expect(learnQuiz.locator(".quiz__option").first()).toBeFocused();
  await learnQuiz.getByRole("button", { name: /גז שהשמרים/ }).click();
  await expect(learnQuiz.getByText("נכון, בדיוק.")).toBeVisible();
  await learnQuiz.getByRole("button", { name: /למה זה קורה/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "מי מתפיח את הבצק?" })).toBeVisible();
});

test("Hebrew search ignores niqqud and prefixes, and combines with categories", async ({ page }) => {
  await openAt(page, MORNING, "#/atlas");
  const search = page.getByRole("searchbox", { name: "חיפוש נושאים" });
  const results = page.locator(".atlas__list .row__name");

  await search.fill("קָפֶה");
  await expect(results).toHaveText(["קפה", "מיצוי קפה"]);
  await search.fill("הקפה");
  await expect(results.first()).toHaveText("קפה");
  await search.fill("מיונז");
  await expect(results.filter({ hasText: /^תחליבים$/ })).toHaveCount(1);
  await search.fill("ג'לטיניזציה");
  await expect(results.first()).toBeVisible();

  await search.fill("חלב");
  await page.getByRole("button", { name: "חומרי גלם" }).click();
  await expect(results.first()).toBeVisible();
  // Every result must be an ingredient; the library grows, so check the rule rather than a fixed list.
  const kinds: Record<string, string> = Object.fromEntries(
    ((await (await page.request.get("/content/index.json")).json()).topics as { name: string; kind: string }[]).map((t) => [t.name, t.kind]),
  );
  const names = await results.allTextContents();
  expect(names).toContain("יוגורט");
  for (const name of names) expect(kinds[name], name).toBe("ingredients");

  await search.fill("זזזז");
  await expect(page.getByText("לא מצאנו נושא כזה.")).toBeVisible();
  await page.getByRole("button", { name: "ניקוי החיפוש" }).first().click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
});

test("the connection map recenters and opens the center article", async ({ page }) => {
  await openAt(page, MORNING, "#/atlas");
  const map = page.getByRole("group", { name: "מפת הקשרים של מחמצת" });
  await map.getByRole("button", { name: /^תסיסה/ }).click();
  const newMap = page.getByRole("group", { name: "מפת הקשרים של תסיסה" });
  await expect(newMap).toBeVisible();
  await expect(page.getByRole("navigation", { name: "המסלול שלכם במפה" })).toContainText("מחמצת");
  await newMap.getByRole("button", { name: /^יוגורט/ }).click();
  await expect(page.getByRole("group", { name: "מפת הקשרים של יוגורט" })).toBeVisible();
  await page.getByRole("navigation", { name: "המסלול שלכם במפה" }).getByRole("button", { name: "מחמצת" }).click();
  await expect(page.getByRole("group", { name: "מפת הקשרים של מחמצת" })).toBeVisible();
  await page.getByRole("group", { name: "מפת הקשרים של מחמצת" }).getByRole("button", { name: /^מחמצת — לפתיחת הכתבה/ }).click();
  await expect(page).toHaveURL(/#\/atlas\/sourdough$/);
});

test("future editions are locked; on launch day the archive holds only that day", async ({ page }) => {
  await openAt(page, MORNING);
  const parts = page.getByRole("group", { name: "בחירת מהדורה" });
  await expect(parts.getByRole("button", { name: /צהריים/ })).toBeDisabled();

  const archiveButton = page.getByRole("button", { name: "ארכיון מהדורות" });
  await archiveButton.click();
  const dialog = page.getByRole("dialog", { name: "ארכיון מהדורות" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("מאז שהמגזין יצא לדרך, ב־9 באוקטובר 2026");
  await expect(dialog).not.toContainText("הדגמה");
  await expect(dialog.locator(".archive__day")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(archiveButton).toBeFocused();
});

test("the archive switches to an earlier edition and back", async ({ page }) => {
  await openAt(page, "2026-10-10T09:30:00");
  const title = page.getByRole("heading", { level: 1 });
  await expect(page.locator(".cover__title")).toBeVisible();
  const current = await title.first().textContent();

  await page.getByRole("button", { name: "ארכיון מהדורות" }).click();
  const dialog = page.getByRole("dialog", { name: "ארכיון מהדורות" });
  await expect(dialog.locator(".archive__day")).toHaveCount(2);
  await dialog.locator(".archive__day", { hasText: "אתמול" }).getByRole("button", { name: /ערב/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "משהו טוב לסוף היום." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-period", "evening");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "משהו טוב לסוף היום." })).toBeVisible();
  await page.getByRole("button", { name: "חזרה למהדורה העדכנית" }).click();
  await expect(page.getByRole("heading", { level: 1, name: current! })).toBeVisible();
});

test("before 08:00 the previous evening is shown", async ({ page }) => {
  await openAt(page, "2026-10-10T06:10:00");
  await expect(page.getByRole("heading", { level: 1, name: "משהו טוב לסוף היום." })).toBeVisible();
  await expect(page.getByText("יום שישי, 9 באוקטובר · מהדורת ערב")).toBeVisible();
});

test("before 08:00 on launch day the first edition is the launch morning", async ({ page }) => {
  await openAt(page, "2026-10-09T06:10:00");
  await expect(page.getByRole("heading", { level: 1, name: "בוקר בלי למהר." })).toBeVisible();
});

test("a new edition replaces an idle feed but waits for an active reader", async ({ page }) => {
  await openAt(page, "2026-10-09T12:59:00");
  await expect(page.getByRole("heading", { level: 1, name: "בוקר בלי למהר." })).toBeVisible();
  await page.clock.fastForward("02:00");
  await expect(page.getByRole("heading", { level: 1, name: "הפסקה עם טעם." })).toBeVisible();

  await page.clock.setSystemTime(new Date("2026-10-09T18:58:00"));
  await page.clock.fastForward("00:31");
  await page.getByRole("link", { name: "לכל עגבנייה אופי משלה." }).click();
  await page.clock.fastForward("02:00");
  await page.getByRole("button", { name: "סגירה: חזרה למהדורה" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "הפסקה עם טעם." })).toBeVisible();
  await expect(page.getByText("מהדורת הערב כבר כאן.")).toBeVisible();
  await page.getByRole("button", { name: "לעבור אליה" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "משהו טוב לסוף היום." })).toBeVisible();
});

test("interactive explanations respond to input", async ({ page }) => {
  await openAt(page, AFTERNOON, "#/learn");
  const hydration = page.locator(".learn .lab", { hasText: "כמה מים הבצק" });
  const slider = hydration.getByRole("slider", { name: "הידרציה" });
  await slider.fill("58");
  await expect(hydration.locator(".lab__readout")).toContainText("נוקשה");
  await expect(hydration.locator(".lab__readout")).toContainText("290 גרם מים");
  await slider.fill("85");
  await expect(hydration.locator(".lab__readout")).toContainText("רטוב מאוד");

  // Keyboard: in an RTL range, ArrowLeft moves the thumb toward the higher end.
  await slider.focus();
  const v0 = Number(await slider.inputValue());
  await page.keyboard.press("ArrowLeft");
  const v1 = Number(await slider.inputValue());
  expect(v1).not.toBe(v0);

  const emulsion = page.locator(".learn .lab", { hasText: "ויניגרט נפרד" });
  await emulsion.getByRole("slider").fill("80");
  await emulsion.getByRole("button", { name: "לחכות כמה דקות" }).click();
  await expect(emulsion.locator(".lab__readout")).toContainText("הטיפות התאחדו");
  await emulsion.getByRole("switch", { name: "מוסיפים חלמון" }).check();
  await emulsion.getByRole("button", { name: "לחכות כמה דקות" }).click();
  await expect(emulsion.locator(".lab__readout")).toContainText("התחליב מחזיק");

  const browning = page.locator(".learn .lab", { hasText: "מאיפה מגיע הקרום" });
  await browning.getByRole("switch", { name: "פני שטח רטובים" }).check();
  await browning.getByRole("slider").fill("20");
  await expect(browning.locator(".lab__readout")).toContainText("מתאדה, לא משחים");
  await browning.getByRole("slider").fill("75");
  await expect(browning.locator(".lab__readout")).toContainText("זהוב");
});

test("topics open with their content and image, and none fail to load", async ({ page, request }) => {
  const errors = await openAt(page, MORNING, "#/atlas");
  const index = await (await request.get("/content/index.json")).json();
  const all: { id: string; image: unknown }[] = index.topics;
  expect(all.length).toBeGreaterThanOrEqual(25);
  // The library grows every night, so check a stable sample: the oldest and the newest topics.
  const sample = [...all.slice(0, 15), ...all.slice(-25)].filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i);
  for (const t of sample) {
    const res = await request.get(`/content/t/${t.id}.json`);
    expect(res.ok(), t.id).toBe(true);
  }
  for (const t of sample.slice(0, 12)) {
    await page.goto(`/#/atlas/${t.id}`);
    await expect(page.locator("h1.article__title")).toBeVisible();
    await expect(page.locator(".article__body p").first()).toBeVisible();
    if (t.image) {
      const img = page.locator(".article__hero img");
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    } else {
      await expect(page.locator(".article__hero .pic--art")).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("a failed image shows a usable fallback", async ({ page }) => {
  await page.route("**/img/tangzhong-*.webp", (r) => r.abort());
  await openAt(page, MORNING);
  await expect(page.locator(".card .pic--failed").first()).toContainText("התמונה לא נטענה");
  await expect(page.getByRole("link", { name: "הסוד ללחם רך יותר." })).toBeVisible();
});

test("malformed storage does not break the app", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("crumb:v2:saved", "{not json");
    localStorage.setItem("crumb:v2:answers", JSON.stringify(["wrong shape"]));
    sessionStorage.setItem("crumb:v2:edition", "garbage:value");
  });
  const errors = await openAt(page, MORNING);
  await expect(page.getByRole("heading", { level: 1, name: "בוקר בלי למהר." })).toBeVisible();
  await page.getByRole("button", { name: "שמירה: קפה" }).click();
  await expect(page.getByRole("button", { name: "הסרה מהשמורים: קפה" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("blocked storage falls back to memory", async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: deny });
    Object.defineProperty(window, "sessionStorage", { get: deny });
  });
  const errors = await openAt(page, MORNING);
  await page.getByRole("button", { name: "שמירה: קפה" }).click();
  await page.getByRole("navigation", { name: "ניווט ראשי" }).getByRole("link", { name: "שמורים" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "שמורים" })).toBeVisible();
  await expect(page.locator(".saved .rows").first()).toContainText("קפה");
  expect(errors).toEqual([]);
});

test("data saved by the first version is imported once", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("crumb:v2:migrated")) localStorage.setItem("crumb:v1:saved", JSON.stringify(["pizza", "caramel"]));
  });
  await openAt(page, MORNING, "#/saved");
  const rows = page.locator(".saved .rows").first();
  await expect(rows).toContainText("פיצה");
  await expect(rows).toContainText("קרמל");
});

for (const width of [320, 375, 393, 430, 768, 1280]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openAt(page, EVENING_SAFE);
    for (const hash of ["#/today", "#/atlas", "#/learn", "#/saved", "#/today/lamination"]) {
      await page.goto("/" + hash);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, hash).toBeLessThanOrEqual(0);
    }
  });
}

const EVENING_SAFE = "2026-10-09T20:30:00";
