import type { EditionMeta, Period } from "../types";

export const editions: Record<Period, EditionMeta> = {
  morning: {
    period: "morning",
    name: "בוקר",
    hour: 8,
    closing: "המהדורה הבאה תצא בצהריים, ב־13:00.",
    fallbackTitle: "בוקר בלי למהר.",
    fallbackSubtitle: "קצת קפה, משהו לקרוא, ורעיון לקחת למטבח.",
  },
  afternoon: {
    period: "afternoon",
    name: "צהריים",
    hour: 13,
    closing: "המהדורה הבאה תצא בערב, ב־19:00.",
    fallbackTitle: "הפסקה עם טעם.",
    fallbackSubtitle: "כמה דקות פנויות? יש מה לגלות.",
  },
  evening: {
    period: "evening",
    name: "ערב",
    hour: 19,
    closing: "המהדורה הבאה תצא מחר בבוקר, ב־08:00.",
    fallbackTitle: "משהו טוב לסוף היום.",
    fallbackSubtitle: "לקרוא בנחת. אולי גם לקבל רעיון למחר.",
  },
};

export const periods: Period[] = ["morning", "afternoon", "evening"];
