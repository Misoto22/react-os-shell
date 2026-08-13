/**
 * DataTable — a presentational table for server-driven lists.
 *
 * It renders and it reports. It does not fetch, it does not sort, and it does
 * not paginate: the caller owns `sort` and `page` and hands back new data. That
 * is the whole design, and it is what makes it usable against a Django list
 * endpoint where the ordering happens in SQL and the rows on screen are one
 * page of a much larger set. A table that sorts its own `data` prop quietly
 * sorts the current page only, which is wrong in a way nobody notices until the
 * second page disagrees with the first.
 *
 * ── Which table is which ──
 * `EditableGrid`   — a spreadsheet. Cells are typed into.
 * `ResizableTable` — persists column widths per user; needs react-query + axios.
 * `EntityList`     — a whole list VIEW: fetching, export, context actions.
 * `DataTable`      — this. Read-only rows, no peers, no data layer.
 *
 * Sort uses the package's own `SortState` rather than a table-specific vocabulary,
 * so `DataTable`, `useSort` and `ResizableTable` all speak the same language and
 * a caller can move between them without a translation layer.
 */
import { type ReactNode } from 'react';
import Pagination from './Pagination';
import type { SortState } from './types';

export interface DataTableColumn<T> {
  key: string;
  title: ReactNode;
  /** Read this field when there is no `render`. */
  dataIndex?: keyof T & string;
  render?: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /**
   * The column holds a figure or a code — money, a quantity, a part or order
   * number.
   *
   * Renders it monospaced and right-aligns it by default. The table already
   * sets `tabular-nums`, so the digits line up down the column either way;
   * what this adds is a fixed advance for EVERY character, which is what lets
   * `00620L6N25KMFCBTDTM2QND` be compared against its neighbour by shape, and
   * a decimal point be found at the right edge without reading the number.
   */
  numeric?: boolean;
  /** Px. Also feeds the table's minimum width — see `minWidth`. */
  width?: number;
  /** Single-line with an ellipsis. */
  ellipsis?: boolean;
  /**
   * Pin to the left edge while the table scrolls horizontally. Only useful
   * with `minWidth` set, and only worth it for the columns that identify the
   * row — a part number, a name.
   */
  fixed?: 'left';
  /**
   * Offer a sort control. The FIELD sent to the server is `sortField ?? key`,
   * which is what lets a column named `no` sort by `part_number` without the
   * caller mapping names at the call site.
   */
  sortable?: boolean;
  sortField?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Stable identity per row. A string names a field; a function computes it. */
  rowKey: (keyof T & string) | ((row: T, index: number) => string);
  /** Current sort, or null. Controlled — this component never sorts `data`. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Server pagination. Omit entirely for an unpaginated or infinite list. */
  pagination?: { page: number; pageCount: number; onPageChange: (page: number) => void };
  /**
   * Names the table for assistive technology, rendered as a visually hidden
   * `<caption>`.
   *
   * A table with no name is announced as "table" and nothing else, so a page
   * with two of them — the invoice lines and the payments against it — gives a
   * screen-reader user two identical landmarks and no way to tell which is
   * which. The heading above it is not enough: table navigation jumps between
   * tables, not through the prose around them.
   */
  caption?: string;
  loading?: boolean;
  bordered?: boolean;
  size?: 'sm' | 'md';
  /**
   * Minimum table width in px. Below it the table scrolls horizontally instead
   * of crushing columns. Usually the sum of the columns' widths.
   */
  minWidth?: number;
  rowClassName?: (row: T, index: number) => string;
  onRow?: (row: T, index: number) => { onClick?: () => void; className?: string };
  emptyText?: ReactNode;
  /** Rendered under the rows — an infinite-scroll sentinel, a totals strip. */
  footer?: ReactNode;
  className?: string;
}

const PAD: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-1.5',
  md: 'px-3 py-2',
};

const ALIGN: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  // Both arrows always render; the inactive one is dimmed. A control that
  // appears only once sorted gives no hint that sorting is available at all.
  return (
    <span className="ml-1 inline-flex flex-col leading-none" aria-hidden="true">
      <svg className={`h-2 w-2 ${direction === 'asc' ? 'text-gray-700' : 'text-gray-300'}`} viewBox="0 0 8 5" fill="currentColor">
        <path d="M4 0L8 5H0z" />
      </svg>
      <svg className={`h-2 w-2 ${direction === 'desc' ? 'text-gray-700' : 'text-gray-300'}`} viewBox="0 0 8 5" fill="currentColor">
        <path d="M4 5L0 0h8z" />
      </svg>
    </span>
  );
}

export default function DataTable<T>({
  columns, data, rowKey, sort = null, onSortChange, pagination, caption, loading = false,
  bordered = false, size = 'md', minWidth, rowClassName, onRow, emptyText = 'Nothing to show',
  footer, className = '',
}: DataTableProps<T>) {
  const keyOf = (row: T, i: number): string =>
    typeof rowKey === 'function' ? rowKey(row, i) : String(row[rowKey]);

  const fieldOf = (col: DataTableColumn<T>) => col.sortField ?? col.key;

  const directionFor = (col: DataTableColumn<T>): 'asc' | 'desc' | null =>
    sort && sort.field === fieldOf(col) ? sort.direction : null;

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!onSortChange) return;
    const field = fieldOf(col);
    const current = directionFor(col);
    // asc → desc → unsorted. The third state matters: without it there is no
    // way back to the server's own default ordering once a column is clicked.
    if (current === null) onSortChange({ field, direction: 'asc' });
    else if (current === 'asc') onSortChange({ field, direction: 'desc' });
    else onSortChange(null);
  };

  const cellBase = `${PAD[size]} ${size === 'sm' ? 'text-xs' : 'text-sm'}`;
  // Running totals of the widths to the left of each fixed column, so a second
  // pinned column sits flush against the first instead of on top of it.
  let fixedOffset = 0;
  const offsets = columns.map(col => {
    if (col.fixed !== 'left') return null;
    const at = fixedOffset;
    fixedOffset += col.width ?? 0;
    return at;
  });

  return (
    <div className={className}>
      <div className={`relative overflow-x-auto ${bordered ? 'rounded-lg border border-gray-200' : ''}`.trim()}>
        {loading && (
          // An overlay rather than replacing the rows: the table keeps its
          // height and its scroll position, so re-sorting does not throw the
          // page around under the user.
          <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/60 pt-8" role="status" aria-live="polite">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <span className="sr-only">Loading</span>
          </div>
        )}
        <table className="w-full border-collapse tabular-nums" style={minWidth ? { minWidth } : undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col, ci) => {
                const dir = directionFor(col);
                // A figures column right-aligns unless the caller says
                // otherwise: the decimal point is the thing being compared,
                // and it only lines up at the right edge.
                const align = ALIGN[col.align ?? (col.numeric ? 'right' : 'left')];
                const pinned = col.fixed === 'left';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    // aria-sort is what a screen reader announces; the arrows
                    // are decorative and marked so.
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    style={{
                      width: col.width,
                      ...(pinned ? { left: offsets[ci] ?? 0 } : {}),
                    }}
                    className={[
                      cellBase, align,
                      'font-semibold uppercase tracking-wide text-gray-500',
                      size === 'sm' ? 'text-[10px]' : 'text-xs',
                      pinned ? 'sticky z-10 bg-gray-50' : '',
                      col.headerClassName ?? '',
                    ].filter(Boolean).join(' ')}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={`inline-flex items-center font-semibold uppercase tracking-wide hover:text-gray-700 ${align}`}
                      >
                        {col.title}
                        <SortIcon direction={dir} />
                      </button>
                    ) : col.title}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length} className={`${cellBase} py-10 text-center text-gray-500`}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const rowProps = onRow?.(row, i);
                return (
                  <tr
                    key={keyOf(row, i)}
                    onClick={rowProps?.onClick}
                    className={[
                      'border-b border-gray-100 last:border-b-0',
                      rowProps?.onClick ? 'cursor-pointer hover:bg-gray-50' : '',
                      rowClassName?.(row, i) ?? '',
                      rowProps?.className ?? '',
                    ].filter(Boolean).join(' ')}
                  >
                    {columns.map((col, ci) => {
                      const pinned = col.fixed === 'left';
                      return (
                        <td
                          key={col.key}
                          style={pinned ? { left: offsets[ci] ?? 0 } : undefined}
                          className={[
                            cellBase, ALIGN[col.align ?? (col.numeric ? 'right' : 'left')],
                            col.numeric ? 'font-mono' : '', 'text-gray-900',
                            col.ellipsis ? 'max-w-0 truncate' : '',
                            // A pinned cell needs its own background or the
                            // scrolling columns show through it.
                            pinned ? 'sticky z-10 bg-white' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {col.render
                            ? col.render(row, i)
                            : col.dataIndex
                              ? (row[col.dataIndex] as ReactNode)
                              : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {footer}
      </div>
      {pagination && pagination.pageCount > 1 && (
        <div className="mt-3 flex justify-end">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
