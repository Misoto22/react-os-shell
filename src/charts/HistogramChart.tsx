/**
 * HistogramChart — the distribution of ONE measure.
 *
 * Not a bar chart, though it looks like one. A bar chart compares named
 * categories and its bars may be reordered freely; a histogram's x-axis is
 * continuous and its bars are adjacent because the bins are, so reordering them
 * destroys the meaning. That is why the bars touch — `bandPadding` is zero, and
 * a caller cannot pad them apart.
 *
 * Bin count is a real analytical choice, not a default to hide. Too few bins
 * hide a bimodal distribution; too many turn it into noise. `bins` accepts
 * either a count to compute or the boundaries themselves, for the case where
 * the domain already has meaningful edges — a latency histogram whose bucket
 * bounds the backend chose is exactly that case.
 */
import { resolveSeriesColor } from './palette';
import { binValues } from './scale';
import CartesianPlot from './CartesianPlot';
import ChartTooltip from './ChartTooltip';
import type { HistogramChartProps } from './types';

export default function HistogramChart({
  values, bins = 10, precomputed, height = 220, width, color, tone,
  formatBound = v => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
  formatCount = v => String(v), yAxisLabel = 'count', label = 'Distribution',
  className, emptyLabel,
}: HistogramChartProps) {
  const computed = precomputed ?? binValues(values ?? [], typeof bins === 'number' ? bins : bins.length - 1);
  const colour = resolveSeriesColor(0, color, tone);
  const labels = computed.map(b => formatBound(b.from));
  const counts = computed.map(b => b.count);

  return (
    <CartesianPlot
      labels={labels} values={counts} height={height} width={width} bandPadding={0}
      formatValue={formatCount} yAxisLabel={yAxisLabel} className={className} emptyLabel={emptyLabel}
      ariaLabel={`${label}: ${computed.length} bins over ${(values ?? []).length} observations`}
      tooltip={index => (
        <ChartTooltip
          title={`${formatBound(computed[index].from)} – ${formatBound(computed[index].to)}`}
          rows={[{ key: 'count', label: 'Observations', color: colour, value: formatCount(computed[index].count) }]}
        />
      )}
    >
      {({ x, y, bottom, active }) => (
        <g>
          {computed.map((bin, i) => (
            <rect
              key={i}
              // A 1px inset, not a gap: the bins ARE adjacent, and the hairline
              // only stops two equal bars reading as one wide one.
              x={x(i) + 0.5} y={y(bin.count)}
              width={Math.max(1, x.bandwidth - 1)} height={Math.max(0, bottom - y(bin.count))}
              fill={colour} fillOpacity={active === null || active === i ? 0.85 : 0.42}
            />
          ))}
        </g>
      )}
    </CartesianPlot>
  );
}
