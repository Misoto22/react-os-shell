/**
 * ScatterChart — correlation between two measures, with an optional third
 * encoded as area. Scatter and bubble are the same chart; the bubble is the one
 * that was given a `size`.
 *
 * The size channel goes through `radiusScale`, which square-roots. This is the
 * detail that separates a bubble chart from a misleading one: meaning is
 * carried by AREA, area grows with the square of the radius, so mapping a value
 * straight to a radius makes a doubled value look four times as large.
 *
 * Two constraints inherited from the colour work, both enforced here rather
 * than left to the caller. Scatter is an all-pairs form — every series can sit
 * beside every other, not just its neighbours — and the palette only clears the
 * separation floors for its first three slots under those conditions. So the
 * series cap is three, and past it the caller folds the tail into "Other" or
 * facets. Marks also carry a surface-coloured ring, which is how overlapping
 * points stay countable without a border darkening every one of them.
 */
import { CHART_INK, resolveSeriesColor } from './palette';
import { linearScale, niceMax, radiusScale } from './scale';
import { usePlotWidth } from './usePlotWidth';
import ChartTooltip from './ChartTooltip';
import { useId, useRef, useState } from 'react';
import type { ScatterChartProps } from './types';

/** All-pairs colour separation holds for three slots, not eight. */
export const SCATTER_SERIES_CAP = 3;

export default function ScatterChart({
  series, height = 260, width: widthProp, xLabel, yLabel,
  formatX = v => String(v), formatY = v => String(v),
  radiusRange = [4, 22], className, emptyLabel = 'No observations in this window.',
}: ScatterChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const clipId = useId();
  const [hover, setHover] = useState<{ s: number; i: number } | null>(null);

  const drawn = series.filter(s => s.points.length > 0).slice(0, SCATTER_SERIES_CAP);
  if (drawn.length === 0) {
    return <div className={className} ref={host}><p className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>{emptyLabel}</p></div>;
  }

  const all = drawn.flatMap(s => s.points);
  const sized = all.some(p => p.size != null);
  const margin = { top: 14, right: 20, bottom: 34, left: 52 };
  const left = margin.left;
  const right = Math.max(left + 1, width - margin.right);
  const x = linearScale([Math.min(0, ...all.map(p => p.x)), niceMax(Math.max(...all.map(p => p.x)))], { from: left, to: right });
  const y = linearScale([Math.min(0, ...all.map(p => p.y)), niceMax(Math.max(...all.map(p => p.y)))], { from: height - margin.bottom, to: margin.top });
  const r = radiusScale([0, Math.max(...all.map(p => p.size ?? 1))], { from: radiusRange[0], to: radiusRange[1] });

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label={`${drawn.map(s => s.label).join(', ')}: ${yLabel ?? 'y'} against ${xLabel ?? 'x'}`}
        onMouseLeave={() => setHover(null)}>
        <defs><clipPath id={clipId}><rect x={left - radiusRange[1]} y={margin.top - radiusRange[1]} width={right - left + radiusRange[1] * 2} height={height - margin.bottom - margin.top + radiusRange[1] * 2} /></clipPath></defs>

        {y.ticks(5).map(t => (
          <g key={`y${t}`}>
            <line x1={left} y1={y(t)} x2={right} y2={y(t)} stroke={CHART_INK.grid} strokeWidth={1} shapeRendering="crispEdges" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART_INK.label} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatY(t)}</text>
          </g>
        ))}
        {x.ticks(5).map(t => (
          <text key={`x${t}`} x={x(t)} y={height - 12} textAnchor="middle" fontSize={11} fill={CHART_INK.label} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatX(t)}</text>
        ))}
        {xLabel && <text x={(left + right) / 2} y={height - 0.5} textAnchor="middle" fontSize={11} fill={CHART_INK.label}>{xLabel}</text>}
        {yLabel && <text x={12} y={height / 2} transform={`rotate(-90 12 ${height / 2})`} textAnchor="middle" fontSize={11} fill={CHART_INK.label}>{yLabel}</text>}

        <g clipPath={`url(#${clipId})`}>
          {drawn.map((s, si) => {
            const colour = resolveSeriesColor(si, s.color, s.tone);
            return s.points.map((p, i) => (
              <circle
                key={`${s.key}-${i}`} cx={x(p.x)} cy={y(p.y)}
                r={sized ? r(p.size ?? 0) : radiusRange[0] + 1}
                fill={colour} fillOpacity={hover && (hover.s !== si) ? 0.25 : 0.62}
                stroke={CHART_INK.surface} strokeWidth={2}
                onMouseEnter={() => setHover({ s: si, i })}
              />
            ));
          })}
        </g>
      </svg>

      {hover && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={drawn[hover.s].points[hover.i].label ?? drawn[hover.s].label}
            rows={[
              { key: 'x', label: xLabel ?? 'x', color: resolveSeriesColor(hover.s, drawn[hover.s].color, drawn[hover.s].tone), value: formatX(drawn[hover.s].points[hover.i].x) },
              { key: 'y', label: yLabel ?? 'y', color: resolveSeriesColor(hover.s, drawn[hover.s].color, drawn[hover.s].tone), value: formatY(drawn[hover.s].points[hover.i].y) },
              ...(drawn[hover.s].points[hover.i].size != null
                ? [{ key: 'size', label: 'Size', color: CHART_INK.muted, value: String(drawn[hover.s].points[hover.i].size) }]
                : []),
            ]}
            footnote={drawn[hover.s].points[hover.i].label ? drawn[hover.s].label : undefined}
          />
        </div>
      )}
    </div>
  );
}
