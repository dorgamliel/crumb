import type { MouseEvent, ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { getTopic } from "../data/topics";
import { images } from "../data/images";
import { kindLabels } from "../data/relations";
import { markHero, nav, toHash } from "../lib/router";
import { minutesLabel } from "../lib/hebrew";
import { useStore } from "../lib/storage";
import type { Tab, Topic } from "../types";
import { Picture } from "./Picture";
import { SaveButton } from "./SaveButton";

/** A link that opens a topic article and lets its image morph into the article hero. */
export function TopicLink({
  id,
  from,
  className,
  children,
  label,
}: {
  id: string;
  from: Tab;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    markHero(e.currentTarget.closest("[data-card]")?.querySelector(".pic") ?? null);
    nav.openTopic(id, { from, fresh: true });
  };
  return (
    <a href={toHash({ tab: from, trail: [id] })} className={className} onClick={onClick} data-focus-key={`topic-${id}`} aria-label={label}>
      {children}
    </a>
  );
}

function Meta({ topic, light }: { topic: Topic; light?: boolean }) {
  const { read } = useStore();
  const isRead = read.includes(topic.id);
  return (
    <p className={`meta ${light ? "meta--light" : ""}`}>
      <span>{kindLabels[topic.kind]}</span>
      <span aria-hidden="true">·</span>
      <span>{minutesLabel(topic.minutes)}</span>
      {isRead && (
        <span className="meta__read">
          <Check size={13} aria-hidden="true" />
          נקרא
        </span>
      )}
    </p>
  );
}

export function CoverCard({ id, from, eager, top }: { id: string; from: Tab; eager?: boolean; top?: ReactNode }) {
  const t = getTopic(id)!;
  return (
    <article className={`cover ${top ? "cover--front" : ""}`} data-card>
      {top && <div className="cover__top">{top}</div>}
      <Picture image={t.image} eager={eager} sizes="(min-width: 760px) 720px, 100vw" className="cover__pic" heroId={t.id} />
      <div className="cover__shade" aria-hidden="true" />
      <div className="cover__body">
        <Meta topic={t} light />
        <h2 className="cover__title">
          <TopicLink id={id} from={from} className="stretched">
            {t.headline}
          </TopicLink>
        </h2>
        <p className="cover__dek">{t.dek}</p>
        <div className="cover__actions">
          <span className="cover__cta" aria-hidden="true">
            לקריאה על {t.name}
            <ArrowLeft size={16} />
          </span>
          {top && <SaveButton id={id} />}
        </div>
      </div>
      {!top && (
        <div className="cover__save">
          <SaveButton id={id} />
        </div>
      )}
    </article>
  );
}

export function SmallCard({ id, from, ratio = "portrait" }: { id: string; from: Tab; ratio?: "portrait" | "square" | "wide" }) {
  const t = getTopic(id)!;
  return (
    <article className={`card card--${ratio}`} data-card>
      <div className="card__media">
        <Picture image={t.image} sizes="(min-width: 760px) 340px, 50vw" heroId={t.id} />
        <div className="card__save">
          <SaveButton id={id} />
        </div>
      </div>
      <p className="card__name">{t.name}</p>
      <h3 className="card__title">
        <TopicLink id={id} from={from} className="stretched">
          {t.headline}
        </TopicLink>
      </h3>
      <Meta topic={t} />
    </article>
  );
}

export function FeatureCard({ id, from, kicker }: { id: string; from: Tab; kicker: string }) {
  const t = getTopic(id)!;
  return (
    <article className="feature" data-card>
      <div className="feature__media">
        <Picture image={t.image} sizes="(min-width: 760px) 720px, 100vw" heroId={t.id} />
      </div>
      <div className="feature__body">
        <p className="eyebrow">{kicker}</p>
        <h2 className="feature__title">
          <TopicLink id={id} from={from} className="stretched">
            {t.headline}
          </TopicLink>
        </h2>
        <p className="feature__dek">{t.dek}</p>
        <div className="feature__foot">
          <Meta topic={t} />
          <SaveButton id={id} />
        </div>
      </div>
    </article>
  );
}

export function NoteCard({ id, from, kicker, text }: { id: string; from: Tab; kicker: string; text: string }) {
  const t = getTopic(id)!;
  return (
    <aside className="note" aria-label={kicker} data-card>
      <p className="eyebrow">{kicker}</p>
      <p className="note__text">{text}</p>
      <TopicLink id={id} from={from} className="link-button">
        <span>
          עוד על {t.name}: {t.headline}
        </span>
        <ArrowLeft size={16} aria-hidden="true" />
      </TopicLink>
    </aside>
  );
}

export function SpotlightCard({ id, from }: { id: string; from: Tab }) {
  const t = getTopic(id)!;
  return (
    <article className="spotlight" data-card>
      <div className="spotlight__media">
        <Picture image={t.image} sizes="(min-width: 760px) 360px, 60vw" heroId={t.id} />
      </div>
      <div className="spotlight__body">
        <p className="eyebrow">חומר גלם בזרקור</p>
        <h2 className="spotlight__name">{t.name}</h2>
        <p className="spotlight__headline">{t.headline}</p>
        {t.facts && (
          <ul className="spotlight__facts">
            {t.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <TopicLink id={id} from={from} className="link-button">
          <span>לכל הסיפור</span>
          <ArrowLeft size={16} aria-hidden="true" />
        </TopicLink>
      </div>
    </article>
  );
}

export function Strip({ title, ids, from }: { title: string; ids: string[]; from: Tab }) {
  return (
    <section className="strip" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <ul className="strip__list" role="list">
        {ids.map((id) => {
          const t = getTopic(id)!;
          return (
            <li key={id} className="strip__item" data-card>
              <Picture image={t.image} sizes="60vw" className="strip__pic" heroId={t.id} />
              <div className="strip__shade" aria-hidden="true" />
              <div className="strip__body">
                <p className="strip__name">{t.name}</p>
                <h3 className="strip__title">
                  <TopicLink id={id} from={from} className="stretched">
                    {t.headline}
                  </TopicLink>
                </h3>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CompareCard({
  id,
  from,
  title,
  sides,
}: {
  id: string;
  from: Tab;
  title: string;
  sides: [{ label: string; text: string }, { label: string; text: string }];
}) {
  const t = getTopic(id)!;
  return (
    <section className="compare" aria-label={title} data-card>
      <p className="eyebrow">השוואה</p>
      <h2 className="compare__title">{title}</h2>
      <div className="compare__grid">
        {sides.map((s, i) => (
          <div key={s.label} className={`compare__side compare__side--${i}`}>
            <p className="compare__label">{s.label}</p>
            <p>{s.text}</p>
          </div>
        ))}
        <span className="compare__vs" aria-hidden="true">
          מול
        </span>
      </div>
      <TopicLink id={id} from={from} className="link-button">
        <span>
          הכתבה המלאה: {t.name}
        </span>
        <ArrowLeft size={16} aria-hidden="true" />
      </TopicLink>
    </section>
  );
}

export function StepsCard({ id, from, title, steps }: { id: string; from: Tab; title: string; steps: string[] }) {
  const t = getTopic(id)!;
  return (
    <section className="steps" aria-label={title} data-card>
      <div className="steps__media">
        <Picture image={t.image} sizes="(min-width: 760px) 360px, 100vw" heroId={t.id} />
      </div>
      <div className="steps__body">
        <p className="eyebrow">טכניקה בקצרה</p>
        <h2 className="steps__title">{title}</h2>
        <ol className="steps__list">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <TopicLink id={id} from={from} className="link-button">
          <span>
            למה זה עובד? {t.headline}
          </span>
          <ArrowLeft size={16} aria-hidden="true" />
        </TopicLink>
      </div>
    </section>
  );
}

/** Compact row used in lists (atlas results, saved, recent). */
export function TopicRow({ id, from, trailing }: { id: string; from: Tab; trailing?: ReactNode }) {
  const t = getTopic(id)!;
  return (
    <li className="row" data-card>
      <Picture image={t.image} sizes="96px" className="row__pic" heroId={t.id} decorative />
      <div className="row__body">
        <p className="row__name">
          <TopicLink id={id} from={from} className="stretched">
            {t.name}
          </TopicLink>
        </p>
        <p className="row__headline">{t.headline}</p>
        <Meta topic={t} />
      </div>
      {trailing && <div className="row__trailing">{trailing}</div>}
    </li>
  );
}

export const imageAlt = (id: string) => images[getTopic(id)?.image ?? ""]?.alt ?? "";
