/**
 * DescriptionList — a grid of label/value pairs, for the detail panel of a
 * record: an invoice header, a shipment's dates and references.
 *
 * Renders `<dl>/<dt>/<dd>`, which is what this content actually is. A table
 * would claim a row/column relationship that does not exist between one
 * shipment's carrier and its ETA, and a stack of divs says nothing at all.
 *
 * `columns` accepts a responsive object because these lists are long — a
 * thirteen-item shipment header at three columns on a desktop has to fall back
 * to one on a phone, and a fixed count makes one of those two layouts wrong.
 */
import { type ReactNode } from 'react';

export type DescriptionColumns = 1 | 2 | 3;

export interface DescriptionItem {
  label: ReactNode;
  value: ReactNode;
  /** Occupy the full row — for an address or a note among short fields. */
  span?: boolean;
  key?: string;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  /** A count, or per-breakpoint counts. `{ base: 1, sm: 2, lg: 3 }`. */
  columns?: DescriptionColumns | { base?: DescriptionColumns; sm?: DescriptionColumns; lg?: DescriptionColumns };
  /** Hairline-separated rows in a bordered panel. */
  bordered?: boolean;
  size?: 'sm' | 'md';
  /**
   * Shown in place of a value that is `null`, `undefined` or `''`. Defaults to
   * an em dash.
   *
   * A blank cell answers nothing — and inside `bordered`, where the cell has
   * an outline of its own, it reads as a rendering fault rather than as "there
   * is no tracking number". Pass `emptyText={null}` for the old behaviour.
   */
  emptyText?: ReactNode;
  title?: ReactNode;
  className?: string;
}

// Literal maps: Tailwind reads source text, so an interpolated `grid-cols-${n}`
// generates nothing and every column count silently collapses to one.
const COLS: Record<DescriptionColumns, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };
const SM: Record<DescriptionColumns, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };
const LG: Record<DescriptionColumns, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3' };
const SPAN: Record<DescriptionColumns, string> = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3' };

export default function DescriptionList({
  items, columns = 1, bordered = false, size = 'md', title, className = '',
  emptyText: empty = '—',
}: DescriptionListProps) {
  const resolved = typeof columns === 'number' ? { base: columns } : columns;
  const base = resolved.base ?? 1;
  // The widest count in play decides how far a spanning item stretches, so it
  // still fills the row at the breakpoint where the grid is widest.
  const widest = Math.max(base, resolved.sm ?? 0, resolved.lg ?? 0) as DescriptionColumns;

  const pad = size === 'sm' ? 'px-3 py-2' : 'px-4 py-3';
  const text = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={[bordered ? 'rounded-lg border border-gray-200 bg-white' : '', className].filter(Boolean).join(' ')}>
      {title && (
        <div className={`${pad} ${bordered ? 'border-b border-gray-100' : ''} text-sm font-semibold text-gray-900`.trim()}>
          {title}
        </div>
      )}
      <dl className={[
        'grid',
        COLS[base],
        resolved.sm ? SM[resolved.sm] : '',
        resolved.lg ? LG[resolved.lg] : '',
        bordered ? '' : 'gap-x-6 gap-y-3',
        bordered ? '' : pad === 'px-4 py-3' ? 'py-1' : '',
      ].filter(Boolean).join(' ')}>
        {items.map((item, i) => (
          <div
            key={item.key ?? i}
            className={[
              item.span ? SPAN[widest] : '',
              bordered ? `${pad} border-b border-gray-100 last:border-b-0` : '',
            ].filter(Boolean).join(' ')}
          >
            <dt className={`${text} text-gray-500`}>{item.label}</dt>
            {/* min-w-0 so a long unbroken value (a tracking number) wraps
                inside its cell instead of widening the whole grid. */}
            <dd className={`mt-0.5 min-w-0 break-words ${text} text-gray-900`}>
              {item.value === null || item.value === undefined || item.value === ''
                ? empty
                : item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
