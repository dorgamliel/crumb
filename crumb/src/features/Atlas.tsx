import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, RotateCcw, Search, X } from "lucide-react";
import { topics, getTopic } from "../data/topics";
import { kindLabels, kindOrder, relationLabels } from "../data/relations";
import { matches, normalize } from "../lib/hebrew";
import { nav } from "../lib/router";
import { session } from "../lib/storage";
import type { Kind } from "../types";
import { ConnectionMap } from "../components/ConnectionMap";
import { TopicRow } from "../components/Cards";

const haystacks = Object.fromEntries(
  topics.map((t) => [t.id, normalize([t.name, t.headline, t.dek, kindLabels[t.kind], ...(t.keywords ?? []), t.id].join(" "))]),
);

const MAP_KEY = "atlas-path";

function loadPath(): string[] {
  try {
    const p: unknown = JSON.parse(session.get(MAP_KEY) ?? "null");
    if (Array.isArray(p) && p.length && p.every((x) => typeof x === "string" && getTopic(x))) return p as string[];
  } catch {
    /* ignore */
  }
  return ["sourdough"];
}

export function Atlas() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [path, setPath] = useState<string[]>(loadPath);
  const inputRef = useRef<HTMLInputElement>(null);

  const center = path[path.length - 1];
  const centerTopic = getTopic(center)!;

  const updatePath = (next: string[]) => {
    setPath(next);
    session.set(MAP_KEY, JSON.stringify(next));
  };

  const recenter = (id: string) => {
    const i = path.indexOf(id);
    updatePath(i >= 0 ? path.slice(0, i + 1) : [...path, id]);
  };

  const results = useMemo(
    () => topics.filter((t) => (kind === "all" || t.kind === kind) && matches(haystacks[t.id], query)),
    [query, kind],
  );
  const searching = query.trim().length > 0;

  return (
    <div className="atlas">
      <header className="page-head">
        <h1 className="page-head__title">אטלס</h1>
        <p className="page-head__sub">כל הנושאים במקום אחד, והחוטים שמחברים ביניהם.</p>
      </header>

      <div className="search" role="search">
        <Search size={18} aria-hidden="true" className="search__icon" />
        <input
          ref={inputRef}
          type="search"
          className="search__input"
          placeholder="מה מעניין אתכם?"
          aria-label="חיפוש נושאים"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="search__clear"
            aria-label="ניקוי החיפוש"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="chips" role="group" aria-label="סינון לפי קטגוריה">
        {(["all", ...kindOrder] as const).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "all" ? "הכול" : kindLabels[k]}
          </button>
        ))}
      </div>

      {!searching && (
        <section className="atlas__map" aria-labelledby="map-title">
          <div className="atlas__map-head">
            <h2 className="section-title" id="map-title">
              מפת הקשרים
            </h2>
            {path.length > 1 && (
              <button type="button" className="text-button" onClick={() => updatePath([path[0]])}>
                <RotateCcw size={14} aria-hidden="true" />
                מההתחלה
              </button>
            )}
          </div>
          <p className="atlas__map-hint">בחרו ענף כדי להזיז אותו למרכז. במרכז — פתיחת הכתבה.</p>
          {path.length > 1 && (
            <nav className="trail" aria-label="המסלול שלכם במפה">
              <ol>
                {path.map((id, i) => (
                  <li key={`${id}-${i}`}>
                    {i > 0 && <ChevronLeft size={13} aria-hidden="true" />}
                    {i === path.length - 1 ? (
                      <span aria-current="step">{getTopic(id)!.name}</span>
                    ) : (
                      <button type="button" onClick={() => updatePath(path.slice(0, i + 1))}>
                        {getTopic(id)!.name}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <ConnectionMap
            center={center}
            onPick={recenter}
            onOpenCenter={(id) => nav.openTopic(id, { from: "atlas", fresh: true })}
            centerHint="לפתיחת הכתבה"
            branchHint="העברה למרכז המפה"
          />
          <div className="atlas__center-card">
            <p className="atlas__center-name">{centerTopic.name}</p>
            <p className="atlas__center-dek">{centerTopic.dek}</p>
            <ul className="atlas__why" role="list">
              {centerTopic.related.map((r) => (
                <li key={r.target}>
                  <strong>{getTopic(r.target)?.name}</strong> <span className="atlas__why-kind">({relationLabels[r.kind]})</span>{" "}
                  {r.why}
                </li>
              ))}
            </ul>
            <button type="button" className="pill-button" onClick={() => nav.openTopic(center, { from: "atlas", fresh: true })} data-focus-key={`topic-${center}`}>
              לקריאה על {centerTopic.name}
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      <section className="atlas__list" aria-labelledby="list-title">
        <h2 className="section-title" id="list-title">
          {searching ? "תוצאות" : kind === "all" ? "כל הנושאים" : kindLabels[kind]}
        </h2>
        <p className="atlas__count" aria-live="polite">
          {results.length === 0 ? "" : results.length === 1 ? "נושא אחד" : `${results.length} נושאים`}
        </p>
        {results.length > 0 ? (
          <ul className="rows" role="list">
            {results.map((t) => (
              <TopicRow key={t.id} id={t.id} from="atlas" />
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p className="empty__title">לא מצאנו נושא כזה.</p>
            <p>נסו מילה אחרת — למשל לחם, קפה או חומצה{kind !== "all" ? ", או חפשו בכל הקטגוריות" : ""}.</p>
            <div className="empty__actions">
              {query && (
                <button type="button" className="pill-button pill-button--quiet" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
                  ניקוי החיפוש
                </button>
              )}
              {kind !== "all" && (
                <button type="button" className="pill-button pill-button--quiet" onClick={() => setKind("all")}>
                  כל הקטגוריות
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
