/**
 * BoxPlotChart — five numbers per category, so distributions can be compared.
 *
 * Where a histogram shows one distribution in detail, a box plot shows many
 * side by side at a glance: median, the middle half, the whiskers, and the
 * points outside them. For an operator that is the difference between "P95 went
 * up" and "P95 went up because one tenant's tail moved".
 *
 * The median is drawn thicker than the box edges on purpose — it is the summary
 * statistic the eye should land on first, and giving every line the same weight
 * is how a box plot turns into a grey ladder. Outliers keep a surface ring so
 * two coincident ones are still countable.
 */
import { CHART_INK, resolveSeriesColor } from './palette';
import CartesianPlot from './CartesianPlot';
import ChartTooltip from './ChartTooltip';
import type { BoxPlotChartProps } from './types';

export default function BoxPlotChart({
  boxes, height = 240, width, color, tone, formatValue = v => String(v),
  yAxisLabel, label = 'Distribution', className, emptyLabel,
}: BoxPlotChartProps) {
  const colour = resolveSeriesColor(0, color, tone);
  const values = boxes.flatMap(b => [b.min, b.max, ...(b.outliers ?? [])]).filter(Number.isFinite);

  return (
    <CartesianPlot
      labels={boxes.map(b => b.label)} values={values} height={height} width={width}
      bandPadding={0.5} formatValue={formatValue} yAxisLabel={yAxisLabel}
      className={className} emptyLabel={emptyLabel}
      ariaLabel={`${label}: five-number summary for ${boxes.length} categories`}
      tooltip={index => {
        const b = boxes[index];
        return (
          <ChartTooltip
            title={b.label}
            rows={[
              { key: 'max', label: 'Maximum', color: colour, value: formatValue(b.max) },
              { key: 'q3', label: 'Q3', color: colour, value: formatValue(b.q3) },
              { key: 'median', label: 'Median', color: colour, value: formatValue(b.median) },
              { key: 'q1', label: 'Q1', color: colour, value: formatValue(b.q1) },
              { key: 'min', label: 'Minimum', color: colour, value: formatValue(b.min) },
            ]}
            emphasisKey="median"
            footnote={b.outliers?.length ? `${b.outliers.length} outlier${b.outliers.length > 1 ? 's' : ''} beyond the whiskers` : undefined}
          />
        );
      }}
    >
      {({ x, y, active }) => (
        <g>
          {boxes.map((b, i) => {
            const cx = x.center(i);
            const w = Math.max(6, x.bandwidth);
            const dim = active !== null && active !== i;
            return (
              <g key={i} opacity={dim ? 0.45 : 1}>
                {/* whiskers */}
                <line x1={cx} y1={y(b.max)} x2={cx} y2={y(b.q3)} stroke={colour} strokeWidth={1.5} />
                <line x1={cx} y1={y(b.q1)} x2={cx} y2={y(b.min)} stroke={colour} strokeWidth={1.5} />
                <line x1={cx - w / 4} y1={y(b.max)} x2={cx + w / 4} y2={y(b.max)} stroke={colour} strokeWidth={1.5} />
                <line x1={cx - w / 4} y1={y(b.min)} x2={cx + w / 4} y2={y(b.min)} stroke={colour} strokeWidth={1.5} />
                {/* interquartile box */}
                <rect
                  x={cx - w / 2} y={y(b.q3)} width={w} height={Math.max(1, y(b.q1) - y(b.q3))}
                  rx={2} fill={colour} fillOpacity={0.22} stroke={colour} strokeWidth={1.5}
                />
                {/* median — deliberately the heaviest mark in the group */}
                <line x1={cx - w / 2} y1={y(b.median)} x2={cx + w / 2} y2={y(b.median)} stroke={colour} strokeWidth={3} />
                {(b.outliers ?? []).map((o, oi) => (
                  <circle key={oi} cx={cx} cy={y(o)} r={3} fill={colour} stroke={CHART_INK.surface} strokeWidth={1.5} />
                ))}
              </g>
            );
          })}
        </g>
      )}
    </CartesianPlot>
  );
}
