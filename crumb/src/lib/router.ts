import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { getTopic } from "./content";
import type { Route, Tab } from "../types";

// Hash routes: #/today, #/atlas, #/learn, #/saved, and #/<tab>/<topic>/<topic>… for an
// exploration trail opened from that tab. Each history entry records `chain`: how many
// consecutive in-app steps lead back to the tab root, so "close" and breadcrumbs can rewind
// real history (keeping back/forward coherent) and fall back to replace() after a reload.

const TABS: Tab[] = ["today", "atlas", "learn", "saved"];

interface HistState {
  crumb: 2;
  chain: number | null;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const tab = TABS.includes(parts[0] as Tab) ? (parts[0] as Tab) : "today";
  const trail = parts.slice(TABS.includes(parts[0] as Tab) ? 1 : 0).filter((id) => getTopic(id));
  return { tab, trail };
}

export function toHash(route: Route): string {
  return "#/" + [route.tab, ...route.trail].map(encodeURIComponent).join("/");
}

let route: Route = parseHash(typeof location === "undefined" ? "" : location.hash);
let chain: number | null = null;
const listeners = new Set<() => void>();

function readChain() {
  const s = history.state as HistState | null;
  chain = s && s.crumb === 2 ? s.chain : route.trail.length === 0 ? 0 : null;
}

function emit() {
  listeners.forEach((l) => l());
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Name of the shared element morphing between a card image and the article hero. */
export const HERO_NAME = "topic-hero";

function withTransition(update: () => void, returningTo?: string) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  if (!doc.startViewTransition || reducedMotion()) {
    update();
    return;
  }
  const marked: HTMLElement[] = [];
  const t = doc.startViewTransition(() => {
    flushSync(update);
    if (returningTo) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-hero-id="${returningTo}"]`)).find(
        (e) => e.offsetParent !== null,
      );
      if (el) {
        el.style.viewTransitionName = HERO_NAME;
        marked.push(el);
      }
    }
  });
  t.finished.finally(() => {
    marked.forEach((el) => (el.style.viewTransitionName = ""));
    document.querySelectorAll<HTMLElement>("[data-vt-marked]").forEach((el) => {
      el.style.viewTransitionName = "";
      delete el.dataset.vtMarked;
    });
  });
}

function commit(next: Route, nextChain: number | null, mode: "push" | "replace", returningTo?: string) {
  const state: HistState = { crumb: 2, chain: nextChain };
  if (mode === "push") history.pushState(state, "", toHash(next));
  else history.replaceState(state, "", toHash(next));
  withTransition(() => {
    route = next;
    chain = nextChain;
    emit();
  }, returningTo);
}

function chainFor(prev: Route, prevChain: number | null, next: Route): number | null {
  if (next.trail.length === 0) return 0;
  const extendsPrev =
    prev.tab === next.tab &&
    next.trail.length === prev.trail.length + 1 &&
    prev.trail.every((id, i) => next.trail[i] === id);
  return extendsPrev && prevChain != null ? prevChain + 1 : null;
}

if (typeof window !== "undefined") {
  history.scrollRestoration = "manual";
  readChain();
  if (!history.state) history.replaceState({ crumb: 2, chain } satisfies HistState, "", toHash(route));
  const onPop = () => {
    const prev = route;
    const next = parseHash(location.hash);
    const closing = prev.trail.length > 0 && next.trail.length < prev.trail.length ? prev.trail[next.trail.length] : undefined;
    withTransition(() => {
      route = next;
      readChain();
      emit();
    }, next.trail.length === 0 ? closing : undefined);
  };
  window.addEventListener("popstate", onPop);
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => route,
    () => route,
  );
}

/** Mark the element that should morph into the article hero (card image). */
export function markHero(el: Element | null) {
  if (!(el instanceof HTMLElement)) return;
  el.style.viewTransitionName = HERO_NAME;
  el.dataset.vtMarked = "1";
}

export const nav = {
  get route() {
    return route;
  },
  /** Open a topic. From a tab root this starts a trail; from an article it extends it. */
  openTopic(id: string, opts: { from?: Tab; fresh?: boolean } = {}) {
    const tab = opts.from ?? route.tab;
    const existing = tab === route.tab && !opts.fresh ? route.trail.indexOf(id) : -1;
    if (existing >= 0) {
      this.toDepth(existing + 1);
      return;
    }
    const trail = opts.fresh || tab !== route.tab ? [id] : [...route.trail, id];
    const next = { tab, trail };
    commit(next, chainFor(route, chain, next), "push");
  },
  tab(tab: Tab) {
    if (tab === route.tab && route.trail.length === 0) {
      window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    const next = { tab, trail: [] };
    commit(next, 0, "push");
  },
  back() {
    if (chain != null && chain >= 1) history.back();
    else this.toDepth(route.trail.length - 1);
  },
  /** Close the article and return to where the trail started. */
  close() {
    this.toDepth(0);
  },
  /** Keep the first `depth` topics of the trail (0 = the tab itself). */
  toDepth(depth: number) {
    const steps = route.trail.length - depth;
    if (steps <= 0) return;
    if (chain != null && chain >= steps) {
      history.go(-steps);
      return;
    }
    const closing = route.trail[depth];
    const next = { tab: route.tab, trail: route.trail.slice(0, depth) };
    commit(next, depth === 0 ? 0 : null, "replace", depth === 0 ? closing : undefined);
  },
};
