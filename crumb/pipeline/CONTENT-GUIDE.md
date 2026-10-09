# Crumb content guide

The rules every topic follows. Writers follow them while drafting; the independent checker
uses them while reviewing. A topic is one JSON file: `content/topics/<id>.json`.

## What a topic is

One culinary subject: an ingredient, dish, technique, scientific idea, drink, or piece of
equipment. It must be specific enough to say something surprising and useful in about three
minutes of reading. "Garlic" is a topic. "Vegetables" is too broad. "The 1987 garlic festival"
is too narrow.

Readers are curious home cooks reading for a few idle minutes. They want to learn *why* things
happen, be surprised, and come away with one thing they could try.

## The file

```jsonc
{
  "id": "garlic",                      // lowercase-kebab-case English, permanent, never shown
  "name": "שום",                       // the subject in plain Hebrew, ≤ 40 chars
  "headline": "למה שום כתוש חריף יותר?",   // editorial headline, ≤ 70 chars; a question or a short claim
  "dek": "…",                          // 1–2 sentences that make you want to read on (30–260 chars)
  "kind": "ingredients",               // baking | science | ingredients | dishes | drinks | techniques
  "minutes": 3,                        // reading time, 2–4
  "image": null,                       // filled by scripts/content/image.mjs — never write by hand
  "body": ["…", "…", "…"],            // 3 paragraphs (2–5 allowed), each 80–900 chars
  "facts": ["…", "…", "…"],            // 3 short facts for the "quick look" box, each ≤ 90 chars
  "takeaway": "…",                     // one concrete thing to try in the kitchen (40–400 chars)
  "related": [                         // 3–5 connections; at least 2 must point to existing topics
    { "target": "browning", "kind": "process", "why": "…" }   // why: one Hebrew sentence ≤ 160 chars
  ],
  "sources": [                         // 1–3 real pages that support the main claims
    { "title": "Garlic", "publisher": "Wikipedia (באנגלית)", "url": "https://en.wikipedia.org/wiki/Garlic", "supports": "…" }
  ],
  "status": "auto-checked",            // set only after the checker passes it
  "updatedAt": "2026-10-10",
  "addedAt": "2026-10-10",
  "keywords": ["…"],                   // Hebrew synonyms and related words for search; never shown
  "quiz": {                            // optional but wanted for most topics
    "question": "…", "options": ["…", "…", "…", "…"], "correct": 1, "explanation": "…"
  },
  "angles": {                          // optional; give each topic at most one
    "note":    { "kicker": "ידעתם?", "text": "…" },
    "compare": { "title": "…", "sides": [{ "label": "…", "text": "…" }, { "label": "…", "text": "…" }] },
    "steps":   { "title": "…", "steps": ["…", "…", "…"] }
  },
  "origin": "pipeline",
  "review": { "checkedAt": "2026-10-10", "notes": "…" }   // written by the pipeline from the checker's verdict
}
```

Relation kinds describe what the *target* is to this topic: `process` (shares a process),
`explains` (the target explains this), `ingredient`, `technique`, `relative` (close cousin),
`affects` (changes the outcome), `example` (an example of this in the kitchen).

## Accuracy

- Every factual claim must be supported by one of the listed sources, or be common culinary
  knowledge that any reputable cookbook states. If you are not sure, leave the claim out.
- Never invent sources, quotes, studies, dates, names, numbers, or origins. Only cite pages you
  actually opened. Prefer Wikipedia (en/he), Wikidata, university extension services, USDA,
  NCHFP, national food-safety agencies, and established culinary publishers.
- Numbers (temperatures, percentages, times) need a source or a hedge ("בערך", "בדרך כלל").
- History and origins are often disputed; say so ("לפי אחת הגרסאות", "מקובל לייחס").
- **Food safety**: never give instructions that could make someone sick. Preservation,
  canning, fermentation, raw eggs, raw fish, raw meat, home-made infused oils, botulism risk,
  allergies and temperatures for meat and poultry: either point to a tested recipe or an
  official guideline, or leave the topic out. No medical or nutrition claims.
- The quiz must agree with the article, have exactly one defensibly correct answer, and plausible
  wrong answers. Its explanation teaches the reason.

## Hebrew

Write as if the product was conceived in Hebrew.

- Plain, idiomatic, warm. Short sentences. No translated English sentence structures.
- Address readers in the plural ("נסו", "שימו לב"). Never "בחר/י" or slashes.
- No exclamation marks, no emoji, no marketing words ("קסום", "מהפכני", "סוד ש…לא רוצים שתדעו").
- Explain technical terms in simple words the first time they appear.
- Use the same terms as existing topics (תחליב, השחמה, תגובת מייאר, ג׳לטיניזציה, גלוטן, מיצוי).
- Use ־ (maqaf) after a prefix before a number: ב־180 מעלות, ל־500 גרם.
- Use Hebrew geresh ׳ in transliterations: ג׳ינג׳ר, צ׳ילי.
- No Latin letters in Hebrew fields. A botanical name is the only exception, written as
  `בשם Piper nigrum` or in parentheses.
- Headlines are interesting without being clickbait. Good: "לפעמים הבצק פשוט צריך לנוח.",
  "מה משנה את הטעם של הקפה?", "אותו קמח, בצק אחר.".

## Photos

`node scripts/content/image.mjs search "<specific english query>"` makes a contact sheet. Look
at it and choose only a photo that clearly shows the subject itself, is appetizing, sharp, and
has no text, watermark, people's faces as the subject, or brand packaging as the focus. If none
qualifies, leave `image` null. The app draws artwork instead, and a later run tries again.
Write Hebrew alt text that describes what is actually in the photo.
