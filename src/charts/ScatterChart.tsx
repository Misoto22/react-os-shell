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
import { registerModalEscapeInterceptor } from '../shell/escapeInterceptors';
import { CHART_INK, resolveSeriesColor } from './palette';
import { linearScale, logScale, niceMax, radiusScale } from './scale';
import { usePlotWidth } from './usePlotWidth';
import ChartTooltip from './ChartTooltip';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { ScatterChartProps } from './types';

/** All-pairs colour separation holds for three slots, not eight. */
export const SCATTER_SERIES_CAP = 3;

export default function ScatterChart({
  series, height = 260, width: widthProp, xLabel, yLabel,
  formatX = v => String(v), formatY = v => String(v),
  xDomain, yDomain, xScale = 'linear', yScale = 'linear',
  radiusRange = [4, 22], className, emptyLabel = 'No observations in this window.',
}: ScatterChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const clipId = useId();
  const [hover, setHover] = useState<{ s: number; i: number } | null>(null);

  // Escape goes through the modal seam — `Modal` listens on `window` in the
  // CAPTURE phase, so the svg's own handler never sees the press inside a
  // shell window. Registered only while a point is lit.
  useEffect(() => {
    if (hover === null) return;
    return registerModalEscapeInterceptor(event => {
      if (event.key !== 'Escape') return false;
      setHover(null);
      return true;
    });
  }, [hover]);

  // A SUPPLIED domain is a window on the data, so points outside it are not
  // drawable: the scales extrapolate rather than clamp, and the plot's clip is
  // padded by one bubble radius so an edge bubble is not sliced in half. Left
  // alone, a point just outside painted over the y-axis tick labels and one
  // further out vanished with nothing said — while still occupying a stop in
  // the keyboard walk and a tooltip. Drop them from the series instead, and
  // say how many in the accessible label.
  const inDomain = (v: number, d: [number, number] | undefined) =>
    !d || (v >= Math.min(d[0], d[1]) && v <= Math.max(d[0], d[1]));
  const offered = series.filter(s => s.points.length > 0).slice(0, SCATTER_SERIES_CAP);
  const drawn = (xDomain || yDomain)
    ? offered
      .map(s => ({ ...s, points: s.points.filter(p => inDomain(p.x, xDomain) && inDomain(p.y, yDomain)) }))
      .filter(s => s.points.length > 0)
    : offered;
  const omitted = offered.reduce((n, s) => n + s.points.length, 0)
    - drawn.reduce((n, s) => n + s.points.length, 0);

  if (drawn.length === 0) {
    return <div className={className} ref={host}><p className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>{emptyLabel}</p></div>;
  }

  const all = drawn.flatMap(s => s.points);
  const sized = all.some(p => p.size != null);
  const margin = { top: 14, right: 20, bottom: 34, left: 52 };
  const left = margin.left;
  const right = Math.max(left + 1, width - margin.right);
  // A derived domain rounds its top up so the axis ends on a readable number;
  // a supplied one is taken as given, because the caller asking for it is
  // usually asking to stop spending a third of the plot on empty space.
  //
  // A derived LOG domain starts at the smallest value present rather than at
  // zero. `Math.min(0, …)` is right for a linear axis, where the origin is the
  // reference the reader measures against; on a log axis it is a value with no
  // logarithm, so it forced `logScale` to borrow a floor and threw away the
  // real one the data already had.
  const axis = (
    values: number[],
    supplied: [number, number] | undefined,
    kind: 'linear' | 'log',
    range: { from: number; to: number },
  ) => {
    // `Math.min()` of nothing is Infinity, and a domain starting there is not
    // a domain. Data with no positive value at all has no log form; hand the
    // zero through and let `logScale` degenerate rather than emit NaN geometry.
    const positive = values.filter(v => v > 0);
    const base = kind === 'log'
      ? (positive.length > 0 ? Math.min(...positive) : 0)
      : Math.min(0, ...values);
    const domain = supplied ?? [base, niceMax(Math.max(...values))];
    return kind === 'log' ? logScale(domain, range) : linearScale(domain, range);
  };
  const x = axis(all.map(p => p.x), xDomain, xScale, { from: left, to: right });
  const y = axis(all.map(p => p.y), yDomain, yScale, { from: height - margin.bottom, to: margin.top });
  const r = radiusScale([0, Math.max(...all.map(p => p.size ?? 1))], { from: radiusRange[0], to: radiusRange[1] });

  // Hover indices go stale when a polling caller shrinks the data mid-hover;
  // resolve them defensively so a vanished point drops the tooltip instead of
  // crashing the tree.
  const hoveredSeries = hover ? drawn[hover.s] : undefined;
  const hoveredPoint = hover && hoveredSeries ? hoveredSeries.points[hover.i] : undefined;

  // Arrow keys walk every point, series by series — the tooltip a pointer gets
  // must be reachable without one. Same convention as `CartesianPlot`.
  const flat = drawn.flatMap((s, si) => s.points.map((_, i) => ({ s: si, i })));
  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const at = hover ? flat.findIndex(p => p.s === hover.s && p.i === hover.i) : 0;
    setHover(flat[Math.min(flat.length - 1, Math.max(0, at + delta))]);
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label={`${drawn.map(s => s.label).join(', ')}: ${yLabel ?? 'y'} against ${xLabel ?? 'x'}`
          + (omitted > 0 ? `. ${omitted} ${omitted === 1 ? 'point' : 'points'} outside the shown range` : '')}
        tabIndex={0}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)} onKeyDown={onKey}>
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

      {hover && hoveredSeries && hoveredPoint && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hoveredPoint.label ?? hoveredSeries.label}
            rows={[
              { key: 'x', label: xLabel ?? 'x', color: resolveSeriesColor(hover.s, hoveredSeries.color, hoveredSeries.tone), value: formatX(hoveredPoint.x) },
              { key: 'y', label: yLabel ?? 'y', color: resolveSeriesColor(hover.s, hoveredSeries.color, hoveredSeries.tone), value: formatY(hoveredPoint.y) },
              ...(hoveredPoint.size != null
                ? [{ key: 'size', label: 'Size', color: CHART_INK.muted, value: String(hoveredPoint.size) }]
                : []),
            ]}
            footnote={hoveredPoint.label ? hoveredSeries.label : undefined}
          />
        </div>
      )}
    </div>
  );
}
