import { useId, useRef } from "react";
import { Check, X, RotateCcw, ArrowLeft } from "lucide-react";
import { optionLetters } from "../lib/hebrew";
import { store, useStore } from "../lib/storage";
import { nav } from "../lib/router";
import type { Tab, Topic } from "../types";

interface Props {
  /** The topic whose quiz to show; answers are stored under the topic id. */
  topic: Topic;
  from: Tab;
  /** Compact cards on the Learn screen use a smaller heading level. */
  headingLevel?: 2 | 3;
  kicker?: string;
  showLink?: boolean;
}

export function Quiz({ topic, from, headingLevel = 2, kicker = "שאלה קטנה", showLink = true }: Props) {
  const id = topic.id;
  const quiz = topic.quiz!;
  const { answers } = useStore();
  const answer = answers[id];
  const answered = answer !== undefined;
  const correct = answered && answer === quiz.correct;
  const headingId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const H = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className={`quiz ${answered ? (correct ? "quiz--right" : "quiz--wrong") : ""}`} aria-labelledby={headingId}>
      <p className="eyebrow quiz__kicker">{kicker}</p>
      <H className="quiz__question" id={headingId}>
        {quiz.question}
      </H>
      <ol className="quiz__options" role="list">
        {quiz.options.map((option, i) => {
          const isChosen = answer === i;
          const isCorrect = i === quiz.correct;
          const state = !answered ? "" : isCorrect ? "correct" : isChosen ? "chosen-wrong" : "dim";
          return (
            <li key={i}>
              <button
                type="button"
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                className={`quiz__option ${state && `quiz__option--${state}`}`}
                disabled={answered}
                aria-describedby={answered && (isCorrect || isChosen) ? `${headingId}-r` : undefined}
                onClick={() => store.answer(id, i)}
              >
                <span className="quiz__letter" aria-hidden="true">
                  {optionLetters[i]}
                </span>
                <span className="quiz__text">{option}</span>
                {answered && isCorrect && (
                  <span className="quiz__mark">
                    <Check size={18} aria-hidden="true" />
                    <span className="sr-only">התשובה הנכונה</span>
                  </span>
                )}
                {answered && isChosen && !isCorrect && (
                  <span className="quiz__mark">
                    <X size={18} aria-hidden="true" />
                    <span className="sr-only">הבחירה שלכם</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="quiz__result" aria-live="polite" id={`${headingId}-r`}>
        {answered && (
          <div className="quiz__feedback">
            <p className="quiz__verdict">
              {correct ? (
                <>
                  <Check size={18} aria-hidden="true" /> נכון, בדיוק.
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="quiz__verdict-dot" /> לא הפעם. הנה ההסבר.
                </>
              )}
            </p>
            <p className="quiz__explanation">{quiz.explanation}</p>
            <div className="quiz__actions">
              {showLink && (
                <button type="button" className="link-button" onClick={() => nav.openTopic(topic.id, { from, fresh: true })}>
                  <span>למה זה קורה? לקריאה על {topic.name}</span>
                  <ArrowLeft size={16} aria-hidden="true" className="dir-icon" />
                </button>
              )}
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  store.resetAnswer(id);
                  requestAnimationFrame(() => optionRefs.current[0]?.focus());
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
                לנסות שוב
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
