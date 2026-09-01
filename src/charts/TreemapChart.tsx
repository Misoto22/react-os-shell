/**
 * TreemapChart — part-to-whole when there are far too many parts for a pie.
 *
 * A pie stops working past about six slices; a treemap stays readable into the
 * dozens because area is a stronger channel than angle and the cells tile the
 * space instead of competing for a circle. This is the form for "which of our
 * forty part-number families is the inventory actually in".
 *
 * Two rules the layout enforces, both from `marks-and-anatomy`:
 *
 *   - **Cells are separated by a surface gap, never a border.** A stroke around
 *     every tile thickens the whole picture and reads as a grid; the gap lets
 *     the card show through and disappears.
 *   - **A label is only drawn when it FITS.** A clipped label is worse than no
 *     label — it reads as a different word — so a tile too small to hold its
 *     text keeps the value in its tooltip and in the table view instead.
 */
import { useRef, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { squarify } from './treemapLayout';
import { usePlotWidth } from './usePlotWidth';
import type { TreemapChartProps } from './types';

/** Rough px per character at 11px; enough to decide whether a label fits. */
const CHAR_WIDTH = 6.2;

export default function TreemapChart({
  items, height = 320, width: widthProp, gap = 2, radius = 3,
  formatValue = v => String(v), color, className, emptyLabel = 'Nothing to break down.',
}: TreemapChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const [hover, setHover] = useState<string | null>(null);

  const tiles = squarify(items, width, height);
  if (tiles.length === 0) {
    return <div className={className} ref={host}><p className="py-8 text-center text-sm text-gray-500">{emptyLabel}</p></div>;
  }

  const hue = color ?? resolveSeriesColor(0);
  const top = Math.max(...tiles.map(t => t.value), 1);
  const shade = (value: number) =>
    `color-mix(in oklab, ${hue} ${(34 + (value / top) * 62).toFixed(0)}%, ${CHART_INK.surface})`;

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label={`Treemap of ${items.length} items`} onMouseLeave={() => setHover(null)}>
        {tiles.map(tile => {
          const w = Math.max(0, tile.width - gap);
          const h = Math.max(0, tile.height - gap);
          const fitsLabel = w > tile.label.length * CHAR_WIDTH + 12 && h > 30;
          const fitsValue = fitsLabel && h > 44;
          return (
            <g key={tile.key} opacity={hover && hover !== tile.key ? 0.55 : 1} onMouseEnter={() => setHover(tile.key)}>
              <rect
                x={tile.x + gap / 2} y={tile.y + gap / 2} width={w} height={h}
                rx={radius} fill={shade(tile.value)}
              >
                <title>{`${tile.label}: ${formatValue(tile.value)}`}</title>
              </rect>
              {fitsLabel && (
                <text x={tile.x + gap / 2 + 8} y={tile.y + gap / 2 + 18} fontSize={11.5} fontWeight={600} fill={CHART_INK.surface}>
                  {tile.label}
                </text>
              )}
              {fitsValue && (
                <text x={tile.x + gap / 2 + 8} y={tile.y + gap / 2 + 34} fontSize={11} fill={CHART_INK.surface} fillOpacity={0.85} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatValue(tile.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
