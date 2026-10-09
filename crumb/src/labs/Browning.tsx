import { useState } from "react";
import { LabFrame, Slider, Toggle } from "./LabFrame";
import type { Tab } from "../types";

const palette = [
  [238, 222, 190],
  [226, 190, 120],
  [196, 132, 58],
  [128, 72, 30],
  [52, 34, 22],
];

function mixColor(t: number): string {
  const x = Math.min(0.9999, Math.max(0, t)) * (palette.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const [a, b] = [palette[i], palette[i + 1]];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}

export function BrowningLab({ from, headingLevel }: { from: Tab; headingLevel?: 2 | 3 }) {
  const [time, setTime] = useState(35);
  const [wet, setWet] = useState(false);

  // A wet surface spends the first part of the time evaporating water at about 100°C.
  const dryAt = wet ? 45 : 0;
  const steaming = time < dryAt;
  const browning = steaming ? 0.04 * (time / Math.max(1, dryAt)) : (time - dryAt) / (100 - dryAt);
  const color = mixColor(browning * 1.05);

  let name: string;
  let text: string;
  if (steaming) {
    name = "מתאדה, לא משחים";
    text = "כל עוד יש מים על פני השטח, החום הולך לאידוי והטמפרטורה שם נשארת סביב 100 מעלות. ההשחמה מחכה.";
  } else if (browning < 0.2) {
    name = "חיוור";
    text = "פני השטח התייבשו והתחממו, אבל תגובות ההשחמה רק מתחילות.";
  } else if (browning < 0.55) {
    name = "זהוב";
    text = "תגובת מייאר בעיצומה: נוצרים צבע, ריחות של קלייה וטעם עמוק.";
  } else if (browning < 0.82) {
    name = "חום עמוק";
    text = "טעם עשיר וקלוי. מכאן ההבדל בין עמוק לשרוף מתקצר.";
  } else {
    name = "שרוף";
    text = "התרכובות מתפרקות, והמרירות משתלטת.";
  }

  return (
    <LabFrame
      title="מאיפה מגיע הקרום?"
      intro="הזיזו את הזמן על המחבת החמה, ונסו גם משטח רטוב."
      topic="browning"
      from={from}
      headingLevel={headingLevel}
      note="המחשה בלבד — לא טיימר ולא הוראות בישול. הזמנים והגוונים תלויים במזון, בעובי ובמחבת."
      visual={
        <svg viewBox="0 0 280 150" className="lab-svg" role="img" aria-label={`פרוסה במחבת: ${name}`}>
          <ellipse cx="140" cy="128" rx="120" ry="12" className="lab-svg__pan" />
          <rect x="62" y="56" width="156" height="66" rx="26" fill={color} className="lab-svg__color" />
          <rect x="62" y="56" width="156" height="66" rx="26" fill="none" stroke="rgba(0,0,0,.12)" />
          {steaming &&
            [96, 140, 184].map((x, i) => (
              <path
                key={x}
                d={`M${x} 48 q-8 -10 0 -20 q8 -10 0 -20`}
                className="lab-svg__steam"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          {wet && steaming && [80, 120, 160, 200].map((x) => <circle key={x} cx={x} cy={70 + (x % 3) * 12} r="3" fill="#ffffff" opacity="0.7" />)}
        </svg>
      }
      controls={
        <>
          <Slider label="זמן על המחבת" value={time} min={0} max={100} onChange={setTime} valueText={name} minLabel="רגע" maxLabel="יותר מדי" />
          <Toggle label="פני שטח רטובים" checked={wet} onChange={setWet} />
        </>
      }
      readout={
        <>
          <p className="lab__stage-name">{name}</p>
          <p>{text}</p>
        </>
      }
    />
  );
}
