/** FNV-1a: a small, stable string hash. Same input, same number, on every device. */
export function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * A stable shuffle of 0..n-1 for a given seed. Quiz options are written with the right answer
 * anywhere (often second); showing them in a seeded order means position never gives it away,
 * while every reader still sees the same order for the same question.
 */
export function stableOrder(seed: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`));
}
