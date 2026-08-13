import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from './dom';
import DataTable from '../src/data/DataTable';

/**
 * A statement puts Debit and Credit over an Amount and a balance each. Both
 * amount columns are called "Amount" — the group is the only thing telling
 * them apart, for a reader and for a screen reader, which reads a header
 * spanning a column as part of that column's context.
 *
 * Flattening is not a workaround for the same reason: it produces two columns
 * with the same name and no way to know which is which.
 */

const ROWS = [{ id: 'a', date: '03 Mar', debit: '710.00', debitBal: '0.00', credit: '—', creditBal: '—' }];
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

const GROUPED = [
  { key: 'date', title: 'Date', dataIndex: 'date' as const },
  { title: 'Debit', columns: [
    { key: 'debit', title: 'Amount', dataIndex: 'debit' as const, numeric: true },
    { key: 'debitBal', title: 'Outstanding', dataIndex: 'debitBal' as const, numeric: true },
  ] },
  { title: 'Credit', columns: [
    { key: 'credit', title: 'Amount', dataIndex: 'credit' as const, numeric: true },
    { key: 'creditBal', title: 'Unallocated', dataIndex: 'creditBal' as const, numeric: true },
  ] },
];

test('a group spans its children', () => {
  const view = render(<DataTable rowKey="id" data={ROWS} columns={GROUPED} />);
  const debit = [...view.container.querySelectorAll('th')].find(th => th.textContent === 'Debit')!;
  assert.equal(debit.getAttribute('colspan'), '2');
  assert.equal(debit.getAttribute('scope'), 'colgroup', 'a screen reader reads it as the column context');
  view.unmount();
});

test('a leaf beside a group spans both header rows', () => {
  // Otherwise "Date" floats above an empty cell instead of sitting level with
  // the group's children.
  const view = render(<DataTable rowKey="id" data={ROWS} columns={GROUPED} />);
  const date = [...view.container.querySelectorAll('th')].find(th => th.textContent === 'Date')!;
  assert.equal(date.getAttribute('rowspan'), '2');
  view.unmount();
});

test('the header is two rows, and the second holds only the children', () => {
  const view = render(<DataTable rowKey="id" data={ROWS} columns={GROUPED} />);
  const rows = view.container.querySelectorAll('thead tr');
  assert.equal(rows.length, 2);
  assert.deepEqual(
    [...rows[1].querySelectorAll('th')].map(th => th.textContent),
    ['Amount', 'Outstanding', 'Amount', 'Unallocated'],
  );
  view.unmount();
});

test('the body renders the leaves, in order, ignoring the grouping', () => {
  const view = render(<DataTable rowKey="id" data={ROWS} columns={GROUPED} />);
  assert.deepEqual(
    [...view.container.querySelectorAll('tbody td')].map(td => td.textContent),
    ['03 Mar', '710.00', '0.00', '—', '—'],
  );
  view.unmount();
});

test('the empty state spans every leaf, not every group', () => {
  // colSpan over the top-level list would leave the row two cells short and
  // the message off-centre under a table it is supposed to fill.
  const markup = html(<DataTable rowKey="id" data={[]} columns={GROUPED} emptyText="Nothing yet" />);
  assert.match(markup, /colSpan="5"/i);
});

test('an ungrouped table still has one header row', () => {
  // Every table shipping today is in this shape.
  const view = render(
    <DataTable rowKey="id" data={ROWS} columns={[{ key: 'date', title: 'Date', dataIndex: 'date' }]} />,
  );
  assert.equal(view.container.querySelectorAll('thead tr').length, 1);
  assert.equal(view.container.querySelector('th')!.getAttribute('rowspan'), null, 'and no rowSpan on its cells');
  view.unmount();
});

test('a grouped column still sorts', () => {
  // The sort button belongs to the leaf, which lives in the second row.
  const seen: unknown[] = [];
  const cols = [
    { title: 'Debit', columns: [{ key: 'debit', title: 'Amount', dataIndex: 'debit' as const, sortable: true }] },
  ];
  const view = render(<DataTable rowKey="id" data={ROWS} columns={cols} onSortChange={s => seen.push(s)} />);
  (view.container.querySelector('thead tr:nth-child(2) button') as HTMLElement).click();
  assert.deepEqual(seen.at(-1), { field: 'debit', direction: 'asc' });
  view.unmount();
});
