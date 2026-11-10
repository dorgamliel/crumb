import { useState } from "react";
import { ChefHat, Coffee, Croissant, FlaskConical, ImageOff, Carrot, Soup, type LucideIcon } from "lucide-react";
import type { ImageRef, Kind } from "../types";

interface Props {
  image: ImageRef | null;
  /** Used to draw artwork while a topic has no photo yet. */
  name?: string;
  kind?: Kind;
  /** CSS `sizes` hint for choosing between the 720 and 1400 pixel files. */
  sizes?: string;
  className?: string;
  eager?: boolean;
  /** Lets a card image morph into the article hero during view transitions. */
  heroId?: string;
  /** Hide the image from assistive technology when the surrounding text already says it. */
  decorative?: boolean;
}

const base = import.meta.env.BASE_URL;

const kindIcons: Record<Kind, LucideIcon> = {
  baking: Croissant,
  science: FlaskConical,
  ingredients: Carrot,
  dishes: Soup,
  drinks: Coffee,
  techniques: ChefHat,
};

/** Drawn artwork for topics whose photo is still being sourced: a printed-label look, not a gap. */
function Art({ name, kind, className, heroId }: { name?: string; kind?: Kind; className: string; heroId?: string }) {
  const Icon = kindIcons[kind ?? "science"];
  return (
    <div className={`pic pic--art pic--art-${kind ?? "science"} ${className}`} data-hero-id={heroId} aria-hidden="true">
      <span className="pic__icon">
        <Icon strokeWidth={1.25} />
      </span>
      <span className="pic__word">{name}</span>
    </div>
  );
}

export function Picture({ image, name, kind, sizes = "100vw", className = "", eager, heroId, decorative }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  if (!image) return <Art name={name} kind={kind} className={className} heroId={heroId} />;
  if (state === "failed") {
    return (
      <div className={`pic pic--failed ${className}`} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : image.alt} data-hero-id={heroId}>
        <ImageOff aria-hidden="true" size={22} strokeWidth={1.5} />
        <span aria-hidden="true">התמונה לא נטענה</span>
      </div>
    );
  }
  return (
    <div className={`pic ${className}`} data-state={state} data-hero-id={heroId}>
      <img
        src={`${base}img/${image.key}-720.webp`}
        srcSet={`${base}img/${image.key}-720.webp 720w, ${base}img/${image.key}-1400.webp ${image.width}w`}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={decorative ? "" : image.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : undefined}
        style={image.focus ? { objectPosition: image.focus } : undefined}
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && state === "loading") setState("loaded");
        }}
      />
    </div>
  );
}
