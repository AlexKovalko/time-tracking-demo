/** Stable hash → palette colors for chart/calendar (AC-45). */

const HUES = [195, 45, 155, 250, 25, 85, 220, 70] as const;
const PALETTE_COUNT = HUES.length;

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 1-based palette slot matching CSS `--palette-N`. */
export function paletteIndexForKey(key: string): number {
  if (!key) return 1;
  return (hashString(key) % PALETTE_COUNT) + 1;
}

/**
 * Distinct color for a stable key (employee id, segment label, …).
 * Uses CSS vars when possible; falls back to hashed oklch so two keys
 * almost never share an identical computed color (calendar AC-45).
 */
export function colorForKey(key: string): string {
  const h = hashString(key || "x");
  const hue = HUES[h % PALETTE_COUNT];
  const light = 0.52 + ((h >>> 8) % 7) * 0.03;
  const chroma = 0.09 + ((h >>> 16) % 5) * 0.012;
  // Inline oklch keeps calendar fills distinct even when CSS var slots collide
  return `oklch(${light.toFixed(3)} ${chroma.toFixed(3)} ${hue})`;
}

/** Direct CSS var for chart series index (0-based). */
export function chartColorAt(index: number): string {
  const n = (index % PALETTE_COUNT) + 1;
  return `var(--palette-${n})`;
}
