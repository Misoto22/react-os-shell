/**
 * ChordChart — flows between every pair in one set, arranged on a circle.
 *
 * Where a Sankey shows a flow that moves left to right through stages, a chord
 * shows one that can go both ways between the same participants: transfers
 * between warehouses, substitutions between part numbers, traffic between
 * tenants. The circle exists precisely because there is no direction of travel
 * to lay out along.
 *
 * It is a demanding form and the limits are real, so they are enforced rather
 * than documented and hoped for. Past about ten participants the ribbons occlude
 * each other and the chart becomes a decorative tangle — `maxNodes` folds the
 * tail. Colour follows the SOURCE arc, which is the only convention that lets a
 * reader trace a ribbon back to where it came from.
 */
import { useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { arcPath } from './curve';
import type { ChordChartProps } from './types';

export default function ChordChart({
  labels, matrix, size = 340, maxNodes = 10, padAngle = 0.04, arcWidth = 12,
  formatValue = v => String(v), className, emptyLabel = 'No flows to chart.',
}: ChordChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const totals = labels.map((_, i) =>
    matrix[i].reduce((n, v) => n + v, 0) + matrix.reduce((n, row) => n + row[i], 0));
  const order = labels.map((_, i) => i).sort((a, b) => totals[b] - totals[a]).slice(0, maxNodes);
  const grand = order.reduce((n, i) => n + totals[i], 0);
  if (grand <= 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 44;
  const inner = outer - arcWidth;
  const gaps = padAngle * order.length;

  // Each participant's arc spans its share of the total traffic.
  const spans = new Map<number, { start: number; end: number; slot: number }>();
  let cursor = -Math.PI / 2;
  order.forEach((index, slot) => {
    const sweep = (totals[index] / grand) * (Math.PI * 2 - gaps);
    spans.set(index, { start: cursor, end: cursor + sweep, slot });
    cursor += sweep + padAngle;
  });

  // Ribbons leave each arc stacked, so two flows from one participant do not
  // start at the same point.
  const outCursor = new Map<number, number>();
  const ribbons: { from: number; to: number; value: number; a: number; b: number }[] = [];
  for (const from of order) {
    for (const to of order) {
      const value = matrix[from]?.[to] ?? 0;
      if (value <= 0) continue;
      const span = spans.get(from)!;
      const width = (value / Math.max(1, totals[from])) * (span.end - span.start);
      const offset = outCursor.get(from) ?? 0;
      outCursor.set(from, offset + width);
      ribbons.push({ from, to, value, a: span.start + offset + width / 2, b: spans.get(to)!.start + (spans.get(to)!.end - spans.get(to)!.start) / 2 });
    }
  }

  const point = (angle: number, r: number) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;

  return (
    <div className={className}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Flows between ${order.length} participants`} onMouseLeave={() => setHover(null)}>
        {ribbons.map((ribbon, i) => {
          const [x1, y1] = point(ribbon.a, inner);
          const [x2, y2] = point(ribbon.b, inner);
          const colour = resolveSeriesColor(spans.get(ribbon.from)!.slot);
          const lit = hover === null || hover === ribbon.from || hover === ribbon.to;
          return (
            <path
              key={i} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none"
              stroke={colour} strokeWidth={Math.max(1, (ribbon.value / grand) * size * 0.9)}
              strokeOpacity={lit ? 0.34 : 0.07} strokeLinecap="round"
            >
              <title>{`${labels[ribbon.from]} → ${labels[ribbon.to]}: ${formatValue(ribbon.value)}`}</title>
            </path>
          );
        })}

        {order.map(index => {
          const span = spans.get(index)!;
          const mid = (span.start + span.end) / 2;
          const [lx, ly] = point(mid, outer + 16);
          return (
            <g key={index} onMouseEnter={() => setHover(index)}>
              <path
                d={arcPath(cx, cy, inner, outer, span.start, span.end)}
                fill={resolveSeriesColor(span.slot)}
                fillOpacity={hover === null || hover === index ? 1 : 0.45}
              >
                <title>{`${labels[index]}: ${formatValue(totals[index])}`}</title>
              </path>
              <text
                x={lx} y={ly + 4} fontSize={11} fill={CHART_INK.label}
                textAnchor={Math.cos(mid) > 0.15 ? 'start' : Math.cos(mid) < -0.15 ? 'end' : 'middle'}
              >
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
