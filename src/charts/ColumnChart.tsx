/**
 * ColumnChart — vertical bars, grouped or stacked.
 *
 * `RankedBars` already covers the horizontal case, and the split is not
 * cosmetic: horizontal is for long category names, vertical is for a category
 * axis that is ordered — months, buckets, stages. Choosing vertical for
 * "api/platform/observability/overview/" is how a chart ends up with truncated
 * labels or a 45° tilt nobody can read.
 *
 * Stacked segments are separated by a 2px surface gap rather than a stroke. A
 * border around each segment reads as noise and thickens every mark; the gap
 * does the same job by letting the card show through.
 */
import { useId } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { ChartDefs, MOTION, glowId, stagger } from './effects';
import CartesianPlot from './CartesianPlot';
import ChartSkeleton from './ChartSkeleton';
import { autoHighlightIndex, highlightOpacity, useHighlight } from './highlight';
import ChartTooltip from './ChartTooltip';
import type { ColumnChartProps } from './types';

const STACK_GAP = 2;

export default function ColumnChart({
  series, labels, stacked = false, stackMode = 'value', height = 220, width, max,
  formatValue = v => String(v), yAxisLabel, className, emptyLabel, radius = 3,
  loading = false, animate = true, glow = false, emphasise = false, activeKey,
  highlight = 'none',
}: ColumnChartProps) {
  const defsId = useId();
  const { highlighted } = useHighlight();
  if (loading) return <ChartSkeleton height={height} width={width} variant="bars" className={className} />;

  const drawn = series.filter(s => s.data.some(v => Number.isFinite(v)));
  const totals = labels.map((_, i) => drawn.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
  const percent = stacked && stackMode === 'percent';
  // A bucket with no traffic has no composition: 0/0 is a gap, not an empty
  // stack and not a full one.
  const share = (value: number, i: number) => (totals[i] > 0 ? value / totals[i] : null);
  const values = percent
    ? [1]
    : stacked ? totals : drawn.flatMap(s => s.data.filter(Number.isFinite) as number[]);

  return (
    <CartesianPlot
      labels={labels} values={values} height={height} width={width}
      max={percent ? 1 : max}
      formatValue={percent ? v => `${Math.round(v * 100)}%` : formatValue} yAxisLabel={yAxisLabel} className={className}
      emptyLabel={emptyLabel}
      ariaLabel={`${drawn.map(s => s.label).join(', ')} across ${labels.length} categories`}
      tooltip={index => (
        <ChartTooltip
          title={labels[index]}
          // Stack order: the bottom segment is the first row, because that is
          // the order the column itself is read in.
          rows={drawn.map((s, si) => ({
            key: s.key,
            label: s.label,
            color: resolveSeriesColor(si, s.color, s.tone),
            // Percent mode drops volume from the plot, so the tooltip carries
            // it back — the share AND the count it was taken over.
            value: !Number.isFinite(s.data[index])
              ? undefined
              : percent
                ? `${((share(s.data[index] as number, index) ?? 0) * 100).toFixed(1)}% · ${formatValue(s.data[index] as number)}`
                : formatValue(s.data[index] as number),
          }))}
          footnote={percent ? `${formatValue(totals[index])} in this category` : undefined}
        />
      )}
    >
      {({ x, y, bottom, active }) => {
        // Pointer > explicit key > derived. The pointer always wins, because a
        // highlight that ignores where the reader is looking is worse than
        // none; and a named category beats a derived one, because a caller
        // naming it has a reason the data cannot know.
        const named = activeKey ? labels.indexOf(activeKey) : -1;
        const derived = autoHighlightIndex(
          // What the reader compares: a stack's total, not one of its bands.
          stacked ? totals : (drawn[0]?.data ?? []),
          highlight,
        );
        const lit = active ?? (named >= 0 ? named : derived);
        return (
        <g>
          <ChartDefs id={defsId} glow={glow} />
          {labels.map((_, i) => {
            const slot = x.bandwidth / (stacked ? 1 : Math.max(1, drawn.length));
            let base = 0;
            return drawn.map((s, si) => {
              const raw = s.data[i];
              if (!Number.isFinite(raw)) return null;
              // In percent mode a zero-total bucket has nothing to draw at all.
              const value = percent ? share(raw as number, i) : raw;
              if (value === null) return null;
              const colour = resolveSeriesColor(si, s.color, s.tone);
              const bx = stacked ? x(i) : x(i) + si * slot;
              const top = stacked ? y(base + (value as number)) : y(value as number);
              const foot = stacked ? y(base) : bottom;
              base += stacked ? (value as number) : 0;
              const h = Math.max(0, foot - top - (stacked && si > 0 ? STACK_GAP : 0));
              // Emphasis: everything that is not the point recedes to the
              // de-emphasis ink, rather than staying coloured at low contrast.
              const isLit = lit === null || lit === i;
              const paint = isLit ? colour : emphasise ? CHART_INK.muted : colour;
              // Legend highlight is a SECOND axis of emphasis: the pointer
              // picks a category, the legend picks a series. They compose.
              const seriesLit = highlightOpacity(s.key, highlighted);
              return (
                <rect
                  key={`${s.key}-${i}`} x={bx} y={top} width={Math.max(1, slot)} height={h}
                  rx={radius} fill={paint}
                  fillOpacity={seriesLit ?? (isLit ? 1 : emphasise ? 0.32 : 0.45)}
                  filter={glow && lit === i ? `url(#${glowId(defsId)})` : undefined}
                  className={`rosh-viz-mark${animate ? ` ${MOTION.rise}` : ''}`}
                  style={animate ? stagger(i * (stacked ? 1 : drawn.length) + si, 26) : undefined}
                />
              );
            });
          })}
          {active !== null && !emphasise && (
            <line x1={x.center(active)} y1={y(y.domain[1])} x2={x.center(active)} y2={bottom} stroke={CHART_INK.axis} strokeWidth={1} />
          )}
        </g>
        );
      }}
    </CartesianPlot>
  );
}
