import { useState } from "react";
import { LabFrame, Slider } from "./LabFrame";
import type { Tab } from "../types";

const stages = [
  { max: 62, name: "נוקשה ונוח לעיצוב", text: "הבצק מחזיק צורה ולא נדבק לידיים. טווח שמזכיר בצק בייגל או פרעצל." },
  { max: 70, name: "גמיש ויומיומי", text: "קל ללוש ולעצב. טווח נפוץ ללחם כיכר וללחמניות." },
  { max: 78, name: "רך ופתוח", text: "הבצק רפוי ודביק יותר, והפירור נוטה להיות פתוח. טווח שמתאים ללחמים כפריים." },
  { max: 100, name: "רטוב מאוד", text: "כמעט נשפך. דורש קיפולים במקום לישה, ונותן חורים גדולים כמו בצ׳יאבטה." },
];

export function HydrationLab({ from, headingLevel }: { from: Tab; headingLevel?: 2 | 3 }) {
  const [pct, setPct] = useState(68);
  const flour = 500;
  const water = Math.round((flour * pct) / 100);
  const stage = stages.find((s) => pct <= s.max)!;
  const t = (pct - 55) / (90 - 55); // 0..1
  const rx = 74 + t * 54;
  const ry = 46 - t * 22;
  const cy = 128 - ry;
  const holes = Math.round(3 + t * 9);

  return (
    <LabFrame
      title="כמה מים הבצק יכול לקבל?"
      intro="הזיזו את המחוון ותראו איך כמות המים משנה את הבצק."
      topic="hydration"
      from={from}
      headingLevel={headingLevel}
      note="המחשה בלבד. קמח מלא סופג יותר מים, ולכן אותו אחוז ירגיש אחרת עם קמחים שונים."
      visual={
        <svg viewBox="0 0 280 150" className="lab-svg" role="img" aria-label={`בצק בהידרציה של ${pct}%: ${stage.name}`}>
          <defs>
            <radialGradient id="dough" cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#fbf3e4" />
              <stop offset="100%" stopColor="#e8d3ad" />
            </radialGradient>
          </defs>
          <line x1="20" y1="129" x2="260" y2="129" className="lab-svg__ground" />
          <ellipse cx="140" cy={cy} rx={rx} ry={ry} fill="url(#dough)" className="lab-svg__morph" stroke="#c9ad7f" strokeWidth="1.5" />
          {Array.from({ length: holes }, (_, i) => {
            const a = (i * 137.5 * Math.PI) / 180;
            const r = Math.sqrt((i + 0.5) / holes);
            return (
              <circle
                key={i}
                cx={140 + Math.cos(a) * r * (rx - 14)}
                cy={cy + Math.sin(a) * r * (ry - 8)}
                r={1.4 + t * 2.6 * ((i % 3) / 2 + 0.4)}
                fill="#d4b98a"
                opacity="0.7"
              />
            );
          })}
          <ellipse cx={140 - rx * 0.3} cy={cy - ry * 0.45} rx={rx * 0.25} ry={Math.max(3, ry * 0.18)} fill="#fff" opacity={0.25 + t * 0.4} />
        </svg>
      }
      controls={
        <Slider
          label="הידרציה"
          value={pct}
          min={55}
          max={90}
          onChange={setPct}
          valueText={`${pct}%`}
          minLabel="יבש יותר"
          maxLabel="רטוב יותר"
        />
      }
      readout={
        <>
          <p className="lab__stage-name">{stage.name}</p>
          <p>{stage.text}</p>
          <p className="lab__numbers">
            ל־<bdi>500</bdi> גרם קמח: <strong><bdi>{water}</bdi> גרם מים</strong>
          </p>
        </>
      }
    />
  );
}
