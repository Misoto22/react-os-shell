/**
 * ChartTooltip — what appears under the pointer, as one component every chart
 * shares.
 *
 * It is a component rather than a snippet because a tooltip is where charts
 * quietly diverge: one rounds its values, the next does not; one lists series
 * in stack order, the next in declaration order; one drops the swatch and the
 * reader loses the only link back to the mark. Sharing it settles all of that
 * once.
 *
 * The layout is a card with a heading and one row per series — swatch, name,
 * then the value hard right in tabular figures so the column of numbers lines
 * up. Three details are decisions:
 *
 *   - **Rows read in STACK order, bottom segment first.** A stacked column is
 *     read from the baseline up, and a tooltip that lists it the other way
 *     round makes the reader map between two orders.
 *   - **The value is `tabular-nums`; nothing else is.** Digits align down the
 *     column here, which is exactly the case tabular figures are for — and the
 *     opposite of a hero figure, where equal-width digits read as loose.
 *   - **A missing value is an em dash, never a zero.** "No data for this
 *     bucket" and "zero requests in this bucket" are different facts, and a
 *     tooltip that prints 0 for both is lying about one of them.
 *
 * `emphasis` dims every row but one, so a chart that highlights a single series
 * on hover can say the same thing in the tooltip.
 */
import { CHART_INK } from './palette';
import { glassStyle } from '../utils/glass';
import type { ChartTooltipProps } from './types';

export default function ChartTooltip({
  variant = 'solid',
  title,
  rows,
  footnote,
  emphasisKey,
  className,
}: ChartTooltipProps) {
  // `glassStyle()` is the package's own frosted surface, and reusing it is the
  // point rather than a convenience: it already degrades to an opaque card
  // under the reduce-transparency preference. Hand-rolling
  // `bg-white/70 backdrop-blur` would look identical until someone turned that
  // setting on, at which point the blur is stripped globally and the card is
  // left translucent with the chart legible straight through the numbers.
  const glass = variant === 'glass';
  return (
    <div
      role="status"
      className={`pointer-events-none min-w-44 rounded-xl p-3 text-xs ${glass ? '' : 'bg-white shadow-xl ring-1 ring-black/5'} ${className ?? ''}`}
      style={glass ? glassStyle() : undefined}
    >
      {title && <p className="mb-2 text-sm font-medium text-gray-800">{title}</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rows.map(row => (
          <li
            key={row.key}
            className="flex items-center gap-2.5"
            style={emphasisKey && row.key !== emphasisKey ? { opacity: 0.45 } : undefined}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: row.color ?? CHART_INK.muted }}
            />
            <span className="flex-1 whitespace-nowrap text-gray-600">{row.label}</span>
            <span className="pl-4 font-semibold tabular-nums text-gray-900">
              {row.value ?? '—'}
            </span>
          </li>
        ))}
      </ul>
      {footnote && <p className="mt-2 text-[11px] text-gray-500">{footnote}</p>}
    </div>
  );
}
