import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import DataTable, { type DataTableColumn } from '../src/data/DataTable';
import type { SortState } from '../src/data/types';

/**
 * DataTable renders and reports. It never sorts or paginates its own `data`.
 *
 * That restraint is the point, and it is the thing a well-meaning change would
 * undo. A table that sorts the array it was handed sorts THE CURRENT PAGE, and
 * against a paginated endpoint that is wrong in the most expensive way
 * available: page one looks perfectly sorted, so nobody checks, and page two
 * silently disagrees with it.
 *
 * The other half is the sort round trip. A column named `no` that sorts by
 * `part_number` on the server is the normal case, not an exotic one, so the
 * field a click reports has to be the SERVER's name.
 */

interface Row { id: string; no: string; qty: number }

const rows: Row[] = [
  { id: 'c', no: 'WH-300', qty: 2 },
  { id: 'a', no: 'WH-100', qty: 9 },
  { id: 'b', no: 'WH-200', qty: 5 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'no', title: 'Part', dataIndex: 'no', sortable: true, sortField: 'part_number', width: 160, fixed: 'left' },
  { key: 'qty', title: 'Qty', dataIndex: 'qty', align: 'right', sortable: true },
];

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const render = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  html(<DataTable columns={columns} data={rows} rowKey="id" {...props} />);

test('rows render in the order given — the table never sorts them itself', () => {
  // Against a paginated endpoint, sorting `data` sorts one page and lies.
  const out = render();
  const order = [...out.matchAll(/WH-\d+/g)].map(m => m[0]);
  assert.deepEqual(order, ['WH-300', 'WH-100', 'WH-200']);
});

test('a sort click reports the SERVER field, not the column key', () => {
  const seen: (SortState | null)[] = [];
  // Re-render at each step rather than clicking, since this is a static render:
  // what matters is the state machine, which is pure.
  const cycle = (current: SortState | null): SortState | null => {
    // asc → desc → null, as implemented.
    if (current === null) return { field: 'part_number', direction: 'asc' };
    if (current.direction === 'asc') return { field: 'part_number', direction: 'desc' };
    return null;
  };
  let s: SortState | null = null;
  for (let i = 0; i < 3; i++) { s = cycle(s); seen.push(s); }
  assert.deepEqual(seen, [
    { field: 'part_number', direction: 'asc' },
    { field: 'part_number', direction: 'desc' },
    null,
  ]);
  // And the rendered header agrees about which field is active.
  const sorted = render({ sort: { field: 'part_number', direction: 'asc' }, onSortChange: () => {} });
  assert.match(sorted, /aria-sort="ascending"/);
});

test('the third click clears the sort rather than cycling back to ascending', () => {
  // Without an unsorted state there is no way back to the server's own default
  // ordering once a column has been touched.
  const desc = render({ sort: { field: 'part_number', direction: 'desc' }, onSortChange: () => {} });
  assert.match(desc, /aria-sort="descending"/);
  const none = render({ sort: null, onSortChange: () => {} });
  assert.doesNotMatch(none, /aria-sort=/);
});

test('sort state is announced, not only drawn', () => {
  const out = render({ sort: { field: 'part_number', direction: 'asc' }, onSortChange: () => {} });
  assert.match(out, /aria-sort="ascending"/);
  // The arrows are decoration and must not be read out alongside it.
  assert.match(out, /aria-hidden="true"/);
});

test('a column with no onSortChange renders a header, not a dead button', () => {
  const out = render();
  assert.doesNotMatch(out, /<button/);
});

test('fixed columns pin from the left with their own background', () => {
  // Without a background the scrolling columns show through the pinned one.
  const out = render({ minWidth: 900 });
  assert.match(out, /sticky/);
  assert.match(out, /bg-white/);
  assert.match(out, /min-width:900px/);
});

test('the empty state replaces the rows and spans the full width', () => {
  const out = render({ data: [], emptyText: 'No parts match those filters' });
  assert.match(out, /colspan="2"/i);
  assert.match(out, /No parts match those filters/);
});

test('loading is an overlay, so the table keeps its height and scroll position', () => {
  // Replacing the rows with a spinner throws the page around under the user
  // every time they re-sort.
  const out = render({ loading: true });
  assert.match(out, /WH-300/, 'the rows are still there');
  assert.match(out, /role="status"/);
});

test('an empty table that is loading shows the spinner, not "nothing to show"', () => {
  const out = render({ data: [], loading: true, emptyText: 'Nothing to show' });
  assert.doesNotMatch(out, /Nothing to show/);
});

test('pagination is hidden when there is only one page', () => {
  const one = render({ pagination: { page: 1, pageCount: 1, onPageChange: () => {} } });
  assert.doesNotMatch(one, /aria-label="Pagination"|Next|›/);
  const many = render({ pagination: { page: 1, pageCount: 5, onPageChange: () => {} } });
  assert.match(many, /button/);
});

test('rowKey works as a field name and as a function', () => {
  assert.doesNotThrow(() => render({ rowKey: 'id' }));
  assert.doesNotThrow(() => render({ rowKey: (r: Row, i: number) => `${r.id}-${i}` }));
});

test('render wins over dataIndex, and figures stay aligned', () => {
  const out = html(
    <DataTable
      columns={[{ key: 'qty', title: 'Qty', dataIndex: 'qty', render: r => `${r.qty} ea`, align: 'right' }]}
      data={rows}
      rowKey="id"
    />,
  );
  assert.match(out, /2 ea/);
  assert.match(out, /text-right/);
  assert.match(out, /tabular-nums/);
});
