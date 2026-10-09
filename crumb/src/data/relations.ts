import type { Kind, RelationKind } from "../types";

/** Short labels shown on map branches; they describe what the linked topic is to the current one. */
export const relationLabels: Record<RelationKind, string> = {
  process: "אותו תהליך",
  explains: "ההסבר",
  ingredient: "חומר גלם",
  technique: "טכניקה",
  relative: "קרובי משפחה",
  affects: "משפיע על התוצאה",
  example: "דוגמה מהמטבח",
};

export const kindLabels: Record<Kind, string> = {
  baking: "אפייה",
  science: "מדע האוכל",
  ingredients: "חומרי גלם",
  dishes: "מנות",
  drinks: "משקאות",
  techniques: "טכניקות",
};

export const kindOrder: Kind[] = ["baking", "science", "ingredients", "dishes", "drinks", "techniques"];
