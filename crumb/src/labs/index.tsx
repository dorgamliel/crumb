import type { LabId, Tab } from "../types";
import { BrowningLab } from "./Browning";
import { EmulsionLab } from "./Emulsion";
import { HydrationLab } from "./Hydration";

export function Lab({ id, from, headingLevel }: { id: LabId; from: Tab; headingLevel?: 2 | 3 }) {
  if (id === "hydration") return <HydrationLab from={from} headingLevel={headingLevel} />;
  if (id === "emulsion") return <EmulsionLab from={from} headingLevel={headingLevel} />;
  return <BrowningLab from={from} headingLevel={headingLevel} />;
}
