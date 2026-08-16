/**
 * Regression guard for EntityList forwarding `errorTitle`/`errorMessage` to
 * `ListLoadError`.
 *
 * `ListLoadError` has accepted `title`/`message` since it landed, but
 * EntityList rendered it bare — so every list that wired `isError` natively got
 * the generic "Couldn't load this list" and had no way to say WHICH list. That
 * is not cosmetic: the admin portal's 2026-08-15 sweep moved 14 lists onto the
 * native `isError` prop and had to delete entity-specific copy on the way
 * ("Couldn't load the talent database", "Couldn't load blog posts"), because
 * the custom `ListLoadError` those lists rendered through the `emptyState`
 * ternary becomes unreachable the moment `isError` is passed.
 *
 * The pair of claims that matter, and why both are here:
 *
 *  1. Passed copy reaches the DOM. The obvious one.
 *  2. Copy OMITTED still yields the generic default. Less obvious and easier to
 *     break: `title`/`message` default via destructuring defaults inside
 *     `ListLoadError`, which only fire for `undefined`. Forward them as `''`,
 *     or through a `?? null`, and every existing caller silently loses its
 *     heading instead of falling back — a regression the first test cannot see.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EntityList from '../src/data/EntityList';

interface Row { id: number; name: string }

// Nothing here fetches — ResizableTable's column config just wants a client in
// the tree. Retries off so a stray one cannot outlive the spec.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

function List(props: { errorTitle?: string; errorMessage?: string }) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  return (
    <QueryClientProvider client={queryClient}>
      <EntityList<Row>
        items={[]}
        isLoading={false}
        isError
        onRetry={() => {}}
        errorTitle={props.errorTitle}
        errorMessage={props.errorMessage}
        emptyState={<div>NOT THE EMPTY STATE</div>}
        tableId="error-copy-spec"
        columns={[{ key: 'name', label: 'Name' }]}
        renderCell={(r) => r.name}
        selected={selected}
        setSelected={setSelected}
        onRowClick={() => {}}
        footerLabel="rows"
      />
    </QueryClientProvider>
  );
}

test('errorTitle/errorMessage reach the rendered ListLoadError', (t) => {
  const { container, unmount } = render(
    <List errorTitle="Couldn’t load the talent database" errorMessage="The talent service may be down." />,
  );
  t.after(unmount);

  const alert = container.querySelector('[role=alert]');
  assert.ok(alert, 'the error state renders, not the empty state');
  assert.match(alert.textContent ?? '', /Couldn’t load the talent database/);
  assert.match(alert.textContent ?? '', /The talent service may be down\./);
  assert.doesNotMatch(
    alert.textContent ?? '',
    /Couldn't load this list/,
    'the generic heading is replaced, not appended to',
  );
});

test('omitting them keeps ListLoadError’s generic copy', (t) => {
  const { container, unmount } = render(<List />);
  t.after(unmount);

  const alert = container.querySelector('[role=alert]');
  assert.ok(alert, 'the error state still renders');
  // The default has to survive `title={undefined}` — see the header note.
  assert.match(alert.textContent ?? '', /Couldn't load this list/);
  assert.match(alert.textContent ?? '', /Check your connection and try again\./);
});
