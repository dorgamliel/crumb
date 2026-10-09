import { useId, type ReactNode } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { getTopic } from "../data/topics";
import { nav } from "../lib/router";
import type { Tab } from "../types";

interface Props {
  title: string;
  intro: string;
  topic: string;
  from: Tab;
  note: string;
  visual: ReactNode;
  controls: ReactNode;
  readout: ReactNode;
  headingLevel?: 2 | 3;
}

export function LabFrame({ title, intro, topic, from, note, visual, controls, readout, headingLevel = 2 }: Props) {
  const id = useId();
  const t = getTopic(topic);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="lab" aria-labelledby={id}>
      <p className="eyebrow">ניסוי קטן</p>
      <H className="lab__title" id={id}>
        {title}
      </H>
      <p className="lab__intro">{intro}</p>
      <div className="lab__stage">{visual}</div>
      <div className="lab__controls">{controls}</div>
      <div className="lab__readout" aria-live="polite">
        {readout}
      </div>
      <p className="lab__note">
        <Info size={14} aria-hidden="true" />
        <span>{note}</span>
      </p>
      {t && (
        <button type="button" className="link-button" onClick={() => nav.openTopic(t.id, { from, fresh: true })}>
          <span>להסבר המלא: {t.name}</span>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  valueText: string;
  minLabel: string;
  maxLabel: string;
}

export function Slider({ label, value, min, max, step = 1, onChange, valueText, minLabel, maxLabel }: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="slider__value">
          <bdi>{valueText}</bdi>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="slider__ends" aria-hidden="true">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}
