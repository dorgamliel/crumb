const NIQQUD = /[֑-ׇ]/g;
const QUOTES = /["'`׳״“”‘’]/g;
const DASHES = /[-־–—_/\\.,:;!?()[\]{}]/g;
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** Lowercase, strip niqqud and punctuation, and fold Hebrew final letters for matching. */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .replace(NIQQUD, "")
    .replace(QUOTES, "")
    .replace(DASHES, " ")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PREFIXES = ["וה", "שה", "בה", "לה", "מה", "כש", "ה", "ו", "ב", "ל", "מ", "ש", "כ"];

/** Possible forms of a Hebrew query token, with common one- and two-letter prefixes removed. */
export function tokenForms(token: string): string[] {
  const forms = [token];
  for (const p of PREFIXES) {
    if (token.startsWith(p) && token.length - p.length >= 2) forms.push(token.slice(p.length));
  }
  return forms;
}

export function matches(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return q.split(" ").every((token) => tokenForms(token).some((f) => haystack.includes(f)));
}

export const optionLetters = ["א", "ב", "ג", "ד", "ה", "ו"];

const dateFmt = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" });
const shortDateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

export function formatShortDate(d: Date): string {
  return shortDateFmt.format(d);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function minutesLabel(n: number): string {
  return n === 1 ? "דקת קריאה" : `${n} דקות קריאה`;
}

export function countLabel(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`;
}
