/**
 * ChartFrame — the card a chart lives in, and the reason it is a component
 * rather than a pattern each caller reimplements.
 *
 * Three of the four things it carries are obligations, not decoration:
 *
 *   - **The table view.** Colour-only encoding on a continuous scale fails
 *     WCAG, and three of the eight light-mode series steps sit under 3:1
 *     against white. Both are discharged by a text equivalent of the same data.
 *     Putting the slot in the frame is what stops it being the first thing
 *     dropped under deadline.
 *   - **The legend.** Two or more series always get one, so identity is never
 *     carried by colour alone — and it is LIVE: pointing at an entry recedes
 *     every other series in the plot. Past three or four lines a legend stops
 *     answering "which one is Acme" on its own, because the reader has to trace
 *     a colour across a tangle. Focus does the same as hover, so the linkage is
 *     not pointer-only.
 *   - **Refetch without a flash.** A skeleton on every poll makes a live
 *     dashboard strobe and jump. `busy` holds the previous render at reduced
 *     opacity instead, so the layout never moves.
 *
 * The fourth is the empty state, which exists because "no data" and "broken"
 * look identical when a chart just renders nothing.
 */
import ChartSkeleton from './ChartSkeleton';
import { ChartHighlightProvider, useHighlight } from './highlight';
import { CHART_INK, resolveSeriesColor } from './palette';
import type { ChartFrameProps, ChartLegendSwatch } from './types';

/**
 * A swatch drawn to look like the mark it names.
 *
 * The outline variants use a ring rather than a lighter fill: a pale swatch
 * reads as a dimmed series, which is what the hover linkage means, and the two
 * must not look alike.
 */
function LegendSwatch({ shape, colour }: { shape: ChartLegendSwatch; colour: string }) {
  const base = 'shrink-0';
  switch (shape) {
    case 'circle':
      return <span className={`${base} h-2.5 w-2.5 rounded-full`} style={{ backgroundColor: colour }} />;
    case 'circle-outline':
      return <span className={`${base} h-2.5 w-2.5 rounded-full border-2`} style={{ borderColor: colour }} />;
    case 'rounded-square-outline':
      return <span className={`${base} h-2.5 w-2.5 rounded-sm border-2`} style={{ borderColor: colour }} />;
    case 'square':
      return <span className={`${base} h-2.5 w-2.5`} style={{ backgroundColor: colour }} />;
    case 'bar':
      return <span className={`${base} h-1 w-4 rounded-full`} style={{ backgroundColor: colour }} />;
    case 'bar-vertical':
      return <span className={`${base} h-3.5 w-1 rounded-full`} style={{ backgroundColor: colour }} />;
    default:
      return <span className={`${base} h-2.5 w-2.5 rounded-sm`} style={{ backgroundColor: colour }} />;
  }
}

/**
 * The legend, as buttons. Split out because it consumes the highlight context
 * the frame provides, and a component cannot consume a context it renders.
 */
function ChartLegend({
  entries,
  interactive,
  fallbackSwatch,
}: {
  entries: NonNullable<ChartFrameProps['legend']>;
  interactive: boolean;
  fallbackSwatch: ChartLegendSwatch;
}) {
  const { highlighted, setHighlighted } = useHighlight();
  return (
    <ul className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 p-0">
      {entries.map((entry, i) => {
        const dimmed = interactive && highlighted !== null && highlighted !== entry.key;
        const swatch = (
          <>
            <LegendSwatch
              shape={entry.swatch ?? fallbackSwatch}
              colour={resolveSeriesColor(i, entry.color, entry.tone)}
            />
            {entry.label}
          </>
        );
        return (
          <li key={entry.key} className="list-none">
            {interactive ? (
              <button
                type="button"
                // Focus does what hover does: a highlight reachable only by
                // pointer is a feature half the users do not have.
                onMouseEnter={() => setHighlighted(entry.key)}
                onMouseLeave={() => setHighlighted(null)}
                onFocus={() => setHighlighted(entry.key)}
                onBlur={() => setHighlighted(null)}
                className={`flex items-center gap-2 rounded text-xs text-gray-600 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${dimmed ? 'opacity-40' : ''}`}
              >
                {swatch}
              </button>
            ) : (
              <span className="flex items-center gap-2 text-xs text-gray-600">{swatch}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function ChartFrame({
  title,
  subtitle,
  legend,
  table,
  tableLabel = 'Show the data as a table',
  busy = false,
  loading = false,
  skeletonVariant = 'area',
  skeletonHeight,
  interactiveLegend = true,
  legendSwatch = 'rounded-square',
  actions,
  children,
  className,
}: ChartFrameProps) {
  return (
    <ChartHighlightProvider>
    <section
      className={`flex min-w-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 ${className ?? ''}`}
      aria-busy={busy || loading || undefined}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>

      {/* First load has nothing to hold, so it gets the skeleton. A refetch
          does: the previous render stays in place and dims, because replacing
          a correct chart with a fake one is a downgrade, and on a polling
          dashboard it strobes. */}
      {loading ? (
        <ChartSkeleton variant={skeletonVariant} height={skeletonHeight} />
      ) : (
        <div className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {children}
        </div>
      )}

      {!loading && legend && legend.length > 1 && (
        <ChartLegend entries={legend} interactive={interactiveLegend} fallbackSwatch={legendSwatch} />
      )}

      {!loading && table && (
        <details className="border-t border-gray-100 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            {tableLabel}
          </summary>
          <div className="mt-3 overflow-x-auto" style={{ color: CHART_INK.label }}>
            {table}
          </div>
        </details>
      )}
    </section>
    </ChartHighlightProvider>
  );
}
