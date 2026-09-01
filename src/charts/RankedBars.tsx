/**
 * RankedBars — magnitude across a nominal list whose names are long.
 *
 * Horizontal, because in an ERP the categories are routes, part numbers,
 * tenants and suppliers, and a vertical axis truncates every one of them.
 * Tremor calls this a BarList and Carbon a lollipop; the job is the same.
 *
 * One colour for every bar. Colouring darker-where-bigger is the tempting
 * mistake: the categories have no natural order, the ramp double-encodes the
 * length the bar already shows, and it burns the only free channel on
 * information the reader has. When ONE row is the finding, name it in
 * `emphasisKey` — that row takes the emphasis hue and the rest recede, which is
 * the honest way to say "look here" and is far more legible than eight hues.
 */
import { CHART_INK, seriesColor, STATUS_VARS, type StatusTone } from './palette';
import { MOTION, stagger } from './effects';
import { autoHighlightIndex } from './highlight';
import type { RankedBarsProps } from './types';

export default function RankedBars({
  rows,
  max,
  formatValue = v => String(v),
  emphasisKey,
  highlight = 'none',
  emphasisTone,
  barHeight = 12,
  rowGap = 30,
  animate = true,
  className,
  emptyLabel = 'Nothing to rank in this window.',
}: RankedBarsProps) {
  if (rows.length === 0) {
    return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;
  }

  const derived = autoHighlightIndex(rows.map(r => r.value), highlight);
  const litKey = emphasisKey ?? (derived === null ? undefined : rows[derived]?.key);
  const top = max ?? Math.max(...rows.map(r => r.value), 0);
  const base = seriesColor(0);

  return (
    <ol className={`m-0 list-none p-0 ${className ?? ''}`} style={{ display: 'grid', rowGap: `${rowGap - barHeight}px` }}>
      {rows.map(row => {
        const emphasised = row.key === litKey;
        const colour = emphasised
          ? (emphasisTone ? STATUS_VARS[emphasisTone] : seriesColor(1))
          : litKey
            ? CHART_INK.muted
            : base;
        const share = top > 0 ? Math.max(0, Math.min(1, row.value / top)) : 0;
        return (
          <li key={row.key} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-xs text-gray-600" title={row.label}>{row.label}</span>
              <span
                className="shrink-0 text-xs font-semibold tabular-nums text-gray-700"
                style={emphasised ? { color: colour } : undefined}
              >
                {formatValue(row.value)}
              </span>
            </div>
            {/* A track behind the bar, so a near-zero row is still a row rather
                than an invisible one. */}
            <div className="w-full rounded-sm bg-gray-100" style={{ height: barHeight }}>
              <div
                className={`rounded-sm ${animate ? MOTION.grow : ''}`}
                style={{
                  width: `${(share * 100).toFixed(2)}%`, height: barHeight,
                  backgroundColor: colour, minWidth: share > 0 ? 2 : 0,
                  ...(animate ? stagger(rows.indexOf(row)) : {}),
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type { StatusTone };
