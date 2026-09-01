/**
 * StatTile — the form a dashboard should reach for before it reaches for a
 * chart at all.
 *
 * Grafana calls it Stat, Tremor pairs a value with a SparkChart; both exist
 * because the most common charting mistake is drawing eight hues when the story
 * is one number. A single current value with an optional trend is a tile, not a
 * one-bar bar chart.
 *
 * Two typographic details that are decisions rather than defaults:
 *
 *   - The value uses PROPORTIONAL figures. `tabular-nums` is right where digits
 *     line up in columns and wrong at display size, where equal-width digits
 *     make a number like 121 read as loose.
 *   - The delta carries an arrow and a word, never colour alone. Green-up /
 *     red-down is invisible to a red-green reader and meaningless in print.
 *
 * The sparkline is `aria-hidden` and always optional: the number beside it is
 * the accessible content, and a tile whose trend is the only way to read the
 * data would be a chart wearing a tile's clothes.
 */
import Sparkline from './Sparkline';
import { resolveSeriesColor, STATUS_VARS } from './palette';
import type { StatTileProps } from './types';

const DIRECTION = {
  up: { glyph: '▲', word: 'up' },
  down: { glyph: '▼', word: 'down' },
  flat: { glyph: '■', word: 'flat' },
} as const;

export default function StatTile({
  label,
  value,
  unit,
  delta,
  deltaTone,
  trend,
  trendTone,
  footnote,
  className,
}: StatTileProps) {
  const direction = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const deltaColour = deltaTone ? STATUS_VARS[deltaTone] : undefined;
  const trendColour = trendTone ? STATUS_VARS[trendTone] : resolveSeriesColor(0);

  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white p-4 ${className ?? ''}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold leading-tight text-gray-900">{value}</span>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </span>
      {direction && (
        <span className="text-xs font-medium" style={deltaColour ? { color: deltaColour } : undefined}>
          <span aria-hidden="true">{DIRECTION[direction].glyph}</span>{' '}
          {Math.abs(delta as number)}
          <span className="sr-only"> {DIRECTION[direction].word}</span>
        </span>
      )}
      {trend && trend.length > 1 && (
        <Sparkline
          data={trend}
          height={26}
          stroke={trendColour}
          strokeWidth={2}
          className="mt-1.5 w-full"
        />
      )}
      {footnote && <span className="mt-1 text-xs text-gray-500">{footnote}</span>}
    </div>
  );
}
