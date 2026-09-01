/**
 * HeatmapChart — magnitude across two dimensions, usually one of them time.
 *
 * The chart an operator wants for "which hour, which tenant" — a question a
 * line chart answers badly because it needs one line per tenant and then the
 * lines cross.
 *
 * The colour rule is the whole design. Magnitude is SEQUENTIAL, so it is one
 * hue running light to dark, mixed against the card surface so the lightest
 * cell recedes into it and "near zero" reads as absent rather than as a value.
 * A rainbow here would be the classic failure: the reader has to consult the
 * legend for every cell because the hue order carries no inherent magnitude.
 *
 * Because colour is the only channel, the legend is a continuous scale rather
 * than swatches, and the value is always in the cell's title as well — a
 * colour-only continuous encoding is not readable to everyone and the chart
 * should not depend on it.
 */
import { useId, useRef, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { usePlotWidth } from './usePlotWidth';
import ChartTooltip from './ChartTooltip';
import type { HeatmapChartProps } from './types';

export default function HeatmapChart({
  rows, columns, cells, height, width: widthProp, color, max,
  formatValue = v => String(v), label = 'Intensity', className,
  emptyLabel = 'No activity in this window.', cellGap = 2, cellRadius = 2,
}: HeatmapChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const gradientId = useId();
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  if (rows.length === 0 || columns.length === 0) {
    return <div className={className} ref={host}><p className="py-8 text-center text-sm text-gray-500">{emptyLabel}</p></div>;
  }

  const hue = color ?? resolveSeriesColor(0);
  const top = max ?? Math.max(1, ...cells.flat().filter(Number.isFinite));
  const left = 96;
  const legendBand = 26;
  const rowHeight = 26;
  const plotHeight = rows.length * rowHeight;
  const totalHeight = height ?? plotHeight + legendBand + 26;
  const cellWidth = Math.max(2, (Math.max(left + 1, width) - left) / columns.length);

  // Light → dark in ONE hue, mixed against the surface so the low end recedes.
  const shade = (value: number) => {
    const t = top > 0 ? Math.max(0, Math.min(1, value / top)) : 0;
    return `color-mix(in oklab, ${hue} ${(8 + t * 92).toFixed(1)}%, ${CHART_INK.surface})`;
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg width="100%" height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`} role="img"
        aria-label={`${label} across ${rows.length} rows and ${columns.length} columns`}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0" stopColor={shade(0)} />
            <stop offset="1" stopColor={shade(top)} />
          </linearGradient>
        </defs>

        {rows.map((row, r) => (
          <text key={`r${r}`} x={left - 10} y={r * rowHeight + rowHeight / 2 + 4} textAnchor="end" fontSize={11} fill={CHART_INK.label}>
            {row}
          </text>
        ))}

        {rows.map((row, r) => columns.map((column, c) => {
          const value = cells[r]?.[c] ?? 0;
          const faded = hover && (hover.r !== r || hover.c !== c);
          return (
            <rect
              key={`${r}-${c}`}
              x={left + c * cellWidth + cellGap / 2} y={r * rowHeight + cellGap / 2}
              width={Math.max(1, cellWidth - cellGap)} height={rowHeight - cellGap}
              rx={cellRadius} fill={shade(value)} opacity={faded ? 0.55 : 1}
              onMouseEnter={() => setHover({ r, c })}
            >
              <title>{`${row} · ${column}: ${formatValue(value)}`}</title>
            </rect>
          );
        }))}

        {columns.map((column, c) => (
          c % Math.max(1, Math.ceil(columns.length / Math.max(1, Math.floor((width - left) / 56)))) === 0 ? (
            <text key={`c${c}`} x={left + c * cellWidth + cellWidth / 2} y={plotHeight + 15} textAnchor="middle" fontSize={11} fill={CHART_INK.label}>
              {column}
            </text>
          ) : null
        ))}

        {/* A continuous legend, because the encoding is continuous. */}
        <rect x={left} y={plotHeight + 26} width={Math.min(180, Math.max(40, width - left))} height={8} rx={4} fill={`url(#${gradientId})`} />
        <text x={left} y={plotHeight + 48} fontSize={10.5} fill={CHART_INK.label}>0</text>
        <text x={left + Math.min(180, Math.max(40, width - left))} y={plotHeight + 48} textAnchor="end" fontSize={10.5} fill={CHART_INK.label} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatValue(top)}
        </text>
      </svg>

      {hover && (
        <div className="absolute top-1 right-1 z-10">
          <ChartTooltip
            title={`${rows[hover.r]} · ${columns[hover.c]}`}
            rows={[{ key: 'v', label, color: hue, value: formatValue(cells[hover.r]?.[hover.c] ?? 0) }]}
          />
        </div>
      )}
    </div>
  );
}
