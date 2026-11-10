import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Share2 } from "lucide-react";
import { allTopics, getTopic, useTopic } from "../lib/content";
import { kindLabels } from "../data/relations";
import { hash } from "../lib/hash";
import { matches, normalize } from "../lib/hebrew";
import { nav } from "../lib/router";
import { LAUNCH_DATE, dateKey, parseDateKey } from "../lib/schedule";
import { store, useStore } from "../lib/storage";
import { shareText } from "../lib/share";
import { useToast } from "../components/Toast";
import type { Tab, TopicCard } from "../types";

// "מה בצלחת?" – one mystery dish, ingredient, bake or drink a day. The photo starts as an extreme
// close-up and zooms out with every wrong guess, while text clues add up. Five guesses.
// Finishing gives a spoiler-free emoji line to share, Wordle style: it shows how it went without
// giving the answer away, so sharing invites friends instead of spoiling it for them.

export const MAX_GUESSES = 5;
const ZOOM = [5.2, 3.3, 2.2, 1.45, 1.12, 1];
const GAME_KINDS = new Set(["dishes", "ingredients", "baking", "drinks"]);

export const gameNumber = (date: string) =>
  Math.round((parseDateKey(date).getTime() - parseDateKey(LAUNCH_DATE).getTime()) / 86400000) + 1;

/** The answer for a date: a stable rotation through photographed, guessable topics. */
export function puzzleFor(date: string): TopicCard | undefined {
  const pool = allTopics()
    .filter((t) => t.image && GAME_KINDS.has(t.kind) && t.name.length <= 18)
    .sort((a, b) => hash("crumb-game:" + a.id) - hash("crumb-game:" + b.id));
  if (!pool.length) return undefined;
  return pool[((gameNumber(date) % pool.length) + pool.length) % pool.length];
}

/** Replaces the answer's name (and its words, with common prefixes) so clues do not give it away. */
function redact(text: string, name: string): string {
  const words = [name, ...name.split(/\s+/)].filter((w) => w.length >= 3);
  let out = text;
  for (const w of words.sort((a, b) => b.length - a.length)) {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(^|[\\s"'(״׳־-])(?:[והבלמשכ]{0,2}־?)${esc}`, "g"), "$1…");
  }
  return out;
}

type Mark = "hit" | "near" | "miss";

function markFor(guessId: string, answer: TopicCard): Mark {
  if (guessId === answer.id) return "hit";
  return getTopic(guessId)?.kind === answer.kind ? "near" : "miss";
}

const EMOJI: Record<Mark, string> = { hit: "🟩", near: "🟨", miss: "⬜" };

function untilMidnight(now: Date) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} שעות ו־${m} דקות` : `${m} דקות`;
}

export function Game({ now, from, compact }: { now: Date; from: Tab; compact?: boolean }) {
  const date = dateKey(now);
  const answer = useMemo(() => puzzleFor(date), [date]);
  const { games } = useStore();
  const day = games[date] ?? { guesses: [], solved: false };
  const { data: full } = useTopic(answer?.id ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(!compact);
  const toast = useToast();
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const finished = day.solved || day.guesses.length >= MAX_GUESSES;
  const stage = finished ? ZOOM.length - 1 : day.guesses.length;

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [];
    return allTopics()
      .filter((t) => !day.guesses.includes(t.id) && matches(normalize(`${t.name} ${t.keywords.join(" ")}`), query))
      .sort((a, b) => Number(!normalize(a.name).startsWith(q)) - Number(!normalize(b.name).startsWith(q)) || a.name.length - b.name.length)
      .slice(0, 6);
  }, [query, day.guesses]);

  useEffect(() => setQuery(""), [day.guesses.length]);

  if (!answer || !answer.image) return null;

  const guess = (t: TopicCard) => {
    store.guess(date, t.id, t.id === answer.id);
    if (t.id !== answer.id) requestAnimationFrame(() => inputRef.current?.focus());
  };

  const marks = day.guesses.map((g) => markFor(g, answer));
  const shareLine = () => {
    const score = day.solved ? `${day.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    return `crumb · מה בצלחת? #${gameNumber(date)}\n${marks.map((m) => EMOJI[m]).join("")} ${score}`;
  };

  const clues: string[] = [];
  if (stage >= 1) clues.push(`רמז ראשון: זה מהמדור ${kindLabels[answer.kind]}.`);
  if (stage >= 2 && full) clues.push(redact(full.dek, answer.name));
  if (stage >= 3) clues.push(`בשם יש ${answer.name.replace(/\s/g, "").length} אותיות, והוא מתחיל ב־${answer.name[0]}.`);
  if (stage >= 4 && full?.facts[0]) clues.push(redact(full.facts[0], answer.name));

  const img = answer.image;
  const origin = `${30 + (hash(answer.id) % 40)}% ${30 + (hash(answer.id + "y") % 40)}%`;

  if (!open) {
    return (
      <section className="game game--teaser" aria-labelledby={`${inputId}-t`}>
        <button type="button" className="game__open" onClick={() => setOpen(true)}>
          <span className="game__thumb" aria-hidden="true">
            <img
              src={`${import.meta.env.BASE_URL}img/${img.key}-720.webp`}
              alt=""
              style={{ transform: `scale(${ZOOM[stage]})`, transformOrigin: origin }}
              loading="lazy"
            />
          </span>
          <span className="game__teaser-text">
            <span className="eyebrow">חידת היום · #{gameNumber(date)}</span>
            <span className="game__title" id={`${inputId}-t`}>
              מה בצלחת?
            </span>
            <span className="game__teaser-sub">
              {finished
                ? day.solved
                  ? `פתרתם ב־${day.guesses.length} ניחושים. החידה הבאה מחר.`
                  : "הפעם זה חמק. החידה הבאה מחר."
                : day.guesses.length
                  ? `נשארו ${MAX_GUESSES - day.guesses.length} ניחושים`
                  : "תקריב אחד, חמישה ניחושים"}
            </span>
          </span>
          <ArrowLeft size={18} aria-hidden="true" className="game__arrow" />
        </button>
      </section>
    );
  }

  return (
    <section className="game" aria-labelledby={`${inputId}-t`}>
      <div className="game__head">
        <p className="eyebrow">חידת היום · #{gameNumber(date)}</p>
        <h2 className="game__title" id={`${inputId}-t`}>
          מה בצלחת?
        </h2>
        {!finished && <p className="game__how">תקריב של משהו מהמטבח. כל ניחוש שגוי מרחיק את המצלמה ומוסיף רמז.</p>}
      </div>

      <div className="game__frame" data-stage={stage}>
        <img
          src={`${import.meta.env.BASE_URL}img/${img.key}-720.webp`}
          alt={finished ? img.alt : "תקריב של המנה או חומר הגלם של היום"}
          width={img.width}
          height={img.height}
          style={{ transform: `scale(${ZOOM[stage]})`, transformOrigin: origin }}
        />
        <ol className="game__dots" aria-label={`${day.guesses.length} מתוך ${MAX_GUESSES} ניחושים`}>
          {Array.from({ length: MAX_GUESSES }, (_, i) => (
            <li key={i} className={marks[i] ? `game__dot game__dot--${marks[i]}` : "game__dot"} />
          ))}
        </ol>
      </div>

      {clues.length > 0 && (
        <ul className="game__clues" aria-live="polite">
          {clues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      {day.guesses.length > 0 && (
        <ol className="game__guesses" aria-label="הניחושים שלכם">
          {day.guesses.map((g, i) => (
            <li key={g} className={`game__guess game__guess--${marks[i]}`}>
              <span aria-hidden="true">{EMOJI[marks[i]]}</span> {getTopic(g)?.name ?? g}
              <span className="sr-only">
                {marks[i] === "hit" ? ", נכון" : marks[i] === "near" ? ", לא, אבל מאותו מדור" : ", לא"}
              </span>
            </li>
          ))}
        </ol>
      )}

      {!finished ? (
        <div className="game__input">
          <label htmlFor={inputId} className="sr-only">
            הניחוש שלכם
          </label>
          <div className="game__field">
            <Search size={18} aria-hidden="true" />
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              placeholder="מה זה לדעתכם?"
              value={query}
              aria-controls={listId}
              aria-autocomplete="list"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) {
                  e.preventDefault();
                  guess(suggestions[0]);
                }
              }}
            />
          </div>
          <ul className="game__suggestions" id={listId} role="list" aria-label="הצעות">
            {suggestions.map((t) => (
              <li key={t.id}>
                <button type="button" className="game__suggestion" onClick={() => guess(t)}>
                  {t.name}
                  <span className="game__suggestion-kind">{kindLabels[t.kind]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="game__legend">
            <span aria-hidden="true">🟨</span> לא זה, אבל מאותו מדור · <span aria-hidden="true">⬜</span> רחוק
          </p>
        </div>
      ) : (
        <div className="game__done" role="status">
          <p className="game__verdict">
            {day.solved ? (
              <>
                {day.guesses.length === 1 ? "בניחוש הראשון. מרשים." : `פתרתם ב־${day.guesses.length} ניחושים.`} זה היה <strong>{answer.name}</strong>.
              </>
            ) : (
              <>
                הפעם זה חמק. זה היה <strong>{answer.name}</strong>.
              </>
            )}
          </p>
          <div className="game__actions">
            <button
              type="button"
              className="pill-button"
              onClick={async () => {
                const r = await shareText(shareLine(), `${location.origin}${location.pathname}#/today`);
                if (r === "copied") toast("התוצאה הועתקה. אפשר להדביק לחברים");
              }}
            >
              <Share2 size={16} aria-hidden="true" />
              לשתף בלי לגלות
            </button>
            <button type="button" className="pill-button pill-button--quiet" onClick={() => nav.openTopic(answer.id, { from, fresh: true })}>
              לקרוא על {answer.name}
            </button>
          </div>
          <p className="game__next">החידה הבאה בעוד {untilMidnight(now)}.</p>
        </div>
      )}
    </section>
  );
}
