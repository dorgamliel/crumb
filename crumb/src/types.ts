export type Kind = "baking" | "science" | "ingredients" | "dishes" | "drinks" | "techniques";

export interface ImageCredit {
  /** Photographer or uploader, exactly as published by the source. Omitted when not verified. */
  author?: string;
  /** Where the file came from, e.g. "Unsplash" or "Wikimedia Commons". */
  source: string;
  license: string;
  url?: string;
}

/** What cards need to draw a photo. */
export interface ImageRef {
  key: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position for deliberate crops. */
  focus?: string;
}

export interface ImageAsset extends ImageRef {
  credit: ImageCredit;
}

export interface Source {
  title: string;
  publisher: string;
  url: string;
  /** What this source supports – it does not certify the whole article. */
  supports?: string;
}

export type RelationKind =
  | "process"
  | "explains"
  | "ingredient"
  | "technique"
  | "relative"
  | "affects"
  | "example";

export interface Relation {
  target: string;
  kind: RelationKind;
  /** One sentence, in Hebrew, describing why the two topics connect. */
  why: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface Angles {
  note?: { kicker: string; text: string };
  compare?: { title: string; sides: [{ label: string; text: string }, { label: string; text: string }] };
  steps?: { title: string; steps: string[] };
}

export type EditorialStatus = "draft" | "source-linked" | "auto-checked";

/** The light record every topic has in the index: enough for search, lists and the map. */
export interface TopicCard {
  id: string;
  /** The subject's name – used in breadcrumbs, maps and lists. */
  name: string;
  /** Editorial headline for cards and the article. */
  headline: string;
  kind: Kind;
  minutes: number;
  /** Null while a photo has not been found yet; cards then show drawn artwork. */
  image: ImageRef | null;
  keywords: string[];
  related: { target: string; kind: RelationKind }[];
  hasQuiz: boolean;
  status: EditorialStatus;
}

/** The full topic, loaded on demand from content/t/<id>.json. */
export interface Topic extends Omit<TopicCard, "image" | "hasQuiz" | "related"> {
  dek: string;
  image: ImageAsset | null;
  body: string[];
  facts: string[];
  takeaway: string;
  related: Relation[];
  sources: Source[];
  updatedAt: string;
  quiz?: QuizData;
  angles?: Angles;
  review?: { checkedAt: string; notes?: string };
}

export type LabId = "hydration" | "emulsion" | "browning";

export type Period = "morning" | "afternoon" | "evening";

/** Period metadata that does not change between days. */
export interface EditionMeta {
  period: Period;
  name: string;
  hour: number;
  closing: string;
  /** Used when a day has no published schedule. */
  fallbackTitle: string;
  fallbackSubtitle: string;
}

/** One day's edition, as published in content/schedule/<YYYY-MM>.json. */
export interface EditionData {
  title: string;
  subtitle: string;
  topics: string[];
  /** Topic id whose quiz appears in this edition. */
  quiz?: string;
}

export type Tab = "today" | "atlas" | "learn" | "saved";

export interface Route {
  tab: Tab;
  /** Topics opened from the tab, in order. Empty when the tab itself is showing. */
  trail: string[];
}
