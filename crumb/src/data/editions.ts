import type { Edition, Period } from "../types";

export const editions: Record<Period, Edition> = {
  morning: {
    period: "morning",
    name: "בוקר",
    title: "בוקר בלי למהר.",
    subtitle: "קצת קפה, משהו לקרוא, ורעיון לקחת למטבח.",
    hour: 8,
    placements: [
      { type: "cover", topic: "sourdough" },
      { type: "pair", topics: ["tangzhong", "coffee"] },
      {
        type: "note",
        topic: "gluten",
        kicker: "רגע של מדע",
        text: "קמח לבדו לא מכיל גלוטן מוכן. הוא נוצר רק כשהחלבונים פוגשים מים — ואז הזמן עושה חלק גדול מהעבודה.",
      },
      { type: "quiz", quiz: "rise" },
      { type: "spotlight", topic: "butter" },
      { type: "strip", title: "מה קורה בתוך הבצק", topics: ["fermentation", "hydration", "eggs"] },
      { type: "lab", lab: "hydration" },
    ],
    closing: "המהדורה הבאה תצא בצהריים, ב־13:00.",
  },
  afternoon: {
    period: "afternoon",
    name: "צהריים",
    title: "הפסקה עם טעם.",
    subtitle: "כמה דקות פנויות? יש מה לגלות.",
    hour: 13,
    placements: [
      { type: "cover", topic: "tomatoes" },
      { type: "pair", topics: ["spices", "yogurt"] },
      { type: "spotlight", topic: "olive-oil" },
      {
        type: "compare",
        topic: "emulsions",
        title: "שני רטבים, שני גורלות",
        sides: [
          { label: "ויניגרט", text: "שמן וחומץ נטרפים לטיפות, אבל אין מה שיחזיק אותן. אחרי כמה דקות הרוטב נפרד." },
          { label: "מיונז", text: "החלמון מצפה כל טיפת שמן בחומרים מתחלבים. התחליב נשאר יציב וסמיך." },
        ],
      },
      { type: "quiz", quiz: "mayo" },
      { type: "lab", lab: "emulsion" },
      { type: "strip", title: "חמוץ, חומצי, עמילני", topics: ["acidity", "pickles", "starch"] },
    ],
    closing: "המהדורה הבאה תצא בערב, ב־19:00.",
  },
  evening: {
    period: "evening",
    name: "ערב",
    title: "משהו טוב לסוף היום.",
    subtitle: "לקרוא בנחת. אולי גם לקבל רעיון למחר.",
    hour: 19,
    placements: [
      { type: "cover", topic: "pasta" },
      {
        type: "steps",
        topic: "pasta-water",
        title: "רוטב שנצמד בשלושה צעדים",
        steps: [
          "לפני הסינון, טובלים כוס בסיר ושומרים את המים העכורים בצד.",
          "מעבירים את הפסטה למחבת עם הרוטב, דקה לפני שהיא מוכנה.",
          "מוסיפים מעט מהמים ומערבבים במרץ, עד שהרוטב מבריק ועוטף.",
        ],
      },
      { type: "pair", topics: ["cheese", "pizza"] },
      {
        type: "note",
        topic: "pepper",
        kicker: "ידעתם?",
        text: "פלפל שחור, לבן וירוק מגיעים מאותו צמח. רק הפלפל הוורוד הוא בכלל ממשפחה אחרת.",
      },
      { type: "feature", topic: "browning", kicker: "המדע של הקרום" },
      { type: "quiz", quiz: "browning" },
      { type: "lab", lab: "browning" },
      {
        type: "compare",
        topic: "caramel",
        title: "שתי השחמות שקל לבלבל",
        sides: [
          { label: "קרמליזציה", text: "סוכר לבדו מתפרק בחום. כך נוצר קרמל." },
          { label: "תגובת מייאר", text: "סוכרים וחומצות אמינו מגיבים יחד. כך נוצר קרום של לחם או צלי." },
        ],
      },
      { type: "feature", topic: "lamination", kicker: "לקינוח" },
    ],
    closing: "המהדורה הבאה תצא מחר בבוקר, ב־08:00.",
  },
};

export const periods: Period[] = ["morning", "afternoon", "evening"];

/** Topic ids an edition introduces, in reading order and without repeats. */
export function editionTopics(edition: Edition): string[] {
  const ids: string[] = [];
  const add = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };
  for (const p of edition.placements) {
    if ("topics" in p) p.topics.forEach(add);
    else if ("topic" in p) add(p.topic);
  }
  return ids;
}

export function editionQuiz(edition: Edition): string | undefined {
  const q = edition.placements.find((p) => p.type === "quiz");
  return q && q.type === "quiz" ? q.quiz : undefined;
}
