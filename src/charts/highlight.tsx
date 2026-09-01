/**
 * Legend ↔ plot linkage.
 *
 * EvilCharts calls this `hover-highlight`: point at a legend entry and every
 * other series recedes. It is the single most useful interaction on a
 * multi-series chart, because the moment there are four lines the legend stops
 * answering "which one is Acme" — the reader has to trace a colour across a
 * tangle, and colours that were distinguishable in a swatch stop being so
 * against a busy plot.
 *
 * The linkage is a context rather than a prop, because of how this family is
 * assembled: `ChartFrame` owns the legend and the chart is its child, so there
 * is no prop path between them that does not make every caller wire a piece of
 * state it has no other use for.
 *
 * Two rules the implementation enforces:
 *
 *   - **Keyboard focus does exactly what hover does.** A highlight reachable
 *     only by pointer is a feature half the users do not have. The legend
 *     entries are buttons for that reason, not for the click.
 *   - **A legend key must match a series key.** They are the same identifier —
 *     that is what lets colour follow the entity — and a legend entry naming a
 *     key no series has would silently highlight nothing. `useHighlight`
 *     returns the raw key so a chart can compare, and the specs assert the
 *     match rather than trusting it.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { ChartAutoHighlight } from './types';

interface HighlightValue {
  /** The series key under the pointer or focus, or null. */
  highlighted: string | null;
  setHighlighted: (key: string | null) => void;
}

const HighlightContext = createContext<HighlightValue>({
  highlighted: null,
  setHighlighted: () => {},
});

export function ChartHighlightProvider({ children }: { children: ReactNode }) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const value = useMemo(() => ({ highlighted, setHighlighted }), [highlighted]);
  return <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>;
}

export function useHighlight(): HighlightValue {
  return useContext(HighlightContext);
}

/**
 * How opaque a series should be, given what is highlighted.
 *
 * Returns `null` when nothing is highlighted, so a caller can keep whatever
 * opacity it was already using rather than being forced to 1 — the difference
 * matters for a stacked fill, which is translucent by design.
 */
export function highlightOpacity(
  seriesKey: string,
  highlighted: string | null,
  dimmed = 0.22,
): number | null {
  if (highlighted === null) return null;
  return highlighted === seriesKey ? 1 : dimmed;
}

/**
 * The index a chart should light when no pointer is involved.
 *
 * Derived rather than named, because a peak written into a prop goes stale the
 * moment the window moves — and goes SILENTLY stale, which is the worse half.
 * `values` is what the reader compares: a stacked chart passes its bucket
 * totals, not one series.
 *
 * Ties go to the FIRST occurrence. Two equal peaks are a real case and lighting
 * both would say "these are the peak", which is true but useless as an
 * emphasis; lighting the earlier one at least reads as "it first happened
 * here".
 */
export function autoHighlightIndex(
  values: (number | null | undefined)[],
  mode: ChartAutoHighlight = 'none',
): number | null {
  if (mode === 'none' || values.length === 0) return null;

  if (mode === 'last') {
    for (let i = values.length - 1; i >= 0; i -= 1) {
      if (typeof values[i] === 'number' && Number.isFinite(values[i])) return i;
    }
    return null;
  }

  let best: number | null = null;
  values.forEach((value, i) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    if (best === null) { best = i; return; }
    const incumbent = values[best] as number;
    // Strictly better, so a tie keeps the earlier index.
    if (mode === 'max' ? value > incumbent : value < incumbent) best = i;
  });
  return best;
}
