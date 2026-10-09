import { useEffect, useRef, useState } from "react";
import { Archive, ArrowLeft, Bookmark, Compass, Lock, X } from "lucide-react";
import { editions, editionQuiz, editionTopics, periods } from "../data/editions";
import { getTopic } from "../data/topics";
import { formatDate, formatHour } from "../lib/hebrew";
import { nav, parseHash } from "../lib/router";
import { currentSlot, isAvailable, isPublished, parseDateKey, parseSlot, sameSlot, slotKey, type Slot } from "../lib/schedule";
import { session, useStore } from "../lib/storage";
import type { Edition, Placement } from "../types";
import {
  CompareCard,
  CoverCard,
  FeatureCard,
  NoteCard,
  SmallCard,
  SpotlightCard,
  StepsCard,
  Strip,
} from "../components/Cards";
import { Quiz } from "../components/Quiz";
import { Lab } from "../labs";
import { ArchiveDialog } from "./ArchiveDialog";

const MANUAL_KEY = "edition";

/**
 * Chooses which edition to show. Automatic by default; a manual pick (from the switcher or
 * the archive) lasts for the browser session. When a newer edition is published while the
 * reader is mid-edition, it is offered rather than swapped in under them.
 */
export function useEditionSlot(now: Date) {
  const auto = currentSlot(now);
  const [manual, setManual] = useState<Slot | null>(() => {
    const s = parseSlot(session.get(MANUAL_KEY));
    return s && isAvailable(s, now) ? s : null;
  });
  const [held, setHeld] = useState<Slot>(auto);
  const [pending, setPending] = useState<Slot | null>(null);

  useEffect(() => {
    if (manual || sameSlot(held, auto)) return;
    // The URL updates before a view transition commits, so it is the freshest signal.
    const r = parseHash(location.hash);
    const busy = r.trail.length > 0 || (r.tab === "today" && window.scrollY > 240);
    if (busy) setPending(auto);
    else {
      setHeld(auto);
      setPending(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.date, auto.period, manual]);

  const slot = manual ?? held;

  const choose = (s: Slot | null) => {
    const next = s && !sameSlot(s, auto) ? s : null;
    setManual(next);
    session.set(MANUAL_KEY, next ? slotKey(next) : null);
    if (!next) setHeld(auto);
    setPending(null);
    window.scrollTo({ top: 0 });
  };

  return { slot, auto, isManual: !!manual, pending, choose, dismissPending: () => setPending(null) };
}

function progressFor(edition: Edition, read: string[], answers: Record<string, number>) {
  const ids = editionTopics(edition);
  const quiz = editionQuiz(edition);
  const total = ids.length + (quiz ? 1 : 0);
  const done = ids.filter((id) => read.includes(id)).length + (quiz && answers[quiz] !== undefined ? 1 : 0);
  return { done, total };
}

const themeColors = { morning: "#f5ede0", afternoon: "#f3efe4", evening: "#1d1714" } as const;

export function Today({ now, visible }: { now: Date; visible: boolean }) {
  const { slot, auto, isManual, pending, choose, dismissPending } = useEditionSlot(now);
  const { read, answers, saved } = useStore();
  const edition = editions[slot.period];
  const { done, total } = progressFor(edition, read, answers);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const headRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (visible) html.dataset.period = slot.period;
    else delete html.dataset.period;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", visible ? themeColors[slot.period] : themeColors.morning);
  }, [visible, slot.period]);

  const isCurrent = sameSlot(slot, auto);
  const [cover, ...rest] = edition.placements as [Extract<Placement, { type: "cover" }>, ...Placement[]];
  const date = parseDateKey(slot.date);

  return (
    <div className="today" data-period={slot.period}>
      <div className={`minibar ${compact ? "minibar--show" : ""}`} aria-hidden={!compact}>
        <span className="minibar__title">מהדורת {edition.name}</span>
        <span className="minibar__count">
          <bdi>{done}</bdi> מתוך <bdi>{total}</bdi>
        </span>
        <span className="minibar__bar" style={{ "--p": `${(done / total) * 100}%` } as React.CSSProperties} />
      </div>

      <CoverCard
        id={cover.topic}
        from="today"
        eager
        top={
          <>
            <div className="masthead">
              <div>
                <p className="wordmark" lang="en" dir="ltr">
                  crumb
                </p>
                <p className="masthead__tag">משהו טעים לגלות.</p>
              </div>
              <button type="button" className="icon-button masthead__archive" onClick={() => setArchiveOpen(true)} aria-haspopup="dialog">
                <Archive size={20} aria-hidden="true" />
                <span className="sr-only">ארכיון מהדורות</span>
              </button>
            </div>
            <p className="front__date">
              {formatDate(date)} · מהדורת {edition.name}
            </p>
            <h1 className="front__title" id="edition-title">
              {edition.title}
            </h1>
            <p className="front__sub">{edition.subtitle}</p>
          </>
        }
      />

      {pending && (
        <div className="notice" role="status">
          <p>מהדורת ה{editions[pending.period].name} כבר כאן.</p>
          <div className="notice__actions">
            <button type="button" className="pill-button" onClick={() => choose(null)}>
              לעבור אליה
            </button>
            <button type="button" className="icon-button" onClick={dismissPending} aria-label="אחר כך">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <section className="edition-head" ref={headRef} aria-label="בחירת מהדורה והתקדמות">
        <div className="dayparts" role="group" aria-label="בחירת מהדורה">
          {periods.map((p) => {
            const s = { date: slot.date, period: p };
            const published = isPublished(s, now);
            const active = p === slot.period;
            return (
              <button
                key={p}
                type="button"
                className={`daypart ${active ? "daypart--active" : ""}`}
                aria-pressed={active}
                disabled={!published}
                onClick={() => choose(s)}
              >
                <span className="daypart__name">{editions[p].name}</span>
                <span className="daypart__time">
                  {!published && <Lock size={11} aria-hidden="true" />}
                  <bdi>{formatHour(editions[p].hour)}</bdi>
                  {!published && <span className="sr-only">, עוד לא פורסמה</span>}
                </span>
              </button>
            );
          })}
        </div>

        {isManual && !isCurrent && (
          <p className="edition-head__manual">
            בחרתם מהדורה קודמת.{" "}
            <button type="button" className="text-button" onClick={() => choose(null)}>
              חזרה למהדורה העדכנית
            </button>
          </p>
        )}

        <div className="progress" aria-label={`עברתם על ${done} מתוך ${total} גילויים במהדורה`} role="img">
          <ol className="progress__crumbs" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <li key={i} className={i < done ? "on" : ""} />
            ))}
          </ol>
          <span className="progress__label" aria-hidden="true">
            <bdi>{done}</bdi> מתוך <bdi>{total}</bdi> גילויים
          </span>
        </div>
      </section>

      <div className="feed">
        {rest.map((p, i) => (
          <PlacementView key={`${slot.period}-${i}`} placement={p} />
        ))}
      </div>

      <Ending edition={edition} done={done} total={total} savedCount={saved.length} />

      <ArchiveDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        now={now}
        current={slot}
        onChoose={(s) => {
          setArchiveOpen(false);
          choose(s);
        }}
      />
    </div>
  );
}

function PlacementView({ placement: p }: { placement: Placement }) {
  switch (p.type) {
    case "cover":
      return <CoverCard id={p.topic} from="today" />;
    case "pair":
      return (
        <div className="pair">
          <SmallCard id={p.topics[0]} from="today" />
          <SmallCard id={p.topics[1]} from="today" />
        </div>
      );
    case "feature":
      return <FeatureCard id={p.topic} from="today" kicker={p.kicker} />;
    case "note":
      return <NoteCard id={p.topic} from="today" kicker={p.kicker} text={p.text} />;
    case "spotlight":
      return <SpotlightCard id={p.topic} from="today" />;
    case "quiz":
      return <Quiz id={p.quiz} from="today" />;
    case "lab":
      return <Lab id={p.lab} from="today" />;
    case "strip":
      return <Strip title={p.title} ids={p.topics} from="today" />;
    case "compare":
      return <CompareCard id={p.topic} from="today" title={p.title} sides={p.sides} />;
    case "steps":
      return <StepsCard id={p.topic} from="today" title={p.title} steps={p.steps} />;
  }
}

function Ending({ edition, done, total, savedCount }: { edition: Edition; done: number; total: number; savedCount: number }) {
  const ids = editionTopics(edition);
  // Suggest one connection that leads outside this edition.
  const onward = ids.flatMap((id) => getTopic(id)!.related).find((r) => !ids.includes(r.target));
  const onwardTopic = onward && getTopic(onward.target);
  return (
    <section className="ending" aria-labelledby="ending-title">
      <span className="ending__mark" aria-hidden="true" />
      <h2 className="ending__title" id="ending-title">
        זה הכול להפעם.
      </h2>
      <p className="ending__sub">אולי מתחשק לבשל?</p>
      <p className="ending__status">
        {done === total ? "עברתם על כל המהדורה." : <>עברתם על <bdi>{done}</bdi> מתוך <bdi>{total}</bdi> גילויים. השאר יחכו כאן.</>}
      </p>
      <div className="ending__actions">
        {onwardTopic && (
          <button type="button" className="ending__onward" onClick={() => nav.openTopic(onwardTopic.id, { from: "today", fresh: true })}>
            <span className="eyebrow">להמשיך לחקור</span>
            <span className="ending__onward-name">{onwardTopic.name}</span>
            <span className="ending__onward-why">{onward!.why}</span>
            <ArrowLeft size={18} aria-hidden="true" className="ending__onward-arrow" />
          </button>
        )}
        <div className="ending__links">
          <button type="button" className="pill-button pill-button--quiet" onClick={() => nav.tab("atlas")}>
            <Compass size={16} aria-hidden="true" />
            לאטלס
          </button>
          <button type="button" className="pill-button pill-button--quiet" onClick={() => nav.tab("saved")}>
            <Bookmark size={16} aria-hidden="true" />
            {savedCount ? `לשמורים (${savedCount})` : "לשמורים"}
          </button>
        </div>
      </div>
      <p className="ending__next">{edition.closing} ועד אז, אפשר גם פשוט לסגור את האפליקציה.</p>
    </section>
  );
}
