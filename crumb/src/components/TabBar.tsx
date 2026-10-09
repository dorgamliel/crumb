import { Bookmark, Compass, FlaskConical, Newspaper } from "lucide-react";
import { nav, toHash } from "../lib/router";
import { useStore } from "../lib/storage";
import type { Route, Tab } from "../types";

const items: { tab: Tab; label: string; Icon: typeof Newspaper }[] = [
  { tab: "today", label: "היום", Icon: Newspaper },
  { tab: "atlas", label: "אטלס", Icon: Compass },
  { tab: "learn", label: "לומדים", Icon: FlaskConical },
  { tab: "saved", label: "שמורים", Icon: Bookmark },
];

export function TabBar({ route }: { route: Route }) {
  const { saved } = useStore();
  return (
    <nav className="tabbar" aria-label="ניווט ראשי">
      <ul role="list">
        {items.map(({ tab, label, Icon }) => {
          const active = route.tab === tab;
          return (
            <li key={tab}>
              <a
                href={toHash({ tab, trail: [] })}
                className="tabbar__item"
                aria-current={active ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  nav.tab(tab);
                }}
              >
                <span className="tabbar__icon">
                  <Icon size={21} strokeWidth={active ? 2.1 : 1.7} aria-hidden="true" />
                  {tab === "saved" && saved.length > 0 && <span className="tabbar__badge" aria-hidden="true" />}
                </span>
                <span className="tabbar__label">{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
