/**
 * `useColumnConfig` must follow a column list that changes while mounted.
 *
 * The state is seeded once, in `useState`'s initialiser. A consumer whose
 * `ColumnDef[]` grows afterwards — a comparison period switched on, a mode
 * revealing extra measures, a permission resolving late — got nothing: the new
 * definitions never reached the state, so `orderedColumns` never mentioned
 * them and the table simply did not draw them. The only way to see the columns
 * was to close the window and open it again.
 *
 * The withdrawal side had the mirror problem: a key left in state after its
 * definition went away, and `orderedColumns` spreads `defaultColumns.find(…)!`
 * over it — a non-null assertion on `undefined`, which yields a column with a
 * width and no key or label.
 *
 * Asserted through `allColumns` and `orderedColumns` because those are what the
 * picker and the table actually render.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { render, flush, act } from './dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColumnConfig } from '../src/data/useColumnConfig';
import type { ColumnDef } from '../src/data/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const BASE: ColumnDef[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'net', label: 'Net' },
  { key: 'gross', label: 'Gross' },
];

// The pair is declared immediately after `net`, which is the whole point: a
// prior-period figure is unreadable eleven columns away from the figure it
// compares.
const WITH_COMPARISON: ColumnDef[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'net', label: 'Net' },
  { key: 'net__prior', label: 'Net (prior year)' },
  { key: 'net__change', label: 'Net change' },
  { key: 'gross', label: 'Gross' },
];

type Hook = ReturnType<typeof useColumnConfig>;

/** Mounts once and lets the test swap the consumer's column list, the way a
 *  filter change does — a remount would hide the bug entirely. */
function mountSwappable(tableId: string) {
  const ref: { current: Hook | null } = { current: null };
  let swap: (cols: ColumnDef[]) => void = () => {};
  function Probe() {
    const [cols, setCols] = useState<ColumnDef[]>(BASE);
    swap = setCols;
    ref.current = useColumnConfig(tableId, cols);
    return null;
  }
  const { unmount } = render(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
  return { ref, unmount, swap: (cols: ColumnDef[]) => swap(cols) };
}

const keys = (hook: Hook) => hook.allColumns.map(c => c.key);

test('columns added after mount reach the table', async (t) => {
  localStorage.clear();
  const { ref, unmount, swap } = mountSwappable('sync-added');
  t.after(unmount);
  await flush();
  assert.deepEqual(keys(ref.current!), ['customer', 'net', 'gross']);

  await act(() => { swap(WITH_COMPARISON); });
  await flush();

  assert.deepEqual(
    keys(ref.current!),
    ['customer', 'net', 'net__prior', 'net__change', 'gross'],
    'a column added while mounted must appear, and beside the one it was declared next to',
  );
  assert.deepEqual(
    ref.current!.orderedColumns.map(c => c.label),
    ['Customer', 'Net', 'Net (prior year)', 'Net change', 'Gross'],
    'the table must render the added columns with their declared labels',
  );
});

test('columns withdrawn after mount leave cleanly', async (t) => {
  localStorage.clear();
  const { ref, unmount, swap } = mountSwappable('sync-withdrawn');
  t.after(unmount);
  await flush();

  await act(() => { swap(WITH_COMPARISON); });
  await flush();
  await act(() => { swap(BASE); });
  await flush();

  assert.deepEqual(keys(ref.current!), ['customer', 'net', 'gross']);
  // Every rendered column must still resolve to a real definition — the
  // non-null assertion in `orderedColumns` is what a stale key breaks.
  assert.ok(
    ref.current!.orderedColumns.every(c => typeof c.key === 'string' && c.key.length > 0),
    'a withdrawn column must not leave a definition-less entry behind',
  );
});

test('a column that comes back keeps what the user did to it', async (t) => {
  localStorage.clear();
  const { ref, unmount, swap } = mountSwappable('sync-roundtrip');
  t.after(unmount);
  await flush();

  await act(() => { swap(WITH_COMPARISON); });
  await flush();
  await act(() => { ref.current!.toggleColumn('net__prior'); });
  assert.ok(ref.current!.allColumns.find(c => c.key === 'net__prior')!.hidden);

  // Off and on again — toggling a comparison must not silently undo the
  // reader's decision to hide one of its columns.
  await act(() => { swap(BASE); });
  await flush();
  await act(() => { swap(WITH_COMPARISON); });
  await flush();

  assert.equal(
    ref.current!.allColumns.find(c => c.key === 'net__prior')!.hidden,
    true,
    'a withdrawn column returning must come back as the user left it',
  );
});

test('an unchanged column list is not reshuffled', async (t) => {
  localStorage.clear();
  const { ref, unmount, swap } = mountSwappable('sync-stable');
  t.after(unmount);
  await flush();

  await act(() => { ref.current!.toggleColumn('gross'); });
  const before = keys(ref.current!);

  // A consumer that rebuilds its ColumnDef array every render must not have
  // its user-chosen state rebuilt with it.
  await act(() => { swap([...BASE]); });
  await flush();

  assert.deepEqual(keys(ref.current!), before);
  assert.equal(
    ref.current!.allColumns.find(c => c.key === 'gross')!.hidden,
    true,
    'a fresh array with the same keys must leave the hidden flags alone',
  );
});
