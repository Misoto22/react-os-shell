/**
 * CandlestickChart — open, high, low and close per period, as candles or bars.
 *
 * Candlestick and OHLC carry identical data and answer the identical question;
 * they differ only in whether the open-to-close span is a filled body or a pair
 * of ticks. One component with a `variant`, because shipping them as two would
 * duplicate the scale, the axis, the hover and the colour rule, and then let
 * the two drift.
 *
 * Colour is polarity — closed above its open, or below — so it comes from the
 * status set rather than the categorical slots, and it is never the only signal:
 * the tooltip states both numbers, and the body's direction is legible without
 * colour at all.
 */
import { STATUS_VARS } from './palette';
import CartesianPlot from './CartesianPlot';
import ChartTooltip from './ChartTooltip';
import type { CandlestickChartProps } from './types';

export default function CandlestickChart({
  candles, variant = 'candle', height = 260, width, formatValue = v => String(v),
  yAxisLabel, label = 'Price', className, emptyLabel,
}: CandlestickChartProps) {
  const values = candles.flatMap(c => [c.low, c.high]).filter(Number.isFinite);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A price axis anchored at zero wastes the plot: the interesting range is the
  // one the series occupies, so pad it rather than starting from the origin.
  const pad = (hi - lo) * 0.08 || 1;

  return (
    <CartesianPlot
      labels={candles.map(c => c.label)} values={values} height={height} width={width}
      min={lo - pad} max={hi + pad} bandPadding={0.42}
      formatValue={formatValue} yAxisLabel={yAxisLabel} className={className} emptyLabel={emptyLabel}
      ariaLabel={`${label}: open, high, low and close across ${candles.length} periods`}
      tooltip={index => {
        const c = candles[index];
        const rose = c.close >= c.open;
        const tone = rose ? STATUS_VARS.good : STATUS_VARS.critical;
        return (
          <ChartTooltip
            title={c.label}
            rows={[
              { key: 'open', label: 'Open', color: tone, value: formatValue(c.open) },
              { key: 'high', label: 'High', color: tone, value: formatValue(c.high) },
              { key: 'low', label: 'Low', color: tone, value: formatValue(c.low) },
              { key: 'close', label: 'Close', color: tone, value: formatValue(c.close) },
            ]}
            emphasisKey="close"
            footnote={rose ? 'Closed above its open' : 'Closed below its open'}
          />
        );
      }}
    >
      {({ x, y, active }) => (
        <g>
          {candles.map((c, i) => {
            const rose = c.close >= c.open;
            const colour = rose ? STATUS_VARS.good : STATUS_VARS.critical;
            const cx = x.center(i);
            const w = Math.max(3, x.bandwidth);
            const dim = active !== null && active !== i;
            const bodyTop = y(Math.max(c.open, c.close));
            const bodyHeight = Math.max(1, Math.abs(y(c.close) - y(c.open)));
            return (
              <g key={i} opacity={dim ? 0.45 : 1}>
                <line x1={cx} y1={y(c.high)} x2={cx} y2={y(c.low)} stroke={colour} strokeWidth={1.5} />
                {variant === 'candle' ? (
                  <rect
                    x={cx - w / 2} y={bodyTop} width={w} height={bodyHeight} rx={1}
                    fill={rose ? colour : 'transparent'} fillOpacity={rose ? 0.85 : 1}
                    stroke={colour} strokeWidth={1.5}
                  />
                ) : (
                  <>
                    <line x1={cx - w / 2} y1={y(c.open)} x2={cx} y2={y(c.open)} stroke={colour} strokeWidth={2} />
                    <line x1={cx} y1={y(c.close)} x2={cx + w / 2} y2={y(c.close)} stroke={colour} strokeWidth={2} />
                  </>
                )}
              </g>
            );
          })}
        </g>
      )}
    </CartesianPlot>
  );
}
