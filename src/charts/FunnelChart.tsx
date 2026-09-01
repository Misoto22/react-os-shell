/**
 * FunnelChart — an ordered sequence of stages and what was lost between them.
 *
 * The value is the drop-off, not the stages, so this states it: each band is
 * labelled with its own count, its share of the first stage, and the percentage
 * that failed to reach it from the stage immediately above. A funnel that only
 * draws the widths makes the reader do that arithmetic.
 *
 * `cone` tapers each band to the next stage's width instead of drawing a
 * rectangle, which is the variant chart pickers list separately. It reads
 * better when the drop-off is smooth and worse when one stage collapses — the
 * slope then implies a gradual loss that was actually a cliff — so `funnel` is
 * the default.
 *
 * Ordered stages are an ordinal scale, not a nominal one, so the fill is one
 * hue stepping darker down the funnel rather than eight categorical colours.
 * The step stays above the contrast floor at the light end; it never fades into
 * the surface, because a stage that recedes reads as a stage that is missing.
 */
import { useId, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import type { FunnelChartProps } from './types';

export default function FunnelChart({
  stages, shape = 'funnel', height, width = 560, gap = 4,
  formatValue = v => String(v), color, className, emptyLabel = 'No stages to chart.',
}: FunnelChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (stages.length === 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  const hue = color ?? resolveSeriesColor(0);
  const bandHeight = 54;
  const total = height ?? stages.length * bandHeight;
  const top = Math.max(...stages.map(s => s.value), 1);
  const labelWidth = 168;
  const plotWidth = width - labelWidth;
  const half = (value: number) => (plotWidth * Math.max(0, value / top)) / 2;
  const cx = labelWidth + plotWidth / 2;

  // Ordinal ramp: one hue, stepping darker, never reaching the surface.
  const shade = (i: number) =>
    `color-mix(in oklab, ${hue} ${(46 + (i / Math.max(1, stages.length - 1)) * 54).toFixed(0)}%, ${CHART_INK.surface})`;

  return (
    <div className={className}>
      <svg width="100%" height={total} viewBox={`0 0 ${width} ${total}`} role="img" aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}>
        <title id={titleId}>{`Funnel of ${stages.length} stages, ${formatValue(stages[0].value)} down to ${formatValue(stages[stages.length - 1].value)}`}</title>

        {stages.map((stage, i) => {
          const y0 = (i * total) / stages.length + gap / 2;
          const y1 = ((i + 1) * total) / stages.length - gap / 2;
          const w0 = half(stage.value);
          const w1 = shape === 'cone' ? half(stages[i + 1]?.value ?? stage.value) : w0;
          const previous = stages[i - 1]?.value;
          const dropped = previous != null && previous > 0
            ? (1 - stage.value / previous) * 100
            : null;
          return (
            <g key={stage.key} opacity={hover !== null && hover !== i ? 0.45 : 1} onMouseEnter={() => setHover(i)}>
              <path
                d={`M${cx - w0},${y0} L${cx + w0},${y0} L${cx + w1},${y1} L${cx - w1},${y1} Z`}
                fill={shade(i)}
              >
                <title>{`${stage.label}: ${formatValue(stage.value)}`}</title>
              </path>
              <text x={labelWidth - 14} y={(y0 + y1) / 2 - 2} textAnchor="end" fontSize={12} fill={CHART_INK.label}>
                {stage.label}
              </text>
              <text x={labelWidth - 14} y={(y0 + y1) / 2 + 14} textAnchor="end" fontSize={11} fill={CHART_INK.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatValue(stage.value)}
                {dropped != null ? ` · −${dropped.toFixed(1)}%` : ''}
              </text>
              <text x={cx} y={(y0 + y1) / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={CHART_INK.surface} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {((stage.value / (stages[0].value || 1)) * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
