/**
 * TimeSeriesChart — a trend someone reads values off, rather than glances at.
 *
 * Four series modes, because four different things get plotted against time and
 * only one of them is a plain line:
 *
 *   line     a continuous measure sampled per bucket
 *   area     the same, with a fill, for a single series carrying the story
 *   stacked  counts that sum to a total — the composition IS the point
 *   step     a QUANTISED measure, held flat across its bucket
 *
 * `step` is the one worth explaining. A value that can only land on a known set
 * of levels — a histogram-derived percentile, a tier, a discrete state — is not
 * a sample of a continuous signal, and joining consecutive levels with a sloped
 * segment draws a transition that never happened. The EFFICIENT Observability
 * console shipped exactly that bug: its P95 line zig-zagged between 100 ms and
 * 250 ms four times in five minutes, which read as latency oscillating and was
 * really one rung of quantisation, drawn as motion. Pair `mode: 'step'` with
 * `levels` and the chart tells the truth twice — flat segments, and an ordinal
 * y-axis whose ticks ARE the levels.
 *
 * What this deliberately is NOT: a second y-axis. Two measures on different
 * scales get two charts, because the alignment between two y-scales is
 * arbitrary and the crossing point it produces is a correlation the data does
 * not contain. There is no prop for it.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { registerModalEscapeInterceptor } from '../shell/escapeInterceptors';

import { CHART_INK, resolveSeriesColor, type StatusTone } from './palette';
import { areaBetween, areaFrom, curvePath, stepPath, type Point } from './curve';
import { ChartDefs, MOTION, dashFor, fillFor, maskId, stagger } from './effects';
import { bandScale, ladderScale, linearScale, niceMax } from './scale';
import ChartBrush from './ChartBrush';
import ChartDot from './ChartDot';
import ChartSkeleton from './ChartSkeleton';
import { highlightOpacity, useHighlight } from './highlight';
import ChartTooltip from './ChartTooltip';
import { usePlotWidth } from './usePlotWidth';
import { STATUS_VARS } from './palette';
import type { ChartRange, TimeSeriesChartProps, TimeSeriesSeries } from './types';

const MARGIN = { top: 12, right: 16, bottom: 26, left: 52 };

/** A gap in the data is a gap in the line, never a segment across it. */
const isValue = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export default function TimeSeriesChart({
  series,
  labels,
  height = 200,
  stacked = false,
  stackMode = 'value',
  levels,
  curve = 'linear',
  tension = 0,
  max,
  yTickCount = 4,
  formatValue = v => String(v),
  yAxisLabel,
  referenceLines,
  labelEndpoints = false,
  dots,
  dotVariant = 'border',
  pulse = false,
  brush = false,
  range,
  onRangeChange,
  loading = false,
  animate = true,
  reveal = 'left-to-right',
  fillVariant = 'gradient',
  gridStyle = 'solid',
  width: widthProp,
  className,
  emptyLabel = 'No data in this window.',
}: TimeSeriesChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const [active, setActive] = useState<number | null>(null);
  // Uncontrolled by default; `range` + `onRangeChange` take over when both are
  // given, so two charts can be driven onto one window.
  const [ownRange, setOwnRange] = useState<ChartRange | null>(null);
  const { highlighted } = useHighlight();
  const clipId = useId();

  // Escape goes through the modal seam — `Modal` listens on `window` in the
  // CAPTURE phase, so the svg's own handler never sees the press inside a
  // shell window and the window would close instead of the crosshair
  // clearing. Registered only while a band is active.
  useEffect(() => {
    if (active === null) return;
    return registerModalEscapeInterceptor(event => {
      if (event.key !== 'Escape') return false;
      setActive(null);
      return true;
    });
  }, [active]);

  if (loading) {
    return <div className={className} ref={host}><ChartSkeleton height={height} width={widthProp ?? measured} /></div>;
  }

  const fullLabels = labels;
  // Not named `window`: this file also works with the real one — the modal
  // seam above listens on it — and shadowing the global is how the wrong one
  // gets grabbed silently.
  const viewRange: ChartRange = range
    ?? ownRange
    ?? [0, Math.max(0, fullLabels.length - 1)];
  const [windowFrom, windowTo] = viewRange;
  const setWindow = (next: ChartRange) => {
    if (onRangeChange) onRangeChange(next);
    else setOwnRange(next);
  };
  const slice = <T,>(items: T[]): T[] =>
    brush ? items.slice(windowFrom, windowTo + 1) : items;

  // `slot` pins each series to its ORIGINAL index: colour must not shift when
  // an all-null series is dropped, or the plot disagrees with a caller-built
  // legend exactly when a series has a data outage.
  const drawn = series
    .map((s, slot) => ({ ...s, slot }))
    .filter(s => s.data.some(isValue))
    .map(s => ({ ...s, data: slice(s.data) }));
  labels = slice(fullLabels);

  if (drawn.length === 0 || labels.length === 0) {
    return (
      <div className={className} ref={host}>
        <p className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>
          {emptyLabel}
        </p>
      </div>
    );
  }

  const plot = {
    left: MARGIN.left,
    right: Math.max(MARGIN.left + 1, width - MARGIN.right),
    top: MARGIN.top,
    bottom: height - MARGIN.bottom,
  };
  const x = bandScale(labels.length, { from: plot.left, to: plot.right });

  // Stacked series carry cumulative tops; everything else plots its own value.
  //
  // In `percent` mode each bucket is divided by its OWN total, which is what
  // makes composition comparable across buckets of wildly different size. A
  // bucket whose total is zero has no composition — dividing would be 0/0 — so
  // it is left as a gap rather than drawn as an empty or a full stack. That
  // distinction is the whole reason this is not a one-line normalise.
  const bucketTotals = labels.map((_, i) =>
    drawn.reduce((sum, s) => sum + (isValue(s.data[i]) ? (s.data[i] as number) : 0), 0));
  const share = (value: number, i: number) =>
    bucketTotals[i] > 0 ? value / bucketTotals[i] : null;

  const tops: (number | null)[][] = [];
  if (stacked) {
    let running = labels.map(() => 0);
    for (const s of drawn) {
      running = running.map((sum, i) => sum + (isValue(s.data[i]) ? (s.data[i] as number) : 0));
      tops.push(stackMode === 'percent'
        ? running.map((sum, i) => share(sum, i))
        : [...running]);
    }
  }

  const ladder = levels && levels.length > 0
    ? ladderScale(levels, { from: plot.bottom, to: plot.top })
    : null;

  const values = stacked
    ? ((tops.at(-1) ?? []).filter(isValue) as number[])
    : drawn.flatMap(s => s.data.filter(isValue) as number[]);
  const top = stacked && stackMode === 'percent'
    ? 1
    : max ?? niceMax(Math.max(...values, 0));
  const y = linearScale([0, top], { from: plot.bottom, to: plot.top });
  const scaleY = (value: number) => (ladder ? ladder(value) : y(value));

  // A percent stack's axis is a percentage. Without this the ticks print
  // 0, 0.25, 0.5 … which reads as a ratio the caller never asked for.
  const isPercent = stacked && stackMode === 'percent';
  const formatTick = isPercent ? (v: number) => `${Math.round(v * 100)}%` : formatValue;

  const yTicks = ladder
    ? ladder.levels.map(level => ({ value: level, y: ladder(level) }))
    : y.ticks(yTickCount + 1).map(value => ({ value, y: y(value) }));

  const move = (delta: number) => (event: KeyboardEvent<SVGSVGElement>) => {
    event.preventDefault();
    setActive(prev => {
      const next = (prev ?? 0) + delta;
      return Math.min(labels.length - 1, Math.max(0, next));
    });
  };

  const tickLabelStep = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(width / 96))));

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${drawn.map(s => s.label).join(', ')} over ${labels.length} intervals`}
        tabIndex={0}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={event => {
          if (event.key === 'ArrowRight') move(1)(event);
          if (event.key === 'ArrowLeft') move(-1)(event);
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} />
          </clipPath>
        </defs>
        <ChartDefs
          id={clipId}
          fills={drawn.map((s2, i) => ({
            color: resolveSeriesColor(s2.slot, s2.color, s2.tone),
            variant: s2.fillVariant ?? fillVariant,
          }))}
          fadeFrom={stacked ? 0.42 : 0.3}
          reveal={animate ? reveal : false}
        />

        {/* Grid: solid hairlines one shade off the surface. Dashes read as a
            threshold, and none of these are one. */}
        {yTicks.map(tick => (
          <line
            key={`grid-${tick.value}`}
            x1={plot.left} y1={tick.y} x2={plot.right} y2={tick.y}
            stroke={CHART_INK.grid} strokeWidth={1} shapeRendering="crispEdges"
            strokeDasharray={gridStyle === 'dashed' ? '3 3' : undefined}
          />
        ))}
        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke={CHART_INK.axis} strokeWidth={1} shapeRendering="crispEdges" />

        {yTicks.map(tick => (
          <text
            key={`ytick-${tick.value}`}
            x={plot.left - 8} y={tick.y + 4}
            textAnchor="end" fontSize={11} fill={CHART_INK.label}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatTick(tick.value)}
          </text>
        ))}
        {yAxisLabel && (
          <text
            x={12} y={(plot.top + plot.bottom) / 2}
            transform={`rotate(-90 12 ${(plot.top + plot.bottom) / 2})`}
            textAnchor="middle" fontSize={11} fill={CHART_INK.label}
          >
            {yAxisLabel}
          </text>
        )}

        <g clipPath={`url(#${clipId})`} mask={animate && reveal ? `url(#${maskId(clipId)})` : undefined}>
          {drawn.map((s, si) => {
            const color = resolveSeriesColor(s.slot, s.color, s.tone);
            const mode = s.mode ?? (stacked ? 'area' : 'line');
            // `null` means nothing is highlighted, so the series keeps whatever
            // opacity it already had — a stacked fill is translucent by design
            // and forcing it to 1 would flatten the stack.
            const lit = highlightOpacity(s.key, highlighted);

            if (mode === 'step') {
              const bands = labels
                .map((_, i) => ({ start: x(i), end: x.end(i), value: s.data[i] }))
                .filter(b => isValue(b.value))
                .map(b => ({ start: b.start, end: b.end, y: scaleY(b.value as number) }));
              return (
                <path
                  key={s.key} d={stepPath(bands)} fill="none" stroke={color}
                  strokeWidth={2.5} strokeLinecap="butt" strokeLinejoin="miter"
                  opacity={lit ?? undefined} className="rosh-viz-mark"
                />
              );
            }

            const points: Point[] = labels
              .map((_, i) => {
                const value = stacked ? tops[si]?.[i] : s.data[i];
                return isValue(value) ? ([x.center(i), scaleY(value)] as Point) : null;
              })
              .filter((p): p is Point => p !== null);
            if (points.length === 0) return null;

            if (mode === 'column') {
              // A column series inside a time chart is the Combination form:
              // volume as bars behind a rate as a line, on ONE shared axis.
              const slot = Math.max(1, x.bandwidth * 0.62);
              return (
                <g key={s.key} opacity={lit ?? undefined} className="rosh-viz-mark">
                  {labels.map((_, i) => {
                    const value = stacked ? tops[si]?.[i] : s.data[i];
                    if (!isValue(value)) return null;
                    const top = scaleY(value);
                    return (
                      <rect
                        key={i} x={x.center(i) - slot / 2} y={top}
                        width={slot} height={Math.max(0, plot.bottom - top)}
                        rx={2} fill={color} fillOpacity={0.35}
                        className={animate ? MOTION.rise : undefined}
                        style={animate ? stagger(i, 26) : undefined}
                      />
                    );
                  })}
                </g>
              );
            }

            const line = curvePath(points, curve, tension);
            const baseline: Point[] | null = stacked && si > 0
              ? labels.map((_, i) => [x.center(i), scaleY(tops[si - 1]?.[i] ?? 0) - 2] as Point)
              : null;

            // A 2px gap between stacked fills separates them without a border.
            const area = baseline ? areaBetween(line, baseline) : areaFrom(line, points, plot.bottom);

            return (
              <g key={s.key} opacity={lit ?? undefined} className="rosh-viz-mark">
                {(mode === 'area' || stacked) && (
                  // A vertical alpha fade rather than a flat wash: the fill is
                  // densest where the line is and dissolves toward the baseline,
                  // so it reads as belonging to the line instead of as a slab.
                  <path d={area} fill={fillFor(clipId, si, s.fillVariant ?? fillVariant, color)} stroke="none" />
                )}
                <path
                  d={line} fill="none" stroke={color} strokeWidth={2}
                  strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray={dashFor(s.stroke ?? (s.forecast ? 'animated-dashed' : 'solid'))}
                  className={
                    animate && (s.stroke === 'animated-dashed' || (s.forecast && !s.stroke))
                      ? MOTION.march : undefined
                  }
                />
              </g>
            );
          })}
        </g>

        {/* Thresholds. Dashed on purpose, and the only dashed thing here: a
            dash reads as "a line someone drew" rather than "a value the data
            reached", which is what a threshold is and what a gridline is not.
            Drawn above the series so a rule crossed by a spike stays visible. */}
        {referenceLines?.map((rule, i) => {
          const colour = rule.color ?? STATUS_VARS[rule.tone ?? 'critical'];
          const ry = scaleY(rule.value);
          return (
            <g key={`rule-${i}`}>
              <line
                x1={plot.left} y1={ry} x2={plot.right} y2={ry}
                stroke={colour} strokeWidth={1} strokeDasharray="5 4"
              />
              {rule.label && (
                <text
                  x={plot.right - 4} y={ry - 5}
                  textAnchor="end" fontSize={10.5} fontWeight={600} fill={colour}
                >
                  {rule.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Markers. Direct LABELS stay selective — a value on every point is
            chaos and goes unread — but the dots themselves are a separate
            choice, because on a sparse series they are how a reader sees where
            the samples actually are. */}
        {(dots ?? (labelEndpoints ? 'last' : 'none')) !== 'none' && drawn.map((s, si) => {
          const which = dots ?? (labelEndpoints ? 'last' : 'none');
          const color = resolveSeriesColor(s.slot, s.color, s.tone);
          const lastIndex = [...s.data].map(isValue).lastIndexOf(true);
          const indices = which === 'all'
            ? labels.map((_, i) => i).filter(i => isValue(stacked ? tops[si]?.[i] : s.data[i]))
            : lastIndex >= 0 ? [lastIndex] : [];
          return (
            <g key={`dots-${s.key}`}>
              {indices.map(i => {
                const value = stacked ? tops[si]?.[i] : s.data[i];
                if (!isValue(value)) return null;
                return (
                  <ChartDot
                    key={i} cx={x.center(i)} cy={scaleY(value)} color={color}
                    variant={dotVariant}
                    // Only the final marker pulses: a whole line of pulsing
                    // dots is a strobe, and only the last one is "now".
                    pulse={pulse && i === lastIndex}
                    title={`${labels[i]}: ${s.label} ${formatValue(value)}`}
                  />
                );
              })}
              {labelEndpoints && lastIndex >= 0 && isValue(stacked ? tops[si]?.[lastIndex] : s.data[lastIndex]) && (
                <text
                  x={x.center(lastIndex) - 10} y={scaleY((stacked ? tops[si]?.[lastIndex] : s.data[lastIndex]) as number) - 9}
                  textAnchor="end" fontSize={11.5} fontWeight={600} fill={CHART_INK.label}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatValue((stacked ? tops[si]?.[lastIndex] : s.data[lastIndex]) as number)}
                </text>
              )}
            </g>
          );
        })}

        {labels.map((label, i) => (
          i % tickLabelStep === 0 ? (
            <text
              key={`xtick-${i}`} x={x.center(i)} y={height - 8}
              textAnchor="middle" fontSize={11} fill={CHART_INK.label}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {label}
            </text>
          ) : null
        ))}

        {active !== null && (
          <line
            x1={x.center(active)} y1={plot.top} x2={x.center(active)} y2={plot.bottom}
            stroke={CHART_INK.axis} strokeWidth={1}
          />
        )}

        {/* Hit targets span the whole band, so the pointer never has to find a
            2px line. */}
        {labels.map((_, i) => (
          <rect
            key={`hit-${i}`} x={x(i)} y={plot.top} width={Math.max(1, x.bandwidth)} height={plot.bottom - plot.top}
            fill="transparent" onMouseEnter={() => setActive(i)}
          />
        ))}
      </svg>

      {brush && fullLabels.length > 2 && (
        <ChartBrush
          className="mt-1"
          labels={fullLabels}
          width={width}
          // The first series carries the outline: the strip is for locating a
          // window, not for reading values, and stacking every series into it
          // would make it a second chart competing with the one above.
          data={series[0]?.data ?? []}
          range={viewRange}
          onRangeChange={setWindow}
        />
      )}

      {active !== null && (
        // The clamp budgets for the card's own width (`min-w-44`, 176px): a
        // percentage-only clamp let the card spill past the right edge of any
        // container under ~590px.
        <div
          className="absolute top-2 z-10"
          style={{ left: `clamp(0px, calc(${((x.center(active) / width) * 100).toFixed(2)}% - 88px), calc(100% - 184px))` }}
        >
          <ChartTooltip
            title={labels[active]}
            rows={drawn.map((s, si) => ({
              key: s.key,
              label: s.label,
              color: resolveSeriesColor(s.slot, s.color, s.tone),
              // In percent mode the plot has thrown volume away, so the tooltip
              // carries it back: the share the chart drew AND the count it was
              // taken over. A share without its denominator is the thing this
              // whole family keeps refusing to ship.
              value: !isValue(s.data[active])
                ? undefined
                : stacked && stackMode === 'percent'
                  ? `${((share(s.data[active] as number, active) ?? 0) * 100).toFixed(1)}% · ${formatValue(s.data[active] as number)}`
                  : formatValue(s.data[active] as number),
            }))}
            footnote={stacked && stackMode === 'percent'
              ? `${formatValue(bucketTotals[active])} in this bucket`
              : undefined}
          />
        </div>
      )}
    </div>
  );
}

export type { TimeSeriesChartProps, TimeSeriesSeries, StatusTone };
