import { useEffect, useId, useState } from "react";
import { ChefHat, ExternalLink, Minus, Plus, Timer } from "lucide-react";
import type { Recipe } from "../types";

// A recipe inside an article: scale the servings, tick ingredients off, and a cooking mode with
// bigger steps that keeps the screen awake while your hands are busy.

const fmt = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });

function scaled(amount: number, factor: number): string {
  const v = amount * factor;
  // Friendly fractions for small kitchen amounts.
  const whole = Math.floor(v + 1e-9);
  const frac = v - whole;
  const fractions: [number, string][] = [
    [0.25, "¼"],
    [0.33, "⅓"],
    [0.5, "½"],
    [0.67, "⅔"],
    [0.75, "¾"],
  ];
  if (v < 20) {
    const near = fractions.find(([f]) => Math.abs(frac - f) < 0.04);
    if (near) return whole ? `${whole}${near[1]}` : near[1];
    if (frac < 0.04) return String(whole);
  }
  return fmt.format(v >= 20 ? Math.round(v / 5) * 5 : Math.round(v * 10) / 10);
}

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let alive = true;
    const request = () =>
      (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((l) => {
          if (alive) lock = l;
          else l.release();
        })
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

export function RecipeCard({ recipe, name }: { recipe: Recipe; name: string }) {
  const [serves, setServes] = useState(recipe.serves);
  const [have, setHave] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [step, setStep] = useState(0);
  const headingId = useId();
  useWakeLock(cooking);
  const factor = serves / recipe.serves;

  let lastGroup: string | undefined;
  return (
    <section className={`recipe ${cooking ? "recipe--cooking" : ""}`} aria-labelledby={headingId}>
      <div className="recipe__head">
        <p className="eyebrow">מתכון</p>
        <h2 className="recipe__title" id={headingId}>
          {name} בבית
        </h2>
        <div className="recipe__meta">
          {recipe.minutes && (
            <span>
              <Timer size={15} aria-hidden="true" /> {recipe.minutes >= 60 ? `${Math.floor(recipe.minutes / 60)} ש׳ ${recipe.minutes % 60 ? `ו־${recipe.minutes % 60} דק׳` : ""}` : `${recipe.minutes} דקות`}
            </span>
          )}
          <span className="recipe__serves" role="group" aria-label="מספר מנות">
            <button type="button" className="icon-button" onClick={() => setServes((s) => Math.max(1, s - 1))} aria-label="פחות מנות" disabled={serves <= 1}>
              <Minus size={16} aria-hidden="true" />
            </button>
            <span aria-live="polite">
              <bdi>{serves}</bdi> מנות
            </span>
            <button type="button" className="icon-button" onClick={() => setServes((s) => Math.min(24, s + 1))} aria-label="יותר מנות">
              <Plus size={16} aria-hidden="true" />
            </button>
          </span>
        </div>
      </div>

      <h3 className="recipe__sub">מצרכים</h3>
      <ul className="recipe__ingredients" role="list">
        {recipe.ingredients.map((ing, i) => {
          const header = ing.group && ing.group !== lastGroup ? ing.group : undefined;
          lastGroup = ing.group;
          return (
            <li key={i}>
              {header && <p className="recipe__group">{header}</p>}
              <label className={`recipe__ing ${have.has(i) ? "recipe__ing--have" : ""}`}>
                <input
                  type="checkbox"
                  checked={have.has(i)}
                  onChange={() =>
                    setHave((h) => {
                      const n = new Set(h);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    })
                  }
                />
                <span>
                  {ing.amount != null && (
                    <strong className="recipe__amount">
                      <bdi>{scaled(ing.amount, factor)}</bdi>
                      {ing.unit ? ` ${ing.unit}` : ""}
                    </strong>
                  )}{" "}
                  {ing.item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="recipe__steps-head">
        <h3 className="recipe__sub">אופן ההכנה</h3>
        <button
          type="button"
          className={`pill-button ${cooking ? "" : "pill-button--quiet"}`}
          aria-pressed={cooking}
          onClick={() => {
            setCooking((c) => !c);
            setStep(0);
          }}
        >
          <ChefHat size={16} aria-hidden="true" />
          {cooking ? "סיום בישול" : "מצב בישול"}
        </button>
      </div>
      {cooking && <p className="recipe__cooking-note">המסך יישאר דלוק. לחצו על שלב כדי לסמן שסיימתם.</p>}
      <ol className="recipe__steps">
        {recipe.steps.map((s, i) => (
          <li key={i} className={cooking ? (i < step ? "done" : i === step ? "current" : "") : ""}>
            {cooking ? (
              <button type="button" className="recipe__step-button" onClick={() => setStep(i + 1)} aria-current={i === step ? "step" : undefined}>
                {s}
              </button>
            ) : (
              s
            )}
          </li>
        ))}
      </ol>
      {recipe.note && <p className="recipe__note">{recipe.note}</p>}
      {recipe.source && (
        <p className="recipe__source">
          מבוסס על:{" "}
          <a href={recipe.source.url} target="_blank" rel="noreferrer">
            <bdi>{recipe.source.title}</bdi> <ExternalLink size={12} aria-hidden="true" />
          </a>{" "}
          · {recipe.source.publisher}
        </p>
      )}
    </section>
  );
}
