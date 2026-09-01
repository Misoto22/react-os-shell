/**
 * CartesianPlot — the axes, grid and hover layer every rectangular chart needs,
 * factored out before the tenth one repeated them.
 *
 * Column, scatter, bubble, range, waterfall, histogram, box plot, candlestick
 * and heatmap differ only in what they draw INSIDE the plot area. Sharing the
 * frame is what stops the family drifting: one place decides that gridlines are
 * solid hairlines rather than dashes, that the y-axis prints its ticks outside
 * the plot, and that the hit target for a hover is the whole band rather than
 * the mark. A chart that wanted its own answer to any of those would be a bug.
 *
 * Children receive the resolved geometry, so a chart type is the marks and
 * nothing else — the same division visx draws between `@visx/axis` and whatever
 * you put in the group above it.
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { CHART_INK } from './palette';
import { bandScale, linearScale, niceMax, type BandScale, type LinearScale } from './scale';
import { usePlotWidth } from './usePlotWidth';

export interface PlotGeometry {
  x: BandScale;
  y: LinearScale;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  clipId: string;
  /** The band under the pointer, or null. */
  active: number | null;
}

export interface CartesianPlotProps {
  /** X tick labels, one per band. */
  labels: string[];
  /** Every value that must fit on the y-axis. */
  values: number[];
  height?: number;
  width?: number;
  /** Fraction of a band left as gap. 0 makes adjacent marks touch. */
  bandPadding?: number;
  min?: number;
  max?: number;
  yTickCount?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  /** Rendered inside the clipped plot area. */
  children: (geometry: PlotGeometry) => ReactNode;
  /** Rendered above the plot when a band is hovered or focused. */
  tooltip?: (index: number) => ReactNode;
  ariaLabel: string;
  className?: string;
  emptyLabel?: string;
}

export default function CartesianPlot({
  labels,
  values,
  height = 220,
  width: widthProp,
  bandPadding = 0.24,
  min,
  max,
  yTickCount = 4,
  formatValue = v => String(v),
  yAxisLabel,
  children,
  tooltip,
  ariaLabel,
  className,
  emptyLabel = 'No data in this window.',
}: CartesianPlotProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const [active, setActive] = useState<number | null>(null);
  const clipId = useId();

  if (labels.length === 0) {
    return (
      <div className={className} ref={host}>
        <p className="flex items-center justify-center text-sm text-gray-500" style={{ height }}>{emptyLabel}</p>
      </div>
    );
  }

  const margin = { top: 12, right: 16, bottom: 26, left: yAxisLabel ? 58 : 48 };
  const left = margin.left;
  const right = Math.max(left + 1, width - margin.right);
  const top = margin.top;
  const bottom = height - margin.bottom;

  const finite = values.filter(Number.isFinite);
  const lo = min ?? Math.min(0, ...finite);
  const hi = max ?? niceMax(Math.max(...finite, 0));
  const y = linearScale([lo, hi], { from: bottom, to: top });
  const x = bandScale(labels.length, { from: left, to: right }, bandPadding);
  const ticks = y.ticks(yTickCount + 1);

  const labelStep = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(width / 84))));

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Escape') return;
    event.preventDefault();
    if (event.key === 'Escape') { setActive(null); return; }
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setActive(prev => Math.min(labels.length - 1, Math.max(0, (prev ?? 0) + delta)));
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg
        width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
        role="img" aria-label={ariaLabel} tabIndex={0}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)} onKeyDown={onKey}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
        </defs>

        {ticks.map(tick => (
          <line key={`g${tick}`} x1={left} y1={y(tick)} x2={right} y2={y(tick)} stroke={CHART_INK.grid} strokeWidth={1} shapeRendering="crispEdges" />
        ))}
        <line x1={left} y1={y(Math.max(lo, 0))} x2={right} y2={y(Math.max(lo, 0))} stroke={CHART_INK.axis} strokeWidth={1} shapeRendering="crispEdges" />

        {ticks.map(tick => (
          <text key={`t${tick}`} x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill={CHART_INK.label} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatValue(tick)}
          </text>
        ))}
        {yAxisLabel && (
          <text x={14} y={(top + bottom) / 2} transform={`rotate(-90 14 ${(top + bottom) / 2})`} textAnchor="middle" fontSize={11} fill={CHART_INK.label}>
            {yAxisLabel}
          </text>
        )}

        <g clipPath={`url(#${clipId})`}>
          {children({ x, y, left, right, top, bottom, width, height, clipId, active })}
        </g>

        {labels.map((label, i) => (i % labelStep === 0 ? (
          <text key={`x${i}`} x={x.center(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={CHART_INK.label} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {label}
          </text>
        ) : null))}

        {labels.map((_, i) => (
          <rect
            key={`h${i}`} x={x.center(i) - (right - left) / labels.length / 2} y={top}
            width={(right - left) / labels.length} height={bottom - top}
            fill="transparent" onMouseEnter={() => setActive(i)}
          />
        ))}
      </svg>

      {tooltip && active !== null && (
        // Positioning only: the card itself is `ChartTooltip`, so every chart
        // in the family renders the same surface.
        <div
          className="absolute top-2 z-10"
          style={{ left: `${Math.min(Math.max(0, (x.center(active) / width) * 100 - 8), 70)}%` }}
        >
          {tooltip(active)}
        </div>
      )}
    </div>
  );
}
