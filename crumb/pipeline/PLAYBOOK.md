# Daily content run

This is what the scheduled Claude routine does every night. Read it fully before starting.
The repository is `dorgamliel/crumb`; the app lives in `crumb/`, and the live site is the build in
`docs/` on `main` (GitHub Pages serves `main` / `docs`, at https://dorgamliel.github.io/crumb/). Work directly on `main`.

**The prime rule: nothing blocks the run.** Every step below is allowed to fail. When a step
fails, note it for the run log and continue with the next step. A run that adds zero topics but
still extends the schedule and deploys is a successful run. Never leave `main` broken: only push
a build that passed validation and tests.

Budget: aim for about 15 new topics per run. Prefer fewer, better topics over more.

## 0. Set up

Crumb used to live inside `dorgamliel/ra` (an unrelated site). It no longer does: never commit to
or push to `dorgamliel/ra`. If `dorgamliel/crumb` is already checked out and attached for push in
this session, use that checkout. Otherwise call the `add_repo` tool (claude-code-remote) with
`owner: "dorgamliel"`, `repo: "crumb"`, `access: "push"` and clone it where that tool says. If that call is
refused or reports an access problem, do not stop: do the whole run, and at step 8 a refused push
falls back to the `crumb-run-<date>` branch, so nothing is lost.

Network: the content scripts use Node's fetch, which uses the session proxy only with
`NODE_USE_ENV_PROXY=1`. Export it before running `source.mjs` or `image.mjs`. If sources are
refused with 403 by the proxy, the environment does not allow those sites: stop writing (no topic
without opened sources), still run schedule, build and tests, and say so in the run log.

```sh
export NODE_USE_ENV_PROXY=1
cd <crumb checkout>   # the dorgamliel/crumb clone; check: git remote get-url origin
git checkout main && git pull --ff-only origin main
cd crumb && npm ci
```

## 1. Plan

- Open `content/state/backlog.json` (ideas not yet written). Take the first ~15 that are not
  already topics (`content/topics/<id>.json`) and not in `content/state/rejected.json`.
- If fewer than 40 ideas remain, add ~60 new ones to the end of the backlog first. Balance the six
  kinds, favor subjects that connect to existing topics, avoid anything whose main point would be
  food-safety-sensitive (home canning, raw meat or fish preparation, foraging, infused oils).
- Remove the chosen ideas from the backlog.

## 2. Write

Start up to 3 writer sub-agents in parallel, about 5 topics each. Give each one: its topic ids
and Hebrew names, the path to `pipeline/CONTENT-GUIDE.md`, three good existing topics to imitate
(e.g. `gluten`, `emulsions`, `tangzhong`), the list of all existing ids plus today's new ids as
valid relation targets, and these rules: sources only through `scripts/content/source.mjs`;
`image: null`; `status: "draft"`; `origin: "pipeline"`; `addedAt`/`updatedAt` = today; run
`node scripts/content/validate.mjs <ids>` and fix errors; write nothing else. Tell them to read the
"Voice", "Sources beyond Wikipedia", "Recipes", "Seasons" and "Quizzes" sections of the guide
first: every topic gets a `column`, a non-Wikipedia source, `season` when it has one, and dishes
and bakes cooked at home get a `recipe`. Across the batch: at least three columns, at most three
headlines starting with "למה".

### 2a. Polish older topics

Start one writer to improve 10 older topics listed by `node scripts/content/validate.mjs --legacy`
(quiz answers that give themselves away by length first, then takeaways starting "בפעם הבאה",
then topics without a non-Wikipedia source). Wording only: balance the quiz options, rewrite the
takeaway opening, add one opened non-Wikipedia source. In step 5 give each to a checker as
"edit check: <id>"; if the checker rejects an edit, restore the file with `git checkout -- <file>`.

### 2b. Recipes for existing topics

Start one more writer for recipes: pick 4 published topics of kind `dishes` or `baking` without
`recipe` (home-cooked first, Israeli first; `node -e` over `content/topics` finds them). For each,
find a tested recipe from a reputable publisher with `scripts/content/source.mjs`, and add it to
the topic as `recipeDraft` (same shape as `recipe`, with `source`). Do not touch anything else in
the file. Validate with `node scripts/content/validate.mjs <ids>`. In step 5, give each of these
topics to a checker as "recipe check: <id>".

If a writer fails or times out, continue with whatever topics exist.

## 3. Photos

For each new topic, and then for up to 30 older topics listed by
`node scripts/content/image.mjs pending` (every topic without a photo shows less often, so
clearing this list matters). The search tries Openverse first and fills from Wikimedia Commons
when Openverse is throttled or has too few results; a query that found nothing is retried on
the next run. Search in specific English words (e.g. "broccoli head", not the Hebrew name):

```sh
node scripts/content/image.mjs search "<specific english query>"
# look at .image-candidates/contact-<query>.jpg
node scripts/content/image.mjs use <topic-id> <candidate-key> "<Hebrew alt text>"
```

Choose only a sharp, appetizing photo that clearly shows the subject (rules in the content guide).
If nothing fits, leave the image null; the app draws artwork and a later run retries. If the
script exits with code 3 (rate limited), stop the photo step for this run.

## 4. Validate

`node scripts/content/validate.mjs <today's ids>`. For any topic that still fails after one fix
attempt, delete its file and add it back to the end of the backlog.

## 5. Independent check

Group the draft topics (all files with `"origin": "pipeline"` and `"status": "draft"`, including
leftovers from earlier runs) in threes. For each group, start a **fresh** sub-agent whose prompt is
the text of `pipeline/CHECKER.md` below its `---` line, with every `REPO` replaced by the
absolute path of the checkout, followed by the topic ids. Do not add any
context about how the topics were written. Run up to 5 checkers in parallel.

Then: `node scripts/content/finalize.mjs`. Passed topics go live; rejected ones are deleted and
logged; unchecked ones stay drafts (never published) and are checked next run.

## 6. Schedule

`node scripts/content/schedule.mjs --days 21 --rebuild-from <tomorrow>` (tomorrow's date in Israel,
YYYY-MM-DD). It keeps today and every past day exactly as they were, and rebuilds every future day
from the current library, so tonight's new topics appear in tomorrow's editions instead of three
weeks later. Future editions are locked in the app, so readers never see them change.

## 7. Build and test

```sh
node scripts/content/validate.mjs
npm run build
npx playwright test     # if the browser download is blocked: CHROMIUM_PATH=<an installed chrome> npx playwright test
```

If tests fail: read the failure. If a new topic causes it, move that topic back to draft
(`"status": "draft"`) so it is not published, rerun schedule, build and tests. If the failure is
not about content (or you cannot tell), do not deploy; commit only `content/` and
`pipeline/` changes that passed validation, and describe the failure in the run log.

## 8. Deploy

```sh
# Keep old files in docs/assets: phones that cached the previous page (GitHub caches it
# for 10 minutes) still request the old JS/CSS, and deleting them shows a broken page or 404.
git rm -r -q --ignore-unmatch ../docs/content && mkdir -p ../docs && cp -r dist/. ../docs/
cd .. && git add crumb docs
git commit -m "Crumb content run <date>: <n> new topics"
git push origin main     # on rejection: git pull --rebase origin main, rebuild if crumb/ changed, push again
```

Retry a failed push up to 4 times with backoff (2, 4, 8, 16 seconds). If GitHub refuses the push
for authorization (403), call `add_repo` again with `access: "push"` and retry once. If it still
fails, push the same commit to a new branch `crumb-run-<date>` instead so the work is not lost,
and say so in your reply.

## 9. Log

Write `crumb/content/state/runs/<date>.md` (include it in the commit): topics added, rejected
(with reasons), photos found and still pending, schedule horizon, test result, anything that
failed. Keep it short.
