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

import { CHART_INK, resolveSeriesColor, STATUS_VARS } from './palette';
import { useHighlight } from './highlight';
import ChartTooltip from './ChartTooltip';
import type { FunnelChartProps } from './types';

export default function FunnelChart({
  stages, shape = 'funnel', height, width = 560, gap = 4,
  formatValue = v => String(v), color, className, emptyLabel = 'No stages to chart.',
}: FunnelChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { highlighted } = useHighlight();

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
  const mix = (i: number) => 46 + (i / Math.max(1, stages.length - 1)) * 54;
  const shade = (i: number) =>
    `color-mix(in oklab, ${hue} ${mix(i).toFixed(0)}%, ${CHART_INK.surface})`;
  // Surface-coloured text needs a band that is mostly hue behind it. At the
  // ramp's light end the band is nearly the surface itself, so the in-band
  // share switches to the ink that contrasts with the surface.
  const bandInk = (i: number) => (mix(i) >= 55 ? CHART_INK.surface : CHART_INK.label);

  // Local hover names a stage by index; the frame's legend highlight names it
  // by key. Either one recedes the others.
  const dimmed = (i: number, key: string) => {
    if (hover !== null) return hover !== i;
    if (highlighted !== null) return highlighted !== key;
    return false;
  };
  const hoveredStage = hover !== null ? stages[hover] : undefined;

  return (
    <div className={`relative ${className ?? ''}`}>
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
            <g key={stage.key} opacity={dimmed(i, stage.key) ? 0.45 : 1} onMouseEnter={() => setHover(i)}>
              <path
                d={`M${cx - w0},${y0} L${cx + w0},${y0} L${cx + w1},${y1} L${cx - w1},${y1} Z`}
                fill={shade(i)}
              />
              <text x={labelWidth - 14} y={(y0 + y1) / 2 - 2} textAnchor="end" fontSize={12} fill={CHART_INK.label}>
                {stage.label}
              </text>
              <text x={labelWidth - 14} y={(y0 + y1) / 2 + 14} textAnchor="end" fontSize={11} fill={CHART_INK.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatValue(stage.value)}
                {dropped != null ? ` · −${dropped.toFixed(1)}%` : ''}
              </text>
              <text x={cx} y={(y0 + y1) / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={bandInk(i)} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {((stage.value / (stages[0].value || 1)) * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredStage && hover !== null && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hoveredStage.label}
            rows={[
              { key: 'value', label: 'Count', color: shade(hover), value: formatValue(hoveredStage.value) },
              { key: 'share', label: 'Of first stage', color: CHART_INK.muted, value: `${((hoveredStage.value / (stages[0].value || 1)) * 100).toFixed(0)}%` },
              ...(hover > 0 && stages[hover - 1].value > 0
                ? [{ key: 'drop', label: 'Dropped here', color: STATUS_VARS.critical, value: `−${((1 - hoveredStage.value / stages[hover - 1].value) * 100).toFixed(1)}%` }]
                : []),
            ]}
          />
        </div>
      )}
    </div>
  );
}
