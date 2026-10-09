# Crumb · משהו טעים לגלות

A mobile-first, Hebrew-first web app for a few idle minutes of culinary curiosity.
Each edition ends. The connected knowledge underneath it stays open to explore.

**Finite consumption. Infinite knowledge.**

## Run it

Requires Node.js 20.19+ (developed on Node 22).

```sh
cd crumb
npm install
npm run dev          # http://localhost:5180 (also listens on the local network)
```

Production build and preview:

```sh
npm run build
npm run preview      # http://localhost:4180
```

To open it on a phone on the same Wi-Fi, use the **Network** address Vite prints
(for example `http://192.168.1.20:5180`), not `localhost`. That is a temporary
development address, not a public website.

Tests (Playwright + axe; they build the app and serve it on port 5188):

```sh
npx playwright install chromium   # once, if no Chromium matching @playwright/test 1.56 is installed
npm test
```

## Content that keeps coming

New topics are written, independently checked and published automatically every night by a
scheduled Claude routine. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for how it works
(with diagrams), and `pipeline/` for the playbook, the content guide and the checker's brief.

Content commands:

```sh
npm run content                                   # compile content/ into public/content/
node scripts/content/validate.mjs [ids…]          # structural and Hebrew checks
node scripts/content/schedule.mjs --days 21       # extend the edition schedule
node scripts/content/image.mjs search "<query>"   # find openly licensed photos (cached)
node scripts/content/source.mjs <url> --grep …    # read a source page (cached)
node scripts/content/finalize.mjs                 # apply the checker's verdicts
```

## What is in it

- **היום (Today)**: three finite editions a day (08:00, 13:00, 19:00, local time).
  Before 08:00 you see the previous evening's edition. Each edition has its own colors
  (a warm morning, a bright afternoon, a dark evening), a magazine-style cover, and a
  varied sequence: paired stories, a typographic note, an ingredient spotlight, a
  comparison, a short technique, a quiz, an interactive explanation, a horizontal
  collection, and an ending that suggests one connection and then lets you stop.
  Future editions are locked until they are published. If a new edition arrives while
  you are reading, it is offered rather than swapped in. The archive lists every edition
  since launch (9 October 2026), up to the last 60 days.
- **אטלס (Atlas)**: Hebrew search that ignores niqqud, punctuation and common prefixes
  (ה, ו, ב, ל, מ, ש, כ). Category filters, a connection map that recenters on the
  branch you pick, with a breadcrumb of where you've been, and a list of every topic.
- **לומדים (Learn)**: 8 quizzes and 3 interactive explanations (dough hydration,
  emulsions, browning), with no scores or streaks.
- **שמורים (Saved)**: saved topics with undo, plus recent reading. Stored on this
  device only.
- **Articles**: full-page reading view with a morphing hero image (View Transitions,
  where supported), reading progress, breadcrumbs, back / close-to-origin, a quick-facts
  box, a "try it in the kitchen" box, a related quiz, a connection map, explained
  relations, and sources plus editorial status.

## Structure

```text
src/
  types.ts              typed content model (Topic, Relation, Edition, Placement…)
  data/                 topics, quizzes, editions, images (with credits), relation labels
  lib/                  router (hash + history chain), storage, schedule, Hebrew text utils
  components/           cards, quiz, connection map, picture, save, tab bar, toast
  labs/                 the three interactive explanations
  features/             Today, Atlas, Learn, Saved, Article, ArchiveDialog
tests/                  app, accessibility (axe), Hebrew/RTL
scripts/                icon rasterizer and screenshot helpers used during development
public/img/             locally stored photos (720px and up to 1400px WebP)
```

Each topic is one reusable entity. Feed placements, articles, quizzes, the map and
search all read the same record. Relations are typed (`process`, `explains`,
`ingredient`, `technique`, `relative`, `affects`, `example`) and each one carries a
sentence explaining *why* the two topics connect.

Routes: `#/today`, `#/atlas`, `#/learn`, `#/saved`, and `#/<tab>/<topic>/<topic>…`
for an exploration trail. Every history entry records how many in-app steps lead back
to the tab, so "close" and breadcrumbs rewind real history when they can, and still
work after a refresh or from a direct link.

Storage keys use the `crumb:v2:` prefix so this version can run beside the earlier one.
Topic IDs are unchanged, and `crumb:v1:` saved items, reading history and quiz answers
are imported once. Malformed or blocked storage falls back to memory.

## Honest limitations

- **Content is AI-written.** Pipeline topics are marked "automatically checked" once an
  independent checker has verified them against their sources; the launch topics are marked
  "editorial draft" or "draft with sources". Linked sources (mostly English Wikipedia, plus King Arthur
  Baking and the National Center for Home Food Preservation) support particular claims.
  They do not certify an article, and nothing has been professionally fact-checked.
- Each edition has 9 counted discoveries (8 topics + 1 quiz), so a day has 27.
- **Photos** are stored locally (no remote image dependency). Wikimedia Commons and
  rawpixel credits come from the files' own pages. For the Unsplash photos, the
  photographer was not verified, so the credit says so rather than guessing. Licensing
  review is not production-complete.
- Fonts (Heebo, Frank Ruhl Libre, DM Serif Display) are bundled via Fontsource, so the
  app makes no runtime requests to Google Fonts.
- **PWA**: manifest, icons and safe-area handling only. There is no service worker, so
  offline use is not supported.
- No accounts and no sync between devices.
- Tested in headless Chromium at 320–1280px. It has not been tested on physical iOS or
  Android devices, or in Safari or Firefox.
- The connection map is a small radial view of one topic and its direct relations,
  not a full graph.
- Interactive explanations are illustrations, not calibrated simulations or cooking instructions.
