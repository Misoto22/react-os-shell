import { flush } from './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, act } from './dom';
import DataTable from '../src/data/DataTable';

/**
 * A column of figures or codes was indistinguishable from a column of words.
 *
 * The table already sets `tabular-nums`, so digits line up down every column
 * without this — a first draft of these specs asserted that and passed against
 * a table that had done it all along. What `numeric` adds is a fixed advance
 * for EVERY character, which is what lets `00620L6N25KMFCBTDTM2QND` be
 * compared against its neighbour by shape, plus a right-aligned default so a
 * decimal point is found at the edge rather than read for.
 */

void flush;
const ROWS = [{ id: 'a', part: '00620L6N25', total: '1,240.00' }, { id: 'b', part: '02318J5B38', total: '999.00' }];
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('a figures column is monospaced', () => {
  const markup = html(
    <DataTable
      rowKey="id"
      data={ROWS}
      columns={[{ key: 'total', title: 'Total', dataIndex: 'total', numeric: true }]}
    />,
  );
  assert.match(markup, /font-mono/);
});

test('and right-aligns without being asked', () => {
  // The decimal point is the thing being compared, and it only lines up at the
  // right edge.
  const markup = html(
    <DataTable rowKey="id" data={ROWS} columns={[{ key: 'total', title: 'Total', dataIndex: 'total', numeric: true }]} />,
  );
  assert.match(markup, /text-right/);
});

test('an explicit align still wins', () => {
  // A part number is a figure that reads left-to-right like a word.
  const markup = html(
    <DataTable
      rowKey="id"
      data={ROWS}
      columns={[{ key: 'part', title: 'Part', dataIndex: 'part', numeric: true, align: 'left' }]}
    />,
  );
  assert.match(markup, /text-left/);
  assert.match(markup, /font-mono/, 'and it is still a figures column');
});

test('a column without it is untouched', () => {
  const markup = html(
    <DataTable rowKey="id" data={ROWS} columns={[{ key: 'part', title: 'Part', dataIndex: 'part' }]} />,
  );
  assert.doesNotMatch(markup, /font-mono/);
  assert.doesNotMatch(markup, /text-right/);
});

/**
 * A table with no name is announced as "table" and nothing else. A page with
 * two — the invoice lines and the payments against it — then gives a
 * screen-reader user two identical landmarks and no way to tell them apart.
 *
 * The heading above it does not help: table navigation jumps between tables,
 * not through the prose around them.
 */

test('a caption names the table', () => {
  const markup = html(
    <DataTable rowKey="id" data={ROWS} caption="Invoice line items"
      columns={[{ key: 'part', title: 'Part', dataIndex: 'part' }]} />,
  );
  assert.match(markup, /<caption[^>]*>Invoice line items<\/caption>/);
});

test('the caption is for the ear, not the eye', () => {
  // It names the table without adding a visible title the design did not ask
  // for — the heading above it is usually already there.
  const markup = html(
    <DataTable rowKey="id" data={ROWS} caption="Invoices"
      columns={[{ key: 'part', title: 'Part', dataIndex: 'part' }]} />,
  );
  assert.match(markup, /<caption class="sr-only"/);
});

test('the caption is the first child of the table', () => {
  // HTML requires it there; a <caption> after <thead> is dropped by the parser
  // and the table goes back to being unnamed.
  const markup = html(
    <DataTable rowKey="id" data={ROWS} caption="Invoices"
      columns={[{ key: 'part', title: 'Part', dataIndex: 'part' }]} />,
  );
  assert.match(markup, /<table[^>]*><caption/);
});

test('no caption, no element', () => {
  const markup = html(
    <DataTable rowKey="id" data={ROWS} columns={[{ key: 'part', title: 'Part', dataIndex: 'part' }]} />,
  );
  assert.doesNotMatch(markup, /<caption/);
});

/**
 * Which way the first click sorts is the column's to say.
 *
 * A price column, a quantity, a date where the newest matters — the
 * interesting end is the top. Making those start ascending costs every user
 * two clicks to reach the thing they opened the column for, every time.
 */

test('a column can start descending', () => {
  const seen: unknown[] = [];
  const view = render(
    <DataTable
      rowKey="id"
      data={ROWS}
      onSortChange={s => seen.push(s)}
      columns={[{ key: 'total', title: 'Total', dataIndex: 'total', sortable: true, sortFirst: 'desc' }]}
    />,
  );
  const header = view.container.querySelector('th button') as HTMLElement;
  act(() => { header.click(); });
  assert.deepEqual(seen.at(-1), { field: 'total', direction: 'desc' });
  view.unmount();
});

test('the second click reverses, the third clears — whichever way it started', () => {
  // The three states are the point; only their order changes.
  for (const first of ['asc', 'desc'] as const) {
    const seen: unknown[] = [];
    function Harness() {
      const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
      return (
        <DataTable
          rowKey="id" data={ROWS} sort={sort}
          onSortChange={s => { seen.push(s); setSort(s); }}
          columns={[{ key: 'total', title: 'Total', dataIndex: 'total', sortable: true, sortFirst: first }]}
        />
      );
    }
    const view = render(<Harness />);
    const click = () => act(() => { (view.container.querySelector('th button') as HTMLElement).click(); });
    click(); click(); click();
    assert.deepEqual(seen, [
      { field: 'total', direction: first },
      { field: 'total', direction: first === 'asc' ? 'desc' : 'asc' },
      null,
    ], first);
    view.unmount();
  }
});

test('omitting it is ascending, exactly as before', () => {
  const seen: unknown[] = [];
  const view = render(
    <DataTable rowKey="id" data={ROWS} onSortChange={s => seen.push(s)}
      columns={[{ key: 'total', title: 'Total', dataIndex: 'total', sortable: true }]} />,
  );
  act(() => { (view.container.querySelector('th button') as HTMLElement).click(); });
  assert.deepEqual(seen.at(-1), { field: 'total', direction: 'asc' });
  view.unmount();
});
