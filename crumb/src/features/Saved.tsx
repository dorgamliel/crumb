import { Bookmark, Compass, Newspaper, X } from "lucide-react";
import { getTopic } from "../data/topics";
import { nav } from "../lib/router";
import { store, useStore } from "../lib/storage";
import { TopicRow } from "../components/Cards";
import { useToast } from "../components/Toast";

export function Saved() {
  const { saved, recent } = useStore();
  const toast = useToast();
  const savedTopics = saved.filter((id) => getTopic(id));
  const recentTopics = recent.filter((id) => getTopic(id));

  const remove = (id: string) => {
    const index = store.get().saved.indexOf(id);
    store.toggleSaved(id);
    toast("הוסר מהשמורים", { label: "ביטול", run: () => store.restoreSaved(id, index) });
  };

  return (
    <div className="saved">
      <header className="page-head">
        <h1 className="page-head__title">שמורים</h1>
        <p className="page-head__sub">מה שרציתם לחזור אליו. נשמר במכשיר הזה בלבד, בלי חשבון.</p>
      </header>

      <section aria-labelledby="saved-title">
        <h2 className="section-title" id="saved-title">
          לקריאה בהמשך
        </h2>
        {savedTopics.length ? (
          <ul className="rows" role="list">
            {savedTopics.map((id) => (
              <TopicRow
                key={id}
                id={id}
                from="saved"
                trailing={
                  <button type="button" className="icon-button" aria-label={`הסרה מהשמורים: ${getTopic(id)!.name}`} onClick={() => remove(id)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                }
              />
            ))}
          </ul>
        ) : (
          <div className="empty empty--saved">
            <span className="empty__icon" aria-hidden="true">
              <Bookmark size={26} strokeWidth={1.5} />
            </span>
            <p className="empty__title">עוד לא שמרתם שום דבר.</p>
            <p>כשמשהו מעניין אתכם, לחצו על סימן השמירה והוא יחכה כאן.</p>
            <div className="empty__actions">
              <button type="button" className="pill-button" onClick={() => nav.tab("today")}>
                <Newspaper size={16} aria-hidden="true" />
                למהדורה
              </button>
              <button type="button" className="pill-button pill-button--quiet" onClick={() => nav.tab("atlas")}>
                <Compass size={16} aria-hidden="true" />
                לאטלס
              </button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-title" className="saved__recent">
        <div className="saved__recent-head">
          <h2 className="section-title" id="recent-title">
            קראתם לאחרונה
          </h2>
          {recentTopics.length > 0 && (
            <button type="button" className="text-button" onClick={() => store.clearRecent()}>
              ניקוי הרשימה
            </button>
          )}
        </div>
        {recentTopics.length ? (
          <ul className="rows rows--compact" role="list">
            {recentTopics.map((id) => (
              <TopicRow key={id} id={id} from="saved" />
            ))}
          </ul>
        ) : (
          <p className="muted">כתבות שתפתחו יופיעו כאן.</p>
        )}
      </section>
    </div>
  );
}
