import { useEffect, useRef, useState } from "react";
import { Archive, ArrowLeft, Bookmark, Compass, Lock, X } from "lucide-react";
import { editions, periods } from "../data/editions";
import { getTopic, useEdition, useTopics } from "../lib/content";
import { formatDate, formatHour } from "../lib/hebrew";
import { nav, parseHash } from "../lib/router";
import { currentSlot, isAvailable, isPublished, parseDateKey, parseSlot, sameSlot, slotKey, type Slot } from "../lib/schedule";
import { session, useStore } from "../lib/storage";
import type { EditionData, EditionMeta, LabId, Topic } from "../types";
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

function progressFor(edition: EditionData | undefined, read: string[], answers: Record<string, number>) {
  if (!edition) return { done: 0, total: 9 };
  const total = edition.topics.length + (edition.quiz ? 1 : 0);
  const done = edition.topics.filter((id) => read.includes(id)).length + (edition.quiz && answers[edition.quiz] !== undefined ? 1 : 0);
  return { done, total };
}

const labFor: Record<string, LabId> = { hydration: "hydration", emulsions: "emulsion", browning: "browning" };

type Module =
  | { type: "pair"; topics: [Topic, Topic] }
  | { type: "feature"; topic: Topic; kicker: string }
  | { type: "note"; topic: Topic }
  | { type: "spotlight"; topic: Topic }
  | { type: "quiz"; topic: Topic }
  | { type: "lab"; lab: LabId; topic: string }
  | { type: "strip"; topics: Topic[] }
  | { type: "compare"; topic: Topic }
  | { type: "steps"; topic: Topic };

/**
 * Turns an edition's topics into an editorial sequence. Topics that carry a special angle
 * (steps, a note, a comparison) get their own module; one ingredient gets the spotlight;
 * the rest become a pair, a horizontal strip or a closing feature.
 */
function layout(topics: Topic[], quizId?: string): Module[] {
  const rest = topics.slice(1);
  const take = (pred: (t: Topic) => boolean) => {
    const i = rest.findIndex(pred);
    return i >= 0 ? rest.splice(i, 1)[0] : undefined;
  };
  const steps = take((t) => !!t.angles?.steps);
  const note = take((t) => !!t.angles?.note);
  const compare = take((t) => !!t.angles?.compare);
  const spotlight = take((t) => t.kind === "ingredients" && t.facts.length >= 2);
  const quiz = topics.find((t) => t.id === quizId && t.quiz);
  const labTopic = topics.find((t) => labFor[t.id]);
  const out: Module[] = [];
  if (rest.length >= 2) out.push({ type: "pair", topics: [rest.shift()!, rest.shift()!] });
  if (steps) out.push({ type: "steps", topic: steps });
  if (note) out.push({ type: "note", topic: note });
  if (quiz) out.push({ type: "quiz", topic: quiz });
  if (spotlight) out.push({ type: "spotlight", topic: spotlight });
  if (compare) out.push({ type: "compare", topic: compare });
  if (labTopic) out.push({ type: "lab", lab: labFor[labTopic.id], topic: labTopic.id });
  if (rest.length >= 3) out.push({ type: "strip", topics: rest.splice(0) });
  else if (rest.length === 2) out.push({ type: "pair", topics: [rest[0], rest[1]] });
  else if (rest.length === 1) out.push({ type: "feature", topic: rest[0], kicker: "לקינוח" });
  return out;
}

const themeColors = { morning: "#f5ede0", afternoon: "#f3efe4", evening: "#1d1714" } as const;

export function Today({ now, visible }: { now: Date; visible: boolean }) {
  const { slot, auto, isManual, pending, choose, dismissPending } = useEditionSlot(now);
  const { read, answers, saved } = useStore();
  const meta = editions[slot.period];
  const edition = useEdition(slot);
  const { data: topics, error, retry } = useTopics(edition?.topics ?? []);
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
  const ready = edition && topics && topics.length > 0;
  const modules = ready ? layout(topics, edition.quiz) : [];
  const date = parseDateKey(slot.date);

  return (
    <div className="today" data-period={slot.period}>
      <div className={`minibar ${compact ? "minibar--show" : ""}`} aria-hidden={!compact}>
        <span className="minibar__title">מהדורת {meta.name}</span>
        <span className="minibar__count">
          <bdi>{done}</bdi> מתוך <bdi>{total}</bdi>
        </span>
        <span className="minibar__bar" style={{ "--p": `${(done / total) * 100}%` } as React.CSSProperties} />
      </div>

      {(() => {
        const top = (
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
              {formatDate(date)} · מהדורת {meta.name}
            </p>
            <h1 className="front__title" id="edition-title">
              {edition?.title ?? meta.fallbackTitle}
            </h1>
            <p className="front__sub">{edition?.subtitle ?? meta.fallbackSubtitle}</p>
          </>
        );
        if (ready) return <CoverCard topic={topics[0]} from="today" eager top={top} />;
        return (
          <div className="cover cover--front cover--loading">
            <div className="cover__top">{top}</div>
            <div className="cover__body">
              {error ? (
                <div className="load-error" role="alert">
                  <p>לא הצלחנו לטעון את המהדורה. אולי החיבור לאינטרנט נותק.</p>
                  <button type="button" className="pill-button" onClick={retry}>
                    לנסות שוב
                  </button>
                </div>
              ) : (
                <p className="cover__loading" role="status">
                  טוענים את המהדורה…
                </p>
              )}
            </div>
          </div>
        );
      })()}

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
        {modules.map((m, i) => (
          <ModuleView key={`${slot.date}-${slot.period}-${i}`} module={m} />
        ))}
      </div>

      {ready && <Ending meta={meta} topics={topics} done={done} total={total} savedCount={saved.length} />}

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

function ModuleView({ module: m }: { module: Module }) {
  switch (m.type) {
    case "pair":
      return (
        <div className="pair">
          <SmallCard topic={m.topics[0]} from="today" />
          <SmallCard topic={m.topics[1]} from="today" />
        </div>
      );
    case "feature":
      return <FeatureCard topic={m.topic} from="today" kicker={m.kicker} />;
    case "note":
      return <NoteCard topic={m.topic} from="today" kicker={m.topic.angles!.note!.kicker} text={m.topic.angles!.note!.text} />;
    case "spotlight":
      return <SpotlightCard topic={m.topic} from="today" />;
    case "quiz":
      return <Quiz topic={m.topic} from="today" />;
    case "lab":
      return <Lab id={m.lab} from="today" />;
    case "strip":
      return <Strip title="עוד במהדורה" topics={m.topics} from="today" />;
    case "compare":
      return <CompareCard topic={m.topic} from="today" title={m.topic.angles!.compare!.title} sides={m.topic.angles!.compare!.sides} />;
    case "steps":
      return <StepsCard topic={m.topic} from="today" title={m.topic.angles!.steps!.title} steps={m.topic.angles!.steps!.steps} />;
  }
}

function Ending({ meta, topics, done, total, savedCount }: { meta: EditionMeta; topics: Topic[]; done: number; total: number; savedCount: number }) {
  const ids = topics.map((t) => t.id);
  // Suggest one connection that leads outside this edition.
  const onward = topics.flatMap((t) => t.related).find((r) => !ids.includes(r.target) && getTopic(r.target));
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
      <p className="ending__next">{meta.closing} ועד אז, אפשר גם פשוט לסגור את האפליקציה.</p>
    </section>
  );
}
