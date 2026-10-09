import { getTopic } from "../data/topics";
import { relationLabels } from "../data/relations";
import { Picture } from "./Picture";

interface Props {
  center: string;
  /** Called when a branch is chosen. */
  onPick: (id: string) => void;
  /** Called when the center is activated. */
  onOpenCenter?: (id: string) => void;
  centerHint?: string;
  branchHint: string;
}

// The map is slightly taller than wide, so branches get more vertical room on phones.
const RX = 34;
const RY = 37;

export function ConnectionMap({ center, onPick, onOpenCenter, centerHint, branchHint }: Props) {
  const topic = getTopic(center);
  if (!topic) return null;
  const branches = topic.related.slice(0, 5).filter((r) => getTopic(r.target));
  const n = branches.length;
  const start = n === 4 ? -135 : -90;
  const placed = branches.map((r, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return { ...r, x: 50 + Math.cos(a) * RX, y: 50 + Math.sin(a) * RY };
  });

  return (
    <div className="map" role="group" aria-label={`מפת הקשרים של ${topic.name}`}>
      <svg className="map__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" key={`lines-${center}`}>
        {placed.map((p) => (
          <line key={p.target} x1="50" y1="50" x2={p.x} y2={p.y} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <button
        type="button"
        key={center}
        className="map__node map__node--center"
        style={{ left: "50%", top: "50%" }}
        onClick={() => onOpenCenter?.(center)}
        aria-label={`${topic.name}${centerHint ? ` — ${centerHint}` : ""}`}
      >
        <Picture image={topic.image} sizes="120px" className="map__img" decorative />
        <span className="map__name">{topic.name}</span>
        {centerHint && <span className="map__hint">{centerHint}</span>}
      </button>
      {placed.map((p) => {
        const t = getTopic(p.target)!;
        return (
          <button
            type="button"
            key={p.target}
            className="map__node"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onPick(p.target)}
            aria-label={`${t.name} (${relationLabels[p.kind]}) — ${branchHint}`}
          >
            <Picture image={t.image} sizes="80px" className="map__img" decorative />
            <span className="map__name">{t.name}</span>
            <span className="map__rel">{relationLabels[p.kind]}</span>
          </button>
        );
      })}
    </div>
  );
}
