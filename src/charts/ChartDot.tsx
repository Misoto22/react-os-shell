/**
 * ChartDot — the marker on a line, in the three weights a busy plot needs.
 *
 * Borrowed from EvilCharts, which ships `default` / `border` / `colored-border`
 * for a reason worth restating: a dot's job changes with what is behind it. On
 * an empty plot a filled 3px circle is plenty; laid over an area fill or a
 * neighbouring line it disappears, and the ring is what separates it from the
 * ground without darkening it. Their implementation clips a full-width gradient
 * rect to the dot shape so the marker inherits a horizontal colour run; this
 * family's series are one colour each, so a plain fill reaches the same place
 * with a tenth of the markup.
 *
 *   default         a filled dot. The plot is quiet; nothing needs separating.
 *   border          a small core inside a thick SURFACE ring. The heaviest
 *                   option, for a marker that has to survive an area fill.
 *   colored-border  a hollow dot ringed in the series colour. Reads as a
 *                   sample rather than a value, which suits a dense line.
 *
 * `pulse` is EvilCharts' `dot-ping`, and it carries a claim: a pulsing marker
 * says "this reading is live". On a feed that has stalled it is a lie the
 * reader has no way to check, so it is opt-in per chart and never derived —
 * the caller asserts liveness because only the caller knows.
 */
import { CHART_INK } from './palette';
import type { ChartDotProps } from './types';

export default function ChartDot({
  cx,
  cy,
  colour,
  variant = 'default',
  pulse = false,
  title,
}: ChartDotProps) {
  const ring = variant === 'border' ? 3 : variant === 'colored-border' ? 1.5 : 0;
  const core = variant === 'border' ? 3 : 3.5;

  return (
    <g>
      {/* The pulse sits UNDER the marker, so a growing halo never covers the
          value it is drawing attention to. */}
      {pulse && (
        <circle
          className="rosh-viz-ping"
          cx={cx} cy={cy} r={core}
          fill={colour} fillOpacity={0.45}
        />
      )}
      {variant === 'border' && (
        <circle cx={cx} cy={cy} r={core + ring} fill={CHART_INK.surface} />
      )}
      <circle
        cx={cx} cy={cy} r={core}
        fill={variant === 'colored-border' ? CHART_INK.surface : colour}
        stroke={variant === 'colored-border' ? colour : undefined}
        strokeWidth={variant === 'colored-border' ? ring : undefined}
      >
        {title && <title>{title}</title>}
      </circle>
    </g>
  );
}
