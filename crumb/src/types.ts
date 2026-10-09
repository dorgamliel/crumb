export type Kind = "baking" | "science" | "ingredients" | "dishes" | "drinks" | "techniques";

export interface ImageCredit {
  /** Photographer or uploader, exactly as published by the source. Omitted when not verified. */
  author?: string;
  /** Where the file came from, e.g. "Unsplash" or "Wikimedia Commons". */
  source: string;
  license: string;
  url?: string;
}

export interface ImageAsset {
  key: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position for deliberate crops. */
  focus?: string;
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

export type EditorialStatus = "draft" | "source-linked";

export interface Topic {
  id: string;
  /** The subject's name – used in breadcrumbs, maps and lists. */
  name: string;
  /** Editorial headline for cards and the article. */
  headline: string;
  /** One- or two-sentence introduction. */
  dek: string;
  kind: Kind;
  image: string;
  minutes: number;
  body: string[];
  facts?: string[];
  takeaway: string;
  related: Relation[];
  sources: Source[];
  status: EditorialStatus;
  updatedAt: string;
  /** Extra search terms (synonyms, related words). Never displayed. */
  keywords?: string[];
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
}

export type LabId = "hydration" | "emulsion" | "browning";

export type Period = "morning" | "afternoon" | "evening";

export type Placement =
  | { type: "cover"; topic: string }
  | { type: "pair"; topics: [string, string] }
  | { type: "feature"; topic: string; kicker: string }
  | { type: "note"; topic: string; kicker: string; text: string }
  | { type: "spotlight"; topic: string }
  | { type: "quiz"; quiz: string }
  | { type: "lab"; lab: LabId }
  | { type: "strip"; title: string; topics: string[] }
  | {
      type: "compare";
      topic: string;
      title: string;
      sides: [{ label: string; text: string }, { label: string; text: string }];
    }
  | { type: "steps"; topic: string; title: string; steps: string[] };

export interface Edition {
  period: Period;
  name: string;
  title: string;
  subtitle: string;
  hour: number;
  placements: Placement[];
  closing: string;
}

export type Tab = "today" | "atlas" | "learn" | "saved";

export interface Route {
  tab: Tab;
  /** Topics opened from the tab, in order. Empty when the tab itself is showing. */
  trail: string[];
}
