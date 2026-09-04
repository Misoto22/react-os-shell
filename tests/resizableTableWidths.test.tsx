/**
 * A wide table must SCROLL, not crush its columns to fit.
 *
 * `ResizableTable` turned each column's width into a percentage of the running
 * total and put it on a `w-full` table. That made every width a ratio and
 * never a size, with three consequences:
 *
 *   - the table always measured exactly its container, so a wide list squeezed
 *     every column. Thirteen columns in a 1118px window came out at 91px each
 *     and every currency figure truncated to `A$514…`;
 *   - the body's `overflow-x-auto` was dead code — a table that can never
 *     exceed its container never overflows, so there was nothing to scroll to;
 *   - a resize handle could only steal width from other columns. Widening one
 *     narrowed its neighbours and the total never moved.
 *
 * Asserted on the rendered markup because the layout IS the bug: a unit that
 * called the hook would have passed throughout.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResizableTable from '../src/data/ResizableTable';
import type { ColumnDef } from '../src/data/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const WIDE: ColumnDef[] = Array.from({ length: 12 }, (_, i) => ({
  key: `c${i}`, label: `Column ${i}`, defaultWidth: 150,
}));

function mount(columns: ColumnDef[], tableId: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ResizableTable tableId={tableId} columns={columns} saveDefaultPerms={[]}>
        {() => <tbody />}
      </ResizableTable>
    </QueryClientProvider>,
  );
}

test('column widths are pixels, not percentages of the total', () => {
  localStorage.clear();
  const view = mount(WIDE, 'widths-px');
  const cols = [...view.container.querySelectorAll('col')];
  assert.ok(cols.length > 0, 'the table declares a colgroup');
  for (const col of cols) {
    const w = (col as HTMLElement).style.width;
    assert.ok(
      w.endsWith('px'),
      `a column width must be a size, not a ratio — got ${w}`,
    );
  }
  view.unmount();
});

test('the table is as wide as its columns, and never narrower than its container', () => {
  localStorage.clear();
  const view = mount(WIDE, 'widths-total');
  const tables = [...view.container.querySelectorAll('table')];
  assert.ok(tables.length >= 1);
  for (const t of tables) {
    const style = (t as HTMLElement).style;
    // 12 * 150 = 1800. The container it lives in is narrower than that in
    // every real window, which is exactly when the old code crushed it.
    assert.equal(style.width, '1800px', 'the table takes the width its columns ask for');
    assert.equal(
      style.minWidth, '100%',
      'and still fills a container wider than its columns, as the percentages did',
    );
  }
  view.unmount();
});

test('header and body agree on every column width', () => {
  // They are two separate tables. If their colgroups drift, the labels stop
  // naming the columns beneath them.
  localStorage.clear();
  const view = mount(WIDE, 'widths-agree');
  const tables = [...view.container.querySelectorAll('table')];
  assert.equal(tables.length, 2, 'a header table and a body table');
  const widths = tables.map(t =>
    [...t.querySelectorAll('col')].map(c => (c as HTMLElement).style.width).join(','));
  assert.equal(widths[0], widths[1]);
  view.unmount();
});

test('the header sits in a scroller the user cannot drag', () => {
  // It is driven by the body's scroll. Left scrollable, a wide table would
  // carry two horizontal scrollbars that fight each other.
  localStorage.clear();
  const view = mount(WIDE, 'widths-headwrap');
  const head = view.container.querySelector('table')!.parentElement!;
  assert.match(head.className, /overflow-x-hidden/);
  view.unmount();
});
