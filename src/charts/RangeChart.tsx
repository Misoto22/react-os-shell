/**
 * RangeChart — a low/high pair per category, as a band or as floating bars.
 *
 * Both variants answer "what was the spread", and the pair is one chart with a
 * `variant` rather than two because the data shape is identical. `area` is for
 * a continuous span — a confidence interval, min/max envelope, forecast cone.
 * `bar` is for discrete spans that should not be read as flowing into each
 * other, which is also what makes it the right shape for a schedule or a
 * duration.
 *
 * The band is drawn as a single filled path rather than two lines with a fill
 * between them, so a gap in the data leaves a gap in the band instead of a
 * wedge closing across it.
 */
import { CHART_INK, resolveSeriesColor } from './palette';
import { areaBetween, curvePath, type Point } from './curve';
import CartesianPlot from './CartesianPlot';
import ChartTooltip from './ChartTooltip';
import type { RangeChartProps } from './types';

export default function RangeChart({
  rows, labels, variant = 'area', curve = 'linear', height = 220, width, max, min,
  formatValue = v => String(v), yAxisLabel, color, tone, label = 'Range',
  className, emptyLabel, radius = 3,
}: RangeChartProps) {
  const values = rows.flatMap(r => [r.low, r.high]).filter(Number.isFinite);
  const colour = resolveSeriesColor(0, color, tone);

  return (
    <CartesianPlot
      labels={labels} values={values} height={height} width={width} max={max} min={min}
      formatValue={formatValue} yAxisLabel={yAxisLabel} className={className} emptyLabel={emptyLabel}
      bandPadding={variant === 'bar' ? 0.34 : 0}
      ariaLabel={`${label}: low and high across ${labels.length} categories`}
      tooltip={index => (
        <ChartTooltip
          title={labels[index]}
          rows={[
            // undefined renders the em dash: "no row here" is not "zero".
            { key: 'high', label: 'High', color: colour, value: rows[index] == null ? undefined : formatValue(rows[index].high) },
            { key: 'low', label: 'Low', color: colour, value: rows[index] == null ? undefined : formatValue(rows[index].low) },
          ]}
        />
      )}
    >
      {({ x, y, active }) => (variant === 'bar' ? (
        <g>
          {rows.map((row, i) => (
            <rect
              key={i} x={x(i)} y={y(row.high)} width={Math.max(1, x.bandwidth)}
              height={Math.max(1, y(row.low) - y(row.high))} rx={radius}
              fill={colour} fillOpacity={active === null || active === i ? 0.85 : 0.4}
            />
          ))}
        </g>
      ) : (
        <g>
          {(() => {
            const highs: Point[] = rows.map((r, i) => [x.center(i), y(r.high)]);
            const lows: Point[] = rows.map((r, i) => [x.center(i), y(r.low)]);
            return (
              <>
                <path d={areaBetween(curvePath(highs, curve), lows)} fill={colour} fillOpacity={0.2} stroke="none" />
                <path d={curvePath(highs, curve)} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
                <path d={curvePath(lows, curve)} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" strokeOpacity={0.7} />
              </>
            );
          })()}
          {active !== null && (
            <line x1={x.center(active)} y1={y(rows[active].high)} x2={x.center(active)} y2={y(rows[active].low)} stroke={CHART_INK.axis} strokeWidth={1} />
          )}
        </g>
      ))}
    </CartesianPlot>
  );
}
