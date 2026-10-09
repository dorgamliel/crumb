import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ExternalLink, Lightbulb, X } from "lucide-react";
import { getTopic, useTopic } from "../lib/content";
import { kindLabels, relationLabels } from "../data/relations";
import { HERO_NAME, nav } from "../lib/router";
import { minutesLabel } from "../lib/hebrew";
import { parseDateKey } from "../lib/schedule";
import { store } from "../lib/storage";
import type { Route, Tab, Topic } from "../types";
import { Picture } from "../components/Picture";
import { SaveButton } from "../components/SaveButton";
import { ConnectionMap } from "../components/ConnectionMap";
import { Quiz } from "../components/Quiz";

export const tabLabels: Record<Tab, string> = { today: "היום", atlas: "אטלס", learn: "לומדים", saved: "שמורים" };
const returnLabels: Record<Tab, string> = {
  today: "חזרה למהדורה",
  atlas: "חזרה לאטלס",
  learn: "חזרה ללמידה",
  saved: "חזרה לשמורים",
};

const updatedFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });

const statusText = {
  draft: {
    label: "טיוטה עריכתית",
    text: "הכתבה נכתבה כתוכן הדגמה ועדיין לא נבדקה מול מקורות. היא לא מהווה מקור מאומת.",
  },
  "source-linked": {
    label: "טיוטה עם מקורות",
    text: "חלק מהטענות נשענות על המקורות שלמטה, אבל הכתבה כולה עדיין לא עברה בדיקה מקצועית מלאה.",
  },
  "auto-checked": {
    label: "נבדק אוטומטית",
    text: "הכתבה נכתבה בעזרת בינה מלאכותית ונבדקה מול המקורות שלמטה על ידי בודק אוטומטי נפרד. זו בדיקה טובה, אבל לא בדיקה של עורך אנושי.",
  },
};

function useReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return p;
}

export function Article({ route }: { route: Route }) {
  const id = route.trail[route.trail.length - 1];
  const topic = getTopic(id)!;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const progress = useReadingProgress();
  const { data: full, error, retry } = useTopic(id);
  const origin = tabLabels[route.tab];

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);

  useEffect(() => {
    store.markRead(id);
  }, [id]);

  return (
    <article className="article" aria-labelledby="article-title">
      <div className="article__bar">
        <div className="article__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
        <button type="button" className="icon-button" onClick={() => nav.back()} aria-label="חזרה">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        <nav className="crumbs" aria-label="מסלול הקריאה">
          <ol>
            <li>
              <button type="button" className="crumbs__link" onClick={() => nav.toDepth(0)}>
                {origin}
              </button>
            </li>
            {route.trail.map((tid, i) => {
              const t = getTopic(tid)!;
              const last = i === route.trail.length - 1;
              return (
                <li key={tid}>
                  <ChevronLeft size={14} aria-hidden="true" className="crumbs__sep" />
                  {last ? (
                    <span aria-current="page" className="crumbs__current">
                      {t.name}
                    </span>
                  ) : (
                    <button type="button" className="crumbs__link" onClick={() => nav.toDepth(i + 1)}>
                      {t.name}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <SaveButton id={id} />
        <button type="button" className="icon-button" onClick={() => nav.close()} aria-label={`סגירה: ${returnLabels[route.tab]}`}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="article__hero" style={{ viewTransitionName: HERO_NAME }}>
        <Picture image={topic.image} name={topic.name} kind={topic.kind} eager sizes="(min-width: 760px) 760px, 100vw" />
      </div>

      <header className="article__head">
        <p className="meta">
          <span>{kindLabels[topic.kind]}</span>
          <span aria-hidden="true">·</span>
          <span>{minutesLabel(topic.minutes)}</span>
        </p>
        <p className="article__name">{topic.name}</p>
        <h1 className="article__title" id="article-title" tabIndex={-1} ref={titleRef}>
          {topic.headline}
        </h1>
        {full && <p className="article__dek">{full.dek}</p>}
      </header>

      {!full && (
        <div className="article__loading">
          {error ? (
            <div className="load-error" role="alert">
              <p>לא הצלחנו לטעון את הכתבה. אולי החיבור לאינטרנט נותק.</p>
              <button type="button" className="pill-button" onClick={retry}>
                לנסות שוב
              </button>
            </div>
          ) : (
            <p role="status" className="muted">
              טוענים את הכתבה…
            </p>
          )}
        </div>
      )}

      {full && <ArticleBody topic={full} route={route} />}

      <footer className="article__foot">
        <button type="button" className="pill-button" onClick={() => nav.close()}>
          <ArrowRight size={16} aria-hidden="true" />
          {returnLabels[route.tab]}
        </button>
      </footer>
    </article>
  );
}

function ArticleBody({ topic, route }: { topic: Topic; route: Route }) {
  const id = topic.id;
  const image = topic.image;
  return (
    <>

      <div className="article__body">
        {topic.body.map((para, i) => (
          <p key={i} className={i === 0 ? "lede" : undefined}>
            {para}
          </p>
        ))}
      </div>

      {topic.facts.length > 0 && (
        <aside className="facts" aria-labelledby="facts-title">
          <h2 id="facts-title" className="eyebrow">
            במבט מהיר
          </h2>
          <ul>
            {topic.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </aside>
      )}

      <aside className="takeaway" aria-labelledby="takeaway-title">
        <h2 id="takeaway-title">
          <Lightbulb size={18} aria-hidden="true" />
          לנסות במטבח
        </h2>
        <p>{topic.takeaway}</p>
      </aside>

      {topic.quiz && (
        <div className="article__quiz">
          <Quiz topic={topic} from={route.tab} kicker="לבדוק את עצמכם" showLink={false} />
        </div>
      )}

      <section className="related" aria-labelledby="related-title">
        <h2 id="related-title" className="section-title">
          מה עוד קשור?
        </h2>
        <ConnectionMap center={id} onPick={(t) => nav.openTopic(t)} branchHint="פתיחת הכתבה" />
        <ul className="related__list" role="list">
          {topic.related.map((r) => {
            const t = getTopic(r.target);
            if (!t) return null;
            return (
              <li key={r.target}>
                <button type="button" className="related__item" onClick={() => nav.openTopic(r.target)} data-focus-key={`topic-${r.target}`}>
                  <Picture image={t.image} name={t.name} kind={t.kind} sizes="72px" className="related__pic" decorative />
                  <span className="related__text">
                    <span className="related__kind">{relationLabels[r.kind]}</span>
                    <span className="related__name">{t.name}</span>
                    <span className="related__why">{r.why}</span>
                  </span>
                  <ArrowLeft size={18} aria-hidden="true" className="related__arrow" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sources" aria-labelledby="sources-title">
        <h2 id="sources-title" className="section-title">
          מקורות והערות
        </h2>
        <p className={`status status--${topic.status}`}>
          <strong>{statusText[topic.status].label}.</strong> {statusText[topic.status].text}
        </p>
        {topic.sources.length > 0 ? (
          <ul className="sources__list">
            {topic.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  <bdi lang="en">{s.title}</bdi>
                  <ExternalLink size={13} aria-hidden="true" />
                  <span className="sr-only">(נפתח בחלון חדש)</span>
                </a>
                <span className="sources__pub">{s.publisher}</span>
                {s.supports && <span className="sources__supports">מתייחס ל: {s.supports}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sources__none">עדיין לא צורפו מקורות לכתבה הזאת.</p>
        )}
        {image && <p className="sources__credit">
          צילום: {image.credit.author ? <bdi>{image.credit.author}</bdi> : "צלם לא צוין"} · {image.credit.source} ·{" "}
          {image.credit.url ? (
            <a href={image.credit.url} target="_blank" rel="noreferrer">
              <bdi>{image.credit.license}</bdi>
            </a>
          ) : (
            <bdi>{image.credit.license}</bdi>
          )}
        </p>}
        <p className="sources__updated">עודכן לאחרונה: {updatedFmt.format(parseDateKey(topic.updatedAt))}</p>
      </section>
    </>
  );
}
