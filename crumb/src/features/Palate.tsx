import { useState } from "react";
import { Share2 } from "lucide-react";
import { allTopics, getTopic } from "../lib/content";
import { kindLabels, kindOrder } from "../data/relations";
import { useStore } from "../lib/storage";
import { computeStreak } from "../lib/streak";
import { shareImage } from "../lib/share";
import { useToast } from "../components/Toast";
import type { Kind } from "../types";

// "הטעם שלכם": a portrait of the reader built from what they read, answered and played on this
// device. People share what says something about them; in December it becomes the year in review.

const personas: Record<Kind, { title: string; line: string }> = {
  science: { title: "חוקרי מטבח", line: "אתם רוצים לדעת למה. כל מחבת היא ניסוי קטן." },
  baking: { title: "אופים בנשמה", line: "בצק, תנור וסבלנות. אתם יודעים שהזמן הוא חומר גלם." },
  ingredients: { title: "ציידי חומרי גלם", line: "אתם מתחילים מהשוק ולא מהמתכון." },
  dishes: { title: "אוהבי צלחות", line: "אתם אוספים מנות כמו שאחרים אוספים מקומות." },
  drinks: { title: "אנשי כוס", line: "קפה, תה, ומה שביניהם. אתם טועמים לאט." },
  techniques: { title: "בעלי מלאכה", line: "הסכין, האש והתנועה. אתם בונים ידיים טובות." },
};

export interface Palate {
  readCount: number;
  total: number;
  byKind: { kind: Kind; count: number }[];
  top?: Kind;
  bestStreak: number;
  solvedGames: number;
}

function bestStreak(days: string[]): number {
  let best = 0;
  for (let i = 0; i < days.length; i++) {
    const s = computeStreak(days.slice(0, i + 1), new Date(days[i] + "T12:00:00"));
    best = Math.max(best, s.count);
  }
  return best;
}

export function usePalate(): Palate {
  const { read, days, games } = useStore();
  const readCards = read.map(getTopic).filter((t): t is NonNullable<typeof t> => !!t);
  const byKind = kindOrder.map((kind) => ({ kind, count: readCards.filter((t) => t.kind === kind).length })).sort((a, b) => b.count - a.count);
  return {
    readCount: readCards.length,
    total: allTopics().length,
    byKind,
    top: byKind[0]?.count ? byKind[0].kind : undefined,
    bestStreak: bestStreak(days),
    solvedGames: Object.values(games).filter((g) => g.solved).length,
  };
}

const isDecember = (d: Date) => d.getMonth() === 11;

async function drawCard(p: Palate, now: Date): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  await Promise.all([
    document.fonts.load('700 80px "Frank Ruhl Libre Variable"', "אבג"),
    document.fonts.load('500 40px "Heebo Variable"', "אבג"),
  ]).catch(() => {});
  const serif = '"Frank Ruhl Libre Variable", serif';
  const sans = '"Heebo Variable", sans-serif';
  // Background
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2a1d14");
  bg.addColorStop(1, "#1d1714");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(240,163,90,0.18)";
  g.beginPath();
  g.arc(W * 0.85, H * 0.12, 300, 0, Math.PI * 2);
  g.fill();

  g.direction = "rtl";
  g.textAlign = "right";
  const x = W - 90;
  g.fillStyle = "#f0a35a";
  g.font = `600 40px ${sans}`;
  g.fillText(isDecember(now) ? `השנה שלי ב־Crumb, ${now.getFullYear()}` : "הטעם שלי ב־Crumb", x, 170);

  const persona = p.top ? personas[p.top] : { title: "סקרנים בהתחלה", line: "עוד כמה כתבות, והטעם שלכם יתחיל להתבהר." };
  g.fillStyle = "#f4ebdd";
  g.font = `700 112px ${serif}`;
  g.fillText(persona.title, x, 320);
  g.font = `400 44px ${serif}`;
  g.fillStyle = "#d6c8b6";
  g.fillText(persona.line, x, 400);

  // Bars
  const max = Math.max(1, ...p.byKind.map((k) => k.count));
  let y = 520;
  for (const { kind, count } of p.byKind) {
    g.fillStyle = "#d6c8b6";
    g.font = `500 38px ${sans}`;
    g.fillText(kindLabels[kind], x, y);
    const barW = 520 * (count / max);
    g.fillStyle = "rgba(244,235,221,0.12)";
    g.fillRect(90, y - 30, 520, 34);
    g.fillStyle = "#f0a35a";
    g.fillRect(90 + 520 - barW, y - 30, barW, 34);
    g.textAlign = "left";
    g.fillStyle = "#f4ebdd";
    g.fillText(String(count), 90 + 520 + 20, y);
    g.textAlign = "right";
    y += 82;
  }

  // Stats
  y += 40;
  const stats = [
    [`${p.readCount}`, `כתבות מתוך ${p.total}`],
    [`${p.bestStreak}`, "ימים ברצף, השיא"],
    [`${p.solvedGames}`, "חידות שפתרתי"],
  ];
  const colW = (W - 180) / 3;
  stats.forEach(([n, label], i) => {
    const cx = W - 90 - i * colW;
    g.fillStyle = "#f4ebdd";
    g.font = `700 92px ${serif}`;
    g.fillText(n, cx, y + 60);
    g.fillStyle = "#b9a891";
    g.font = `500 32px ${sans}`;
    g.fillText(label, cx, y + 110);
  });

  g.fillStyle = "#f4ebdd";
  g.font = `600 54px ${serif}`;
  g.textAlign = "left";
  g.direction = "ltr";
  g.fillText("crumb", 90, H - 90);
  g.fillStyle = "#b9a891";
  g.font = `400 30px ${sans}`;
  g.textAlign = "right";
  g.direction = "rtl";
  g.fillText("משהו טעים לגלות", x, H - 90);

  return new Promise((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
}

export function PalateCard({ now }: { now: Date }) {
  const p = usePalate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const persona = p.top ? personas[p.top] : undefined;
  const max = Math.max(1, ...p.byKind.map((k) => k.count));
  return (
    <section className="palate" aria-labelledby="palate-title">
      <p className="eyebrow">{isDecember(now) ? `השנה שלכם ב־Crumb, ${now.getFullYear()}` : "הטעם שלכם"}</p>
      <h2 className="palate__title" id="palate-title">
        {persona ? persona.title : "עוד מוקדם לדעת"}
      </h2>
      <p className="palate__line">{persona ? persona.line : "קראו עוד כמה כתבות, והטעם שלכם יתחיל להתבהר כאן."}</p>
      {p.readCount > 0 && (
        <>
          <ul className="palate__bars" role="list">
            {p.byKind.map(({ kind, count }) => (
              <li key={kind}>
                <span className="palate__kind">{kindLabels[kind]}</span>
                <span className="palate__bar" aria-hidden="true">
                  <span style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <bdi className="palate__count">{count}</bdi>
              </li>
            ))}
          </ul>
          <dl className="palate__stats">
            <div>
              <dt>כתבות מתוך {p.total}</dt>
              <dd>
                <bdi>{p.readCount}</bdi>
              </dd>
            </div>
            <div>
              <dt>השיא ברצף</dt>
              <dd>
                <bdi>{p.bestStreak}</bdi> <span className="muted">ימים</span>
              </dd>
            </div>
            <div>
              <dt>חידות שפתרתם</dt>
              <dd>
                <bdi>{p.solvedGames}</bdi>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="pill-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const blob = await drawCard(p, now);
                const r = await shareImage(blob, "crumb-taste.png", "הטעם שלי ב־Crumb");
                if (r === "copied") toast("התמונה נשמרה");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Share2 size={16} aria-hidden="true" />
            לשתף כתמונה
          </button>
        </>
      )}
    </section>
  );
}
