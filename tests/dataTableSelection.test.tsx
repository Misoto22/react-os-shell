/**
 * DataTable `selection` — the peer-free checkbox column (EntityList has the
 * heavyweight one). The contracts pinned here:
 *
 *  - selection is by row KEY, and the header checkbox moves only the CURRENT
 *    data's keys — a selection made on another page must survive both a
 *    select-all and a clear-all on this one;
 *  - clicking the checkbox never opens the row (`onRow.onClick` stays quiet);
 *  - the header checkbox reads indeterminate when the page is partly chosen;
 *  - without the prop the table renders no checkboxes at all (regression).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// First, and before anything that touches `src/` — see `dom.ts`.
import { act, render } from './dom';
import DataTable from '../src/data/DataTable';

const ROWS = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];
const COLS = [{ key: 'name', title: 'Name', dataIndex: 'name' as const }];

function boxes(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
}

test('row toggles add and remove keys; the header selects the page', async () => {
  let selected: string[] = ['zz']; // a key from some other page
  const onChange = (next: string[]) => { selected = next; };
  const view = render(
    <DataTable columns={COLS} data={ROWS} rowKey="id" selection={{ selected, onChange }} />,
  );
  const [header, rowA] = boxes(view.container);
  act(() => { rowA.click(); });
  assert.deepEqual(selected, ['zz', 'a'], 'row toggle appends its key');

  view.rerender(<DataTable columns={COLS} data={ROWS} rowKey="id" selection={{ selected, onChange }} />);
  act(() => { header.click(); });
  assert.deepEqual(selected, ['zz', 'a', 'b', 'c'], 'select-all adds the missing page keys');

  view.rerender(<DataTable columns={COLS} data={ROWS} rowKey="id" selection={{ selected, onChange }} />);
  act(() => { boxes(view.container)[0].click(); });
  assert.deepEqual(selected, ['zz'], 'clear-all removes ONLY the page keys — the foreign key survives');
  await act(async () => { view.unmount(); });
});

test('the header checkbox is indeterminate when the page is partly chosen', async () => {
  const view = render(
    <DataTable columns={COLS} data={ROWS} rowKey="id" selection={{ selected: ['a'], onChange: () => {} }} />,
  );
  const [header] = boxes(view.container);
  assert.equal(header.indeterminate, true);
  assert.equal(header.checked, false);
  await act(async () => { view.unmount(); });
});

test('the checkbox never opens the row', async () => {
  let opened = 0;
  const view = render(
    <DataTable
      columns={COLS}
      data={ROWS}
      rowKey="id"
      onRow={() => ({ onClick: () => { opened += 1; } })}
      selection={{ selected: [], onChange: () => {} }}
    />,
  );
  const [, rowA] = boxes(view.container);
  act(() => { rowA.click(); });
  assert.equal(opened, 0, 'toggling a checkbox must not also open the row');
  await act(async () => { view.unmount(); });
});

test('without the prop there are no checkboxes, and the empty state spans right', async () => {
  const plain = render(<DataTable columns={COLS} data={ROWS} rowKey="id" />);
  assert.equal(boxes(plain.container).length, 0);
  await act(async () => { plain.unmount(); });

  const empty = render(
    <DataTable columns={COLS} data={[]} rowKey="id" selection={{ selected: [], onChange: () => {} }} />,
  );
  assert.equal(empty.container.querySelector('tbody td')!.getAttribute('colspan'), '2',
    'the empty row spans the checkbox column too');
  await act(async () => { empty.unmount(); });
});
