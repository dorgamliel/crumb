import { useState } from "react";
import { ImageOff } from "lucide-react";
import { images } from "../data/images";

interface Props {
  image: string;
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

export function Picture({ image, sizes = "100vw", className = "", eager, heroId, decorative }: Props) {
  const asset = images[image];
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  if (!asset || state === "failed") {
    return (
      <div className={`pic pic--failed ${className}`} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : asset?.alt} data-hero-id={heroId}>
        <ImageOff aria-hidden="true" size={22} strokeWidth={1.5} />
        <span aria-hidden="true">התמונה לא נטענה</span>
      </div>
    );
  }
  return (
    <div className={`pic ${className}`} data-state={state} data-hero-id={heroId}>
      <img
        src={`${base}img/${asset.key}-720.webp`}
        srcSet={`${base}img/${asset.key}-720.webp 720w, ${base}img/${asset.key}-1400.webp ${asset.width}w`}
        sizes={sizes}
        width={asset.width}
        height={asset.height}
        alt={decorative ? "" : asset.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : undefined}
        style={asset.focus ? { objectPosition: asset.focus } : undefined}
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0 && state === "loading") setState("loaded");
        }}
      />
    </div>
  );
}
