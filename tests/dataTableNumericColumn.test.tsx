import { flush } from './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
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
