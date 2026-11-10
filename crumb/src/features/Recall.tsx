import { useMemo } from "react";
import { getTopic, useTopic } from "../lib/content";
import { hash } from "../lib/hash";
import { dateKey, parseDateKey } from "../lib/schedule";
import { useStore } from "../lib/storage";
import { Quiz } from "../components/Quiz";
import type { Tab } from "../types";

// "זוכרים?" – a question about something the reader read a few days ago. Pulling an answer out
// of memory after a gap (spaced retrieval) is what makes knowledge stick; rereading barely does.
// One card a day, only for topics read 2–14 days ago that have a question.

const daysAgoLabel = (n: number) => (n === 2 ? "שלשום" : n === 7 ? "לפני שבוע" : `לפני ${n} ימים`);

export function recallKey(id: string) {
  return `recall:${id}`;
}

export function useRecallPick(now: Date): { id: string; days: number } | null {
  const { readAt, answers, answeredOn } = useStore();
  const today = dateKey(now);
  return useMemo(() => {
    const candidates = Object.entries(readAt)
      .map(([id, date]) => ({ id, days: Math.round((parseDateKey(today).getTime() - parseDateKey(date).getTime()) / 86400000) }))
      .filter(({ id, days }) => days >= 2 && days <= 14 && getTopic(id)?.hasQuiz)
      // Keep today's pick stable even after it is answered.
      .filter(({ id }) => answers[recallKey(id)] === undefined || answeredOn[recallKey(id)] === today);
    if (!candidates.length) return null;
    // Prefer the classic spacing points (2, 3, 7 days), then a stable daily tie-break.
    const weight = (d: number) => (d === 2 || d === 3 || d === 7 ? 0 : 1);
    candidates.sort((a, b) => weight(a.days) - weight(b.days) || hash(today + a.id) - hash(today + b.id));
    return candidates[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, readAt]);
}

export function Recall({ now, from }: { now: Date; from: Tab }) {
  const pick = useRecallPick(now);
  const { data: topic } = useTopic(pick?.id ?? "");
  if (!pick || !topic?.quiz || topic.id !== pick.id) return null;
  return (
    <div className="recall">
      <Quiz
        topic={topic}
        from={from}
        storeKey={recallKey(topic.id)}
        kicker="זוכרים?"
        context={`קראתם על ${topic.name} ${daysAgoLabel(pick.days)}. בלי להציץ:`}
      />
    </div>
  );
}

