import { useSyncExternalStore } from "react";

// Crumb v2 keeps its own namespace so it can run next to the earlier version without
// corrupting its state. Topic ids are unchanged, so v1 data is imported once if present.
const NS = "crumb:v2:";
const LEGACY_NS = "crumb:v1:";

function safeLocal(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = NS + "probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const local = typeof window === "undefined" ? null : safeLocal();
const memory = new Map<string, string>();

function read<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  let raw: string | null = memory.get(key) ?? null;
  try {
    if (local) raw = local.getItem(NS + key);
  } catch {
    /* storage became unavailable */
  }
  if (raw == null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    local?.setItem(NS + key, raw);
  } catch {
    /* quota or privacy mode – keep the in-memory copy */
  }
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isAnswers = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "number");

const isStringRecord = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string");

/** One day's guessing game: the guesses made (topic ids) and whether it was solved. */
export interface GameDay {
  guesses: string[];
  solved: boolean;
}
const isGames = (v: unknown): v is Record<string, GameDay> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.values(v).every((g) => !!g && typeof g === "object" && isStringArray((g as GameDay).guesses) && typeof (g as GameDay).solved === "boolean");

interface State {
  saved: string[];
  read: string[];
  recent: string[];
  answers: Record<string, number>;
  /** Local date (YYYY-MM-DD) each topic was first read. Older reads have no date. */
  readAt: Record<string, string>;
  /** Local dates on which the reader read, answered or played something. Newest last. */
  days: string[];
  /** The daily guessing game, by date. */
  games: Record<string, GameDay>;
  /** Local date each question was answered, by answer key. */
  answeredOn: Record<string, string>;
}

function migrateLegacy() {
  if (!local) return;
  try {
    if (local.getItem(NS + "migrated")) return;
    local.setItem(NS + "migrated", "1");
    for (const key of ["saved", "read", "recent", "answers"] as const) {
      if (local.getItem(NS + key) != null) continue;
      const legacy = local.getItem(LEGACY_NS + key);
      if (legacy == null) continue;
      const parsed: unknown = JSON.parse(legacy);
      const ok = key === "answers" ? isAnswers(parsed) : isStringArray(parsed);
      if (ok) local.setItem(NS + key, JSON.stringify(parsed));
    }
  } catch {
    /* ignore malformed legacy data */
  }
}

migrateLegacy();

// Quizzes used to have their own ids; they now live on (and are keyed by) their topic.
const RENAMED_QUIZZES: Record<string, string> = { rise: "fermentation", mayo: "emulsions" };
function migrateQuizIds(a: Record<string, number>) {
  const out = { ...a };
  for (const [from, to] of Object.entries(RENAMED_QUIZZES)) {
    if (from in out) {
      if (!(to in out)) out[to] = out[from];
      delete out[from];
    }
  }
  return out;
}

let state: State = {
  saved: read("saved", [], isStringArray),
  read: read("read", [], isStringArray),
  recent: read("recent", [], isStringArray),
  answers: migrateQuizIds(read("answers", {}, isAnswers)),
  readAt: read("readAt", {}, isStringRecord),
  days: read("days", [], isStringArray),
  games: read("games", {}, isGames),
  answeredOn: read("answeredOn", {}, isStringRecord),
};

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Records that the reader did something today (reading, answering, playing). */
function touchToday() {
  const today = localDate();
  if (state.days[state.days.length - 1] !== today) set("days", [...state.days.filter((d) => d !== today), today].slice(-400));
}

const listeners = new Set<() => void>();

function set<K extends keyof State>(key: K, value: State[K]) {
  state = { ...state, [key]: value };
  write(key, value);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const store = {
  get: () => state,
  toggleSaved(id: string): boolean {
    const has = state.saved.includes(id);
    set("saved", has ? state.saved.filter((x) => x !== id) : [id, ...state.saved]);
    return !has;
  },
  restoreSaved(id: string, index: number) {
    if (state.saved.includes(id)) return;
    const next = [...state.saved];
    next.splice(Math.min(index, next.length), 0, id);
    set("saved", next);
  },
  markRead(id: string) {
    if (!state.read.includes(id)) set("read", [...state.read, id]);
    if (!state.readAt[id]) set("readAt", { ...state.readAt, [id]: localDate() });
    set("recent", [id, ...state.recent.filter((x) => x !== id)].slice(0, 12));
    touchToday();
  },
  clearRecent() {
    set("recent", []);
  },
  answer(quiz: string, option: number) {
    set("answers", { ...state.answers, [quiz]: option });
    set("answeredOn", { ...state.answeredOn, [quiz]: localDate() });
    touchToday();
  },
  guess(date: string, topicId: string, solved: boolean) {
    const g = state.games[date] ?? { guesses: [], solved: false };
    if (g.solved || g.guesses.includes(topicId)) return;
    set("games", { ...state.games, [date]: { guesses: [...g.guesses, topicId], solved } });
    touchToday();
  },
  resetAnswer(quiz: string) {
    const next = { ...state.answers };
    delete next[quiz];
    set("answers", next);
  },
};

export const session = {
  get(key: string): string | null {
    try {
      return safeSession()?.getItem(NS + key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      const s = safeSession();
      if (!s) return;
      if (value == null) s.removeItem(NS + key);
      else s.setItem(NS + key, value);
    } catch {
      /* ignore */
    }
  },
};
