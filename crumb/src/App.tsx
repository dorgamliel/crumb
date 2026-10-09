import { useEffect, useLayoutEffect, useRef } from "react";
import { useRoute } from "./lib/router";
import { useNow } from "./lib/useNow";
import type { Route, Tab } from "./types";
import { Today } from "./features/Today";
import { Atlas } from "./features/Atlas";
import { Learn } from "./features/Learn";
import { Saved } from "./features/Saved";
import { Article } from "./features/Article";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";

const TABS: Tab[] = ["today", "atlas", "learn", "saved"];

/** Remembers each tab's scroll position and last focused card, and restores them on return. */
function useTabMemory(route: Route) {
  const scroll = useRef<Record<string, number>>({});
  const focus = useRef<Record<string, string>>({});
  const routeRef = useRef(route);
  const prev = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const onScroll = () => {
      const r = routeRef.current;
      if (r.trail.length === 0) scroll.current[r.tab] = window.scrollY;
    };
    const onFocus = (e: FocusEvent) => {
      const r = routeRef.current;
      if (r.trail.length > 0) return;
      const key = (e.target as Element | null)?.closest?.("[data-focus-key]")?.getAttribute("data-focus-key");
      if (key) focus.current[r.tab] = key;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = route;
    if (route.trail.length > 0) return;
    const fromArticle = p.trail.length > 0;
    if (!fromArticle && p.tab === route.tab) return;
    window.scrollTo(0, scroll.current[route.tab] ?? 0);
    if (fromArticle) {
      const key = focus.current[route.tab];
      const el = key
        ? Array.from(document.querySelectorAll<HTMLElement>(`[data-focus-key="${key}"]`)).find((e) => e.offsetParent !== null)
        : null;
      if (el) el.focus({ preventScroll: true });
      else document.getElementById("main")?.focus({ preventScroll: true });
    }
  }, [route]);
}

export function App() {
  const route = useRoute();
  const now = useNow();
  const articleOpen = route.trail.length > 0;
  useTabMemory(route);

  return (
    <ToastProvider>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        דילוג לתוכן
      </a>
      <main id="main" tabIndex={-1} className="main">
        {TABS.map((tab) => (
          <div key={tab} className="view" hidden={articleOpen || route.tab !== tab}>
            {tab === "today" && <Today now={now} visible={!articleOpen && route.tab === "today"} />}
            {tab === "atlas" && <Atlas />}
            {tab === "learn" && <Learn />}
            {tab === "saved" && <Saved />}
          </div>
        ))}
        {articleOpen && <Article key={route.trail.join("/")} route={route} />}
      </main>
      <TabBar route={route} />
    </ToastProvider>
  );
}
