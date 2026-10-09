import { quizzes } from "../data/quizzes";
import { useStore } from "../lib/storage";
import { Quiz } from "../components/Quiz";
import { Lab } from "../labs";

export function Learn() {
  const { answers } = useStore();
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
            שאלות
          </h2>
          <p className="learn__count">
            {answered === 0 ? `${quizzes.length} שאלות` : `עניתם על ${answered} מתוך ${quizzes.length}`}
          </p>
        </div>
        <div className="learn__quizzes">
          {quizzes.map((q) => (
            <Quiz key={q.id} id={q.id} from="learn" headingLevel={3} />
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
