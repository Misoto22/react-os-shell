/**
 * Measure the container so the analytical charts can draw in real pixels.
 *
 * The decorative charts dodge this with a stretched `0 0 100 100` viewBox, but
 * that stretches text too, so anything with an axis has to know its own width.
 * `@visx/responsive` solves it with a ResizeObserver wrapper; this is the same
 * idea at a tenth of the size, and without a dependency.
 *
 * The fallback matters more than the hook. Server rendering and the package's
 * own specs have no layout, so a chart that waited for a measurement would
 * render an empty box in both — the first paint would be blank in an SSR app
 * and untestable here. Starting at a plausible width means the chart is
 * complete markup from the first frame and only ever gets *corrected* by the
 * observer, never populated by it.
 */
import { useEffect, useState, type RefObject } from 'react';

/** Wide enough to look deliberate in a half-window card if never measured. */
export const DEFAULT_PLOT_WIDTH = 720;

export function usePlotWidth(
  ref: RefObject<HTMLElement | null>,
  fallback = DEFAULT_PLOT_WIDTH,
): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const measured = entries[0]?.contentRect.width ?? 0;
      // A hidden window (display:none) measures 0. Keeping the last good width
      // means reopening it does not flash a collapsed plot.
      if (measured > 0) setWidth(measured);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
