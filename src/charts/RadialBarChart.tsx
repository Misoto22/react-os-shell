/**
 * RadialBarChart — bars bent onto arcs, as concentric tracks or as columns
 * around a shared centre.
 *
 * Be honest about what this is for. A radial bar is harder to compare than a
 * straight one: outer arcs are longer than inner arcs at the same value, so
 * length is not a fair encoding, and the eye judges arcs worse than lines. It
 * earns its place in two cases only, and both are about the CATEGORIES rather
 * than the values:
 *
 *   - `track` — a small set of gauges that each read as a proportion of their
 *     own ring. The comparison is each bar against its own 100%, not against
 *     its neighbours, which is exactly what the concentric layout communicates.
 *   - `column` — categories that are genuinely cyclical: hours of a day, months
 *     of a year, points of a compass. The circle carries the wrap-around, which
 *     a straight axis cannot.
 *
 * For anything else, use `ColumnChart` or `RankedBars`. The angular sweep is
 * capped at 300° in `track` mode so the start and end of a full ring never
 * touch and become unreadable.
 */
import { useId, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { arcPath } from './curve';
import { MOTION, stagger } from './effects';
import { angleScale } from './scale';
import type { RadialBarChartProps } from './types';

const TRACK_SWEEP = (300 * Math.PI) / 180;

export default function RadialBarChart({
  rows, variant = 'track', size = 300, max, formatValue = v => String(v),
  animate = true, className, emptyLabel = 'Nothing to plot.', trackGap = 6,
}: RadialBarChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (rows.length === 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 10;
  const top = max ?? Math.max(...rows.map(r => r.value), 1);

  const bandWidth = variant === 'track'
    ? Math.max(6, (outer - size * 0.16) / rows.length)
    : 0;
  const angle = angleScale(rows.length, 0.03);

  return (
    <div className={className}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}>
        <title id={titleId}>{`${rows.length} categories, ${variant === 'track' ? 'as concentric proportions' : 'around a cycle'}`}</title>

        {rows.map((row, i) => {
          const colour = resolveSeriesColor(i, row.color, row.tone);
          const share = Math.max(0, Math.min(1, row.value / top));
          const dim = hover !== null && hover !== i;

          if (variant === 'track') {
            const r2 = outer - i * bandWidth;
            const r1 = r2 - bandWidth + trackGap;
            const start = -Math.PI / 2;
            return (
              <g key={row.key} opacity={dim ? 0.4 : 1} onMouseEnter={() => setHover(i)}
                className={animate ? MOTION.sweep : undefined} style={animate ? stagger(i, 70) : undefined}>
                <path d={arcPath(cx, cy, r1, r2, start, start + TRACK_SWEEP)} fill={CHART_INK.grid} />
                <path d={arcPath(cx, cy, r1, r2, start, start + TRACK_SWEEP * share)} fill={colour}>
                  <title>{`${row.label}: ${formatValue(row.value)}`}</title>
                </path>
              </g>
            );
          }

          const inner = size * 0.14;
          return (
            <g key={row.key} opacity={dim ? 0.4 : 1} onMouseEnter={() => setHover(i)}>
              <path
                d={arcPath(cx, cy, inner, inner + (outer - inner) * share, angle(i), angle(i) + angle.step)}
                fill={colour}
              >
                <title>{`${row.label}: ${formatValue(row.value)}`}</title>
              </path>
            </g>
          );
        })}
      </svg>

      <ul className="m-0 mt-3 grid gap-1 p-0" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        {rows.map((row, i) => (
          <li key={row.key} className="flex list-none items-center gap-2 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: resolveSeriesColor(i, row.color, row.tone) }} />
            <span className="flex-1 truncate">{row.label}</span>
            <span className="tabular-nums text-gray-800">{formatValue(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
