/**
 * WaterfallChart — how a starting figure became an ending one.
 *
 * The form exists because a bar chart of {opening, +sales, −refunds, −tax,
 * closing} is unreadable: the increments share an axis with the totals they add
 * up to, so the small ones vanish. A waterfall floats each step at the running
 * balance, which makes the contribution the length of the bar and the sequence
 * the story.
 *
 * Colour here is polarity, not identity, so it comes from the diverging pair
 * rather than the categorical slots — increase, decrease, and a neutral for the
 * total bars that are anchored to the axis. Sign is also carried by the value's
 * own sign in the label, because colour alone does not survive greyscale.
 */
import { CHART_INK, STATUS_VARS } from './palette';
import CartesianPlot from './CartesianPlot';
import ChartTooltip from './ChartTooltip';
import type { WaterfallChartProps } from './types';

export default function WaterfallChart({
  steps, height = 240, width, formatValue = v => String(v), yAxisLabel,
  className, emptyLabel, radius = 3, connectors = true,
}: WaterfallChartProps) {
  // Resolve each step to the span it occupies, carrying the running balance.
  let running = 0;
  const bars = steps.map(step => {
    if (step.total) {
      const span = { from: 0, to: running, value: running, total: true };
      return { ...step, ...span };
    }
    const from = running;
    running += step.value;
    return { ...step, from, to: running, value: step.value, total: false };
  });

  const values = bars.flatMap(b => [b.from, b.to]);

  return (
    <CartesianPlot
      labels={steps.map(s => s.label)} values={values} height={height} width={width}
      formatValue={formatValue} yAxisLabel={yAxisLabel} className={className} emptyLabel={emptyLabel}
      bandPadding={0.36}
      ariaLabel={`Waterfall of ${steps.length} steps from ${formatValue(bars[0]?.from ?? 0)} to ${formatValue(running)}`}
      tooltip={index => {
        const bar = bars[index];
        const tone = bar?.total ? STATUS_VARS.neutral : bar.value >= 0 ? STATUS_VARS.good : STATUS_VARS.critical;
        return (
          <ChartTooltip
            title={bar?.label}
            rows={[
              {
                key: 'step', color: tone,
                label: bar?.total ? 'Balance' : bar.value >= 0 ? 'Increase' : 'Decrease',
                // The sign is written out: colour alone does not survive
                // greyscale, and polarity is the whole point of this chart.
                value: bar?.total
                  ? formatValue(bar.to)
                  : `${bar.value >= 0 ? '+' : '−'}${formatValue(Math.abs(bar.value))}`,
              },
              ...(bar?.total ? [] : [{ key: 'running', label: 'Running total', color: STATUS_VARS.neutral, value: formatValue(bar.to) }]),
            ]}
          />
        );
      }}
    >
      {({ x, y, active }) => (
        <g>
          {connectors && bars.slice(0, -1).map((bar, i) => (
            <line
              key={`c${i}`} x1={x(i)} y1={y(bar.to)} x2={x(i + 1) + x.bandwidth} y2={y(bar.to)}
              stroke={CHART_INK.grid} strokeWidth={1} shapeRendering="crispEdges"
            />
          ))}
          {bars.map((bar, i) => {
            const colour = bar.total
              ? STATUS_VARS.neutral
              : bar.value >= 0 ? STATUS_VARS.good : STATUS_VARS.critical;
            const top = Math.min(y(bar.from), y(bar.to));
            const h = Math.max(1, Math.abs(y(bar.to) - y(bar.from)));
            return (
              <rect
                key={i} x={x(i)} y={top} width={Math.max(1, x.bandwidth)} height={h} rx={radius}
                fill={colour} fillOpacity={active === null || active === i ? 1 : 0.45}
              />
            );
          })}
        </g>
      )}
    </CartesianPlot>
  );
}
