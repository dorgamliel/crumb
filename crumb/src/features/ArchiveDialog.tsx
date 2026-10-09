import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { editions } from "../data/editions";
import { formatHour, formatShortDate } from "../lib/hebrew";
import { LAUNCH_DATE, archiveDays, parseDateKey, relativeDayLabel, sameSlot, type Slot } from "../lib/schedule";

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (slot: Slot | null) => void;
  now: Date;
  current: Slot;
}

const weekday = new Intl.DateTimeFormat("he-IL", { weekday: "long" });
const launchLabel = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" }).format(parseDateKey(LAUNCH_DATE));

export function ArchiveDialog({ open, onClose, onChoose, now, current }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add("no-scroll");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="archive-title"
      onClose={() => {
        document.documentElement.classList.remove("no-scroll");
        onClose();
        // The trigger can be re-rendered while the dialog is open (the cover finishes loading),
        // so the browser's own focus return may point at a detached node. Return it explicitly.
        requestAnimationFrame(() => {
          const trigger = Array.from(document.querySelectorAll<HTMLElement>("[data-archive-trigger]")).find((e) => e.offsetParent !== null);
          if (trigger && (!document.activeElement || document.activeElement === document.body)) trigger.focus();
        });
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="sheet__inner">
        <span className="sheet__grip" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id="archive-title">ארכיון מהדורות</h2>
          <button type="button" className="icon-button" onClick={() => ref.current?.close()} aria-label="סגירת הארכיון">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <p className="sheet__note">כל המהדורות מאז שהמגזין יצא לדרך, ב־{launchLabel}.</p>
        <button type="button" className="pill-button sheet__now" onClick={() => onChoose(null)}>
          למהדורה העדכנית
        </button>
        <ol className="archive" role="list">
          {archiveDays(now).map((day) => {
            const d = parseDateKey(day.date);
            const rel = relativeDayLabel(day.date, now);
            return (
              <li key={day.date} className="archive__day">
                <h3 className="archive__date">
                  {rel ?? weekday.format(d)} <span>{formatShortDate(d)}</span>
                </h3>
                <div className="archive__slots">
                  {day.slots.map(({ slot, published }) => {
                    const active = sameSlot(slot, current);
                    return (
                      <button
                        key={slot.period}
                        type="button"
                        className={`archive__slot ${active ? "archive__slot--active" : ""}`}
                        disabled={!published}
                        aria-current={active ? "true" : undefined}
                        onClick={() => onChoose(slot)}
                      >
                        <span>{editions[slot.period].name}</span>
                        <bdi>{published ? formatHour(editions[slot.period].hour) : "בקרוב"}</bdi>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </dialog>
  );
}
