import { useEffect, useState } from "react";
import { periods } from "../data/editions";
import { loadEdition, useTopics } from "../lib/content";
import { addDays, currentSlot, isPublished, type Slot } from "../lib/schedule";
import { useStore } from "../lib/storage";
import { Quiz } from "../components/Quiz";
import { Lab } from "../labs";

const WEEK = 7;

/** Quiz topics from the editions published in the past week, newest first. */
function useWeekQuizzes(now: Date) {
  const today = currentSlot(now).date;
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    const slots: Slot[] = [];
    for (let d = 0; d < WEEK; d++) {
      const date = addDays(today, -d);
      for (const period of [...periods].reverse()) if (isPublished({ date, period }, now)) slots.push({ date, period });
    }
    Promise.all(slots.map(loadEdition)).then((eds) => {
      if (!alive) return;
      setIds([...new Set(eds.map((e) => e.quiz).filter((q): q is string => !!q))]);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);
  return ids;
}

export function Learn({ now }: { now: Date }) {
  const { answers } = useStore();
  const ids = useWeekQuizzes(now);
  const { data: topics } = useTopics(ids ?? []);
  const quizzes = (ids && topics ? topics : []).filter((t) => t.quiz);
  const answered = quizzes.filter((q) => answers[q.id] !== undefined).length;
  return (
    <div className="learn">
      <header className="page-head">
        <h1 className="page-head__title">לומדים</h1>
        <p className="page-head__sub">בלי ציונים ובלי לחץ. שאלה קטנה, הסבר טוב, ואולי גם ניסוי.</p>
      </header>

      <section aria-labelledby="quizzes-title" className="learn__section">
        <div className="learn__head">
          <h2 className="section-title" id="quizzes-title">
            השאלות של השבוע
          </h2>
          {quizzes.length > 0 && (
            <p className="learn__count">
              {answered === 0 ? `${quizzes.length} שאלות` : `עניתם על ${answered} מתוך ${quizzes.length}`}
            </p>
          )}
        </div>
        <div className="learn__quizzes">
          {quizzes.length === 0 && (
            <p className="muted" role="status">
              טוענים שאלות…
            </p>
          )}
          {quizzes.map((t) => (
            <Quiz key={t.id} topic={t} from="learn" headingLevel={3} />
          ))}
        </div>
      </section>

      <section aria-labelledby="labs-title" className="learn__section">
        <h2 className="section-title" id="labs-title">
          ניסויים קטנים
        </h2>
        <p className="learn__intro">המחשות שאפשר לשחק בהן. הן מסבירות רעיון — לא מחליפות מתכון.</p>
        <div className="learn__labs">
          <Lab id="hydration" from="learn" headingLevel={3} />
          <Lab id="emulsion" from="learn" headingLevel={3} />
          <Lab id="browning" from="learn" headingLevel={3} />
        </div>
      </section>
    </div>
  );
}
