# Daily content run

This is what the scheduled Claude routine does every night. Read it fully before starting.
The repository is `dorgamliel/ra`; the app lives in `crumb/`, and the live site is the build in
`crumb-app/` on `main` (GitHub Pages). Work directly on `main`.

**The prime rule: nothing blocks the run.** Every step below is allowed to fail. When a step
fails, note it for the run log and continue with the next step. A run that adds zero topics but
still extends the schedule and deploys is a successful run. Never leave `main` broken: only push
a build that passed validation and tests.

Budget: aim for about 15 new topics per run. Prefer fewer, better topics over more.

## 0. Set up

```sh
cd /home/user/ra   # or wherever the repo is cloned
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
`node scripts/content/validate.mjs <ids>` and fix errors; write nothing else.

If a writer fails or times out, continue with whatever topics exist.

## 3. Photos

For each new topic, and then for up to 10 older topics listed by
`node scripts/content/image.mjs pending`:

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
the text of `pipeline/CHECKER.md` below its `---` line, followed by the topic ids. Do not add any
context about how the topics were written. Run up to 5 checkers in parallel.

Then: `node scripts/content/finalize.mjs`. Passed topics go live; rejected ones are deleted and
logged; unchecked ones stay drafts (never published) and are checked next run.

## 6. Schedule

`node scripts/content/schedule.mjs --days 21` — fills any missing day from today to three weeks
ahead. Already-scheduled days never change.

## 7. Build and test

```sh
node scripts/content/validate.mjs
npm run build
npx playwright test
```

If tests fail: read the failure. If a new topic causes it, move that topic back to draft
(`"status": "draft"`) so it is not published, rerun schedule, build and tests. If the failure is
not about content (or you cannot tell), do not deploy; commit only `content/` and
`pipeline/` changes that passed validation, and describe the failure in the run log.

## 8. Deploy

```sh
rm -rf ../crumb-app && cp -r dist ../crumb-app
cd .. && git add crumb crumb-app
git commit -m "Crumb content run <date>: <n> new topics"
git push origin main     # on rejection: git pull --rebase origin main, rebuild if crumb/ changed, push again
```

Retry a failed push up to 4 times with backoff (2, 4, 8, 16 seconds).

## 9. Log

Write `crumb/content/state/runs/<date>.md` (include it in the commit): topics added, rejected
(with reasons), photos found and still pending, schedule horizon, test result, anything that
failed. Keep it short.
