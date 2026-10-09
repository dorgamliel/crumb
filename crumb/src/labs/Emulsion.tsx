import { useEffect, useMemo, useState } from "react";
import { Timer, RotateCcw } from "lucide-react";
import { LabFrame, Slider, Toggle } from "./LabFrame";
import type { Tab } from "../types";

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function EmulsionLab({ from, headingLevel }: { from: Tab; headingLevel?: 2 | 3 }) {
  const [mix, setMix] = useState(40);
  const [yolk, setYolk] = useState(false);
  const [waited, setWaited] = useState(false);

  useEffect(() => setWaited(false), [mix, yolk]);

  const separated = waited && (!yolk || mix < 15);
  const count = Math.round(8 + (mix / 100) * 46);
  const radius = 13 - (mix / 100) * 9.5;
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: 22 + rand(i + 1) * 236,
        y: 26 + rand(i + 101) * 98,
        r: radius * (0.7 + rand(i + 51) * 0.6),
      })),
    [count, radius],
  );

  let title: string;
  let text: string;
  if (mix < 15) {
    title = "שתי שכבות נפרדות";
    text = "בלי ערבוב, השמן הקל צף מעל הנוזל המימי.";
  } else if (separated) {
    title = "הטיפות התאחדו";
    text = "בלי חומר מתחלב, הטיפות פוגשות זו את זו, מתחברות, והשמן חוזר לצוף. כך נפרד ויניגרט.";
  } else if (waited && yolk) {
    title = "התחליב מחזיק";
    text = "החומרים המתחלבים מהחלמון מצפים את הטיפות ומונעים מהן להתאחד. כך מיונז נשאר יציב.";
  } else {
    title = mix > 70 ? "טיפות זעירות" : "טיפות בינוניות";
    text = yolk
      ? "הערבוב שובר את השמן לטיפות, והחלמון מצפה אותן. מה יקרה אחרי כמה דקות?"
      : "הערבוב שובר את השמן לטיפות ומפזר אותן. זה נראה מעורבב — אבל לכמה זמן?";
  }

  const label = separated || mix < 15 ? "שכבת שמן מעל שכבת מים" : `טיפות שמן ${mix > 70 ? "קטנות מאוד" : "מפוזרות"} בתוך נוזל${yolk ? ", מצופות בחומר מתחלב" : ""}`;

  return (
    <LabFrame
      title="למה ויניגרט נפרד ומיונז לא?"
      intro="קבעו כמה חזק מערבבים, החליטו אם להוסיף חלמון, וחכו."
      topic="emulsions"
      from={from}
      headingLevel={headingLevel}
      note="המחשה סכמטית. גודל הטיפות והזמנים אינם מדויקים, ותחליבים אמיתיים תלויים גם ביחסים ובטמפרטורה."
      visual={
        <svg viewBox="0 0 280 150" className="lab-svg" role="img" aria-label={label}>
          <rect x="10" y="10" width="260" height="130" rx="18" className="lab-svg__vessel" />
          {separated || mix < 15 ? (
            <>
              <rect x="10" y="10" width="260" height="46" rx="18" fill="#e9c34f" opacity="0.9" className="lab-svg__fade" />
              <rect x="10" y="40" width="260" height="16" fill="#e9c34f" opacity="0.9" />
              <text x="140" y="38" textAnchor="middle" className="lab-svg__label">שמן</text>
              <text x="140" y="104" textAnchor="middle" className="lab-svg__label lab-svg__label--muted">מים וחומץ</text>
            </>
          ) : (
            drops.map((d, i) => (
              <g key={i}>
                {yolk && <circle cx={d.x} cy={d.y} r={d.r + 2.2} fill="none" stroke="#e08a1e" strokeWidth="1.6" opacity="0.8" />}
                <circle cx={d.x} cy={d.y} r={d.r} fill="#e9c34f" opacity="0.92" />
              </g>
            ))
          )}
        </svg>
      }
      controls={
        <>
          <Slider label="עוצמת הערבוב" value={mix} min={0} max={100} onChange={setMix} valueText={mix < 15 ? "כמעט בלי" : mix < 60 ? "בינונית" : "חזקה"} minLabel="בלי" maxLabel="טריפה חזקה" />
          <div className="lab__row">
            <Toggle label="מוסיפים חלמון" checked={yolk} onChange={setYolk} />
            <button type="button" className="chip-button" onClick={() => setWaited((w) => !w)} aria-pressed={waited}>
              {waited ? <RotateCcw size={15} aria-hidden="true" /> : <Timer size={15} aria-hidden="true" />}
              {waited ? "לערבב מחדש" : "לחכות כמה דקות"}
            </button>
          </div>
        </>
      }
      readout={
        <>
          <p className="lab__stage-name">{title}</p>
          <p>{text}</p>
        </>
      }
    />
  );
}
