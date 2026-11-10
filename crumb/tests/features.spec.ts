import { expect, test, type Page } from "@playwright/test";
import { openAt, MORNING, AFTERNOON } from "./helpers";

// Daily-habit features: the guessing game, streak, recall, pre-question, teaser, palate, sharing,
// offline, recipes and honest reading times.

const NS = "crumb:v2:";

async function seed(page: Page, data: Record<string, unknown>) {
  await page.addInitScript(
    ([ns, entries]) => {
      for (const [k, v] of Object.entries(entries as Record<string, unknown>)) localStorage.setItem(ns + k, JSON.stringify(v));
    },
    [NS, data] as const,
  );
}

function fnv(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Mirrors puzzleFor() in src/features/Game.tsx. */
function answerFor(topics: { id: string; name: string; kind: string; image: unknown }[], date: string) {
  const pool = topics
    .filter((t) => t.image && ["dishes", "ingredients", "baking", "drinks"].includes(t.kind) && t.name.length <= 18)
    .sort((a, b) => fnv("crumb-game:" + a.id) - fnv("crumb-game:" + b.id));
  const n = Math.round((Date.parse(date) - Date.parse("2026-10-09")) / 86400000) + 1;
  return pool[n % pool.length];
}

test("the daily game zooms out on a wrong guess and can be solved and shared", async ({ page, request, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = await openAt(page, AFTERNOON, "#/learn");
  const { topics } = await (await request.get("/content/index.json")).json();
  const answer = answerFor(topics, "2026-10-09");
  const wrong = topics.find((t: { id: string; name: string }) => t.id !== answer.id && t.name.length > 2 && !t.name.includes(answer.name));

  const game = page.locator(".learn .game");
  await expect(game.getByRole("heading", { name: "מה בצלחת?" })).toBeVisible();
  const input = game.getByRole("textbox", { name: "הניחוש שלכם" });
  await input.fill(wrong.name);
  await game.getByRole("button", { name: new RegExp(`^${wrong.name}`) }).first().click();
  await expect(game.locator(".game__clues li")).toHaveCount(1);
  await expect(game.locator(".game__dot--near, .game__dot--miss")).toHaveCount(1);

  await input.fill(answer.name);
  await game.getByRole("button", { name: new RegExp(`^${answer.name}`) }).first().click();
  await expect(game.locator(".game__verdict")).toContainText(answer.name);
  await expect(game.locator(".game__verdict")).toContainText("2 ניחושים");

  await page.evaluate(() => {
    // Force the clipboard path (no share sheet in desktop Chromium).
    (navigator as unknown as { share?: unknown }).share = undefined;
  });
  await game.getByRole("button", { name: "לשתף בלי לגלות" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("crumb · מה בצלחת? #1");
  expect(copied).toMatch(/[🟨⬜]🟩 2\/5/u);
  expect(copied).not.toContain(answer.name);

  // The result survives a reload, and the Today teaser reflects it.
  await page.goto("/#/today");
  await expect(page.locator(".game--teaser")).toContainText("פתרתם ב־2 ניחושים");
  expect(errors).toEqual([]);
});

test("quiz options are shuffled but answers are still judged correctly", async ({ page, request }) => {
  await openAt(page, AFTERNOON, "#/learn");
  const quiz = page.locator(".learn__quizzes .quiz").first();
  await expect(quiz).toBeVisible();
  const question = (await quiz.locator(".quiz__question").textContent())!;
  const { topics } = await (await request.get("/content/index.json")).json();
  let correctText = "";
  for (const t of topics.filter((t: { hasQuiz: boolean }) => t.hasQuiz)) {
    const full = await (await request.get(`/content/t/${t.id}.json`)).json();
    if (full.quiz?.question === question) {
      correctText = full.quiz.options[full.quiz.correct];
      break;
    }
  }
  expect(correctText).not.toBe("");
  await quiz.getByRole("button", { name: correctText }).click();
  await expect(quiz.locator(".quiz__verdict")).toContainText("נכון");
});

test("correct answers are spread across positions, not stuck on the second option", async ({ page, request }) => {
  await openAt(page, MORNING);
  const { topics } = await (await request.get("/content/index.json")).json();
  const sample = topics.filter((t: { hasQuiz: boolean }) => t.hasQuiz).slice(-40);
  const positions = await page.evaluate(
    async (ids: string[]) => {
      const fnv = (s: string) => {
        let h = 2166136261;
        for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        return h >>> 0;
      };
      const out: number[] = [];
      for (const id of ids) {
        const t = await (await fetch(`./content/t/${id}.json`)).json();
        const n = t.quiz.options.length;
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => fnv(`${id}:${a}`) - fnv(`${id}:${b}`));
        out.push(order.indexOf(t.quiz.correct));
      }
      return out;
    },
    sample.map((t: { id: string }) => t.id),
  );
  const share = Math.max(...[0, 1, 2, 3].map((p) => positions.filter((x) => x === p).length)) / positions.length;
  expect(share).toBeLessThan(0.5);
});

test("an unknown topic link says so instead of failing silently", async ({ page }) => {
  await openAt(page, MORNING, "#/today/does-not-exist");
  await expect(page.getByRole("alert")).toContainText("לא מצאנו את הכתבה הזאת");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "סגירת ההודעה" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a streak counts reading days and forgives a single missed day", async ({ page }) => {
  // Read on the 6th and 7th; today is the 8th and nothing has been read yet.
  await seed(page, { days: ["2026-10-06", "2026-10-07"] });
  await openAt(page, "2026-10-08T09:30:00");
  await expect(page.locator(".streak")).toContainText("2 ימים ברצף");
  await expect(page.locator(".streak")).toContainText("עוד כתבה אחת היום");
  await page.locator(".feed .card a").first().click();
  await page.getByRole("button", { name: "סגירה: חזרה למהדורה" }).click();
  await expect(page.locator(".streak")).toContainText("3 ימים ברצף");
  await expect(page.locator(".streak")).not.toContainText("עוד כתבה");
});

test("a topic read a few days ago comes back as a recall question", async ({ page, request }) => {
  const { topics } = await (await request.get("/content/index.json")).json();
  const t = topics.find((x: { hasQuiz: boolean }) => x.hasQuiz);
  await seed(page, { read: [t.id], readAt: { [t.id]: "2026-10-07" } });
  await openAt(page, "2026-10-10T09:30:00");
  const recall = page.locator(".recall .quiz");
  await expect(recall).toContainText("זוכרים?");
  await expect(recall).toContainText(`קראתם על ${t.name} לפני 3 ימים`);
  await recall.getByRole("button").first().click();
  await expect(recall.locator(".quiz__verdict")).toBeVisible();
});

test("the edition ends with a question from the next edition", async ({ page }) => {
  await openAt(page, MORNING);
  const teaser = page.locator(".teaser");
  await teaser.scrollIntoViewIfNeeded();
  await expect(teaser).toContainText("בצהריים");
  await expect(teaser.locator(".teaser__headline")).not.toBeEmpty();
});

test("the palate card describes what the reader reads", async ({ page, request }) => {
  const { topics } = await (await request.get("/content/index.json")).json();
  const baking = topics.filter((t: { kind: string }) => t.kind === "baking").slice(0, 4).map((t: { id: string }) => t.id);
  const other = topics.find((t: { kind: string }) => t.kind === "drinks").id;
  await seed(page, { read: [...baking, other] });
  await openAt(page, MORNING, "#/saved");
  const card = page.locator(".palate");
  await expect(card.getByRole("heading", { name: "אופים בנשמה" })).toBeVisible();
  await expect(card).toContainText("5");
  await expect(card.getByRole("button", { name: "לשתף כתמונה" })).toBeEnabled();
});

test("share pages carry a preview and open the app at the topic", async ({ page, request }) => {
  const { topics } = await (await request.get("/content/index.json")).json();
  const t = topics.find((x: { image: unknown }) => x.image);
  const html = await (await request.get(`/t/${t.id}.html`)).text();
  expect(html).toContain(`<meta property="og:title" content="${t.headline.replace(/"/g, "&quot;")}">`);
  expect(html).toContain(`og:image" content="https://dorgamliel.github.io/crumb/img/${t.image.key}-1400.webp`);
  await page.clock.install({ time: new Date(MORNING) });
  await page.goto(`/t/${t.id}.html`);
  await expect(page.locator("h1.article__title")).toHaveText(t.headline);
});

test("reading times are measured, and drafts are not published", async ({ request }) => {
  const { topics } = await (await request.get("/content/index.json")).json();
  expect(topics.some((t: { minutes: number }) => t.minutes === 1)).toBe(true);
  expect(topics.every((t: { status: string }) => t.status !== "draft")).toBe(true);
  expect(topics.some((t: { id: string }) => t.id === "acidity")).toBe(false);
});

test.describe("offline", () => {
  test.use({ serviceWorkers: "allow" });
  test("the app opens offline after one visit", async ({ page, context }) => {
    await openAt(page, MORNING);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
      return reg.active?.state;
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".boot-error")).toHaveCount(0);
  });
});
