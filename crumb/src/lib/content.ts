import { useEffect, useState } from "react";
import { editions, periods } from "../data/editions";
import type { EditionData, Topic, TopicCard } from "../types";
import type { Slot } from "./schedule";

// The library is published as static files (see scripts/content/build.mjs):
//   content/index.json             light records for every topic (search, lists, map)
//   content/t/<id>.json            one full topic, fetched when it is needed
//   content/schedule/<YYYY-MM>.json  which topics each edition shows on each day
// The index is loaded once before the app renders; everything else is fetched lazily and cached.

const base = import.meta.env.BASE_URL + "content/";

let cards: TopicCard[] = [];
let byId: Record<string, TopicCard> = {};

export async function loadIndex(): Promise<void> {
  const res = await fetch(base + "index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`index ${res.status}`);
  const data = (await res.json()) as { topics: TopicCard[] };
  cards = data.topics;
  byId = Object.fromEntries(cards.map((t) => [t.id, t]));
}

export const allTopics = () => cards;
export const getTopic = (id: string): TopicCard | undefined => byId[id];

// ── Full topics ──

const full = new Map<string, Topic>();
const inflight = new Map<string, Promise<Topic>>();

export function loadTopic(id: string): Promise<Topic> {
  const hit = full.get(id);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(id);
  if (!p) {
    p = fetch(`${base}t/${encodeURIComponent(id)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`topic ${id}: ${r.status}`);
        return r.json() as Promise<Topic>;
      })
      .then((t) => {
        full.set(id, t);
        return t;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

export const peekTopic = (id: string) => full.get(id);

type Load<T> = { data?: T; error?: boolean; retry: () => void };

/** Loads several full topics; `data` is set once all of them are available. */
export function useTopics(ids: string[]): Load<Topic[]> {
  const key = ids.join(",");
  const cached = ids.every((id) => full.has(id)) ? ids.map((id) => full.get(id)!) : undefined;
  const [state, setState] = useState<{ key: string; data?: Topic[]; error?: boolean }>({ key, data: cached });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    Promise.all(ids.map(loadTopic))
      .then((data) => alive && setState({ key, data }))
      .catch(() => alive && setState({ key, error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const current = state.key === key ? state : { key };
  return { data: cached ?? current.data, error: current.error, retry: () => setAttempt((a) => a + 1) };
}

export function useTopic(id: string): Load<Topic> {
  const r = useTopics([id]);
  return { ...r, data: r.data?.[0] };
}

// ── Schedule ──

const months = new Map<string, Promise<Record<string, Record<string, EditionData>>>>();

function loadMonth(month: string) {
  let p = months.get(month);
  if (!p) {
    p = fetch(`${base}schedule/${month}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => {
        months.delete(month);
        return {};
      });
    months.set(month, p);
  }
  return p;
}

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Used only if a day was never scheduled (for example if the pipeline stopped for weeks):
 * a deterministic pick from the library, so the app never shows an empty edition.
 */
function fallbackEdition(slot: Slot): EditionData {
  const withPhoto = cards.filter((t) => t.image);
  const pool = [...cards].sort((a, b) => hash(slot.date + slot.period + a.id) - hash(slot.date + slot.period + b.id));
  const cover = withPhoto.sort((a, b) => hash(slot.period + slot.date + a.id) - hash(slot.period + slot.date + b.id))[0];
  const topics = [cover, ...pool.filter((t) => t !== cover)].filter(Boolean).slice(0, 8);
  const meta = editions[slot.period];
  return {
    title: meta.fallbackTitle,
    subtitle: meta.fallbackSubtitle,
    topics: topics.map((t) => t.id),
    quiz: topics.find((t) => t.hasQuiz)?.id,
  };
}

export async function loadEdition(slot: Slot): Promise<EditionData> {
  const month = await loadMonth(slot.date.slice(0, 7));
  const e = month[slot.date]?.[slot.period];
  const known = e?.topics.filter((id) => byId[id]);
  if (e && known && known.length >= 4) return { ...e, topics: known, quiz: e.quiz && byId[e.quiz] ? e.quiz : undefined };
  return fallbackEdition(slot);
}

const editionCache = new Map<string, EditionData>();

export function useEdition(slot: Slot): EditionData | undefined {
  const key = `${slot.date}:${slot.period}`;
  const [, force] = useState(0);
  useEffect(() => {
    if (editionCache.has(key)) return;
    let alive = true;
    loadEdition(slot).then((e) => {
      editionCache.set(key, e);
      if (alive) force((n) => n + 1);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return editionCache.get(key);
}

export { periods };
