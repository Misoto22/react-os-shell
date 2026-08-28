import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import EntityWindowState, { normaliseEntitySnapshot } from '../src/shell/EntityWindowState';

test('a null snapshot is absence, not successful initial data', () => {
  assert.equal(normaliseEntitySnapshot(null), undefined);
});

test('a background fetch with no entity renders loading, never not-found', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={null}
      isPending={false}
      isFetching
      error={null}
      onRetry={() => {}}
    >
      {(entity) => <div>{String(entity)}</div>}
    </EntityWindowState>,
  );

  assert.match(html, /role="status"/);
  assert.match(html, /Loading record/);
  assert.match(html, /flex-1/);
  assert.match(html, /min-h-0/);
  assert.doesNotMatch(html, /not found/i);
});

test('usable entity data stays rendered through a background refresh failure', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={{ name: 'Speed' }}
      isPending={false}
      isFetching
      error={{ response: { status: 500 } }}
      onRetry={() => {}}
    >
      {(entity) => <div>Design: {entity.name}</div>}
    </EntityWindowState>,
  );

  assert.match(html, /Design: Speed/);
  assert.doesNotMatch(html, /Loading record|Couldn|not found/i);
});

test('a retryable failure is an error with a retry action, not not-found', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={undefined}
      isPending={false}
      isFetching={false}
      error={{ response: { status: 500 } }}
      onRetry={() => {}}
    >
      {(entity) => <div>{String(entity)}</div>}
    </EntityWindowState>,
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Couldn(?:'|&#x27;)t load record/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(html, /not found/i);
});

test('only a terminal missing response renders record not-found', () => {
  for (const status of [404, 410]) {
    const html = renderToStaticMarkup(
      <EntityWindowState
        entity={null}
        isPending={false}
        isFetching={false}
        error={{ response: { status } }}
        onRetry={() => {}}
      >
        {(entity) => <div>{String(entity)}</div>}
      </EntityWindowState>,
    );

    assert.match(html, /Record not found/, String(status));
    assert.doesNotMatch(html, /Try again/, String(status));
  }
});

test('authentication and permission failures have distinct non-retry states', () => {
  const states = [
    [401, /Sign in required/],
    [403, /have access/],
  ] as const;

  for (const [status, copy] of states) {
    const html = renderToStaticMarkup(
      <EntityWindowState
        entity={null}
        isPending={false}
        isFetching={false}
        error={{ response: { status } }}
        onRetry={() => {}}
      >
        {(entity) => <div>{String(entity)}</div>}
      </EntityWindowState>,
    );

    assert.match(html, copy, String(status));
    assert.doesNotMatch(html, /Try again/, String(status));
    assert.doesNotMatch(html, /not found/i, String(status));
  }
});

test('a non-retryable client error does not offer a retry that cannot help', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={null}
      isPending={false}
      isFetching={false}
      error={{ response: { status: 422 } }}
      onRetry={() => {}}
    >
      {(entity) => <div>{String(entity)}</div>}
    </EntityWindowState>,
  );

  assert.match(html, /Couldn(?:'|&#x27;)t load record/);
  assert.doesNotMatch(html, /Try again|not found/i);
});


test('a query that will never run is a terminal state, not a spinner', () => {
  // A DISABLED TanStack query reports `status: "pending"` / `fetchStatus:
  // "idle"` — so `isPending` is true forever for a request that is never
  // going to be made. Three windows are opened that way: a `new-` draft with
  // no snapshot, a duplicate, and any window at all when the host never
  // called `setShellApiClient`. Reading `isPending` as "still loading" strands
  // every one of them on a spinner they cannot leave. `isLoading`
  // (`isPending && isFetching`) is the pair that already accounted for this,
  // which is why the inline check this component replaced did not have it.
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={null}
      isPending
      isFetching={false}
      enabled={false}
      error={null}
      onRetry={() => {}}
    >
      {() => <div>never</div>}
    </EntityWindowState>,
  );
  assert.match(html, /Record not found/);
  assert.doesNotMatch(html, /Loading record/);
});

test('the same pending flags with the query switched ON are still loading', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={null}
      isPending
      isFetching={false}
      enabled
      error={null}
      onRetry={() => {}}
    >
      {() => <div>never</div>}
    </EntityWindowState>,
  );
  assert.match(html, /Loading record/);
  assert.doesNotMatch(html, /not found/i);
});

test('enabled defaults to on, so an omitted flag never hides a live fetch', () => {
  const html = renderToStaticMarkup(
    <EntityWindowState entity={null} isPending isFetching={false} error={null} onRetry={() => {}}>
      {() => <div>never</div>}
    </EntityWindowState>,
  );
  assert.match(html, /Loading record/);
});

test('a disabled query that already failed still shows the failure', () => {
  // Disabling only means "do not start another one" — an error already in the
  // cache is still the truthful thing to show.
  const html = renderToStaticMarkup(
    <EntityWindowState
      entity={null}
      isPending
      isFetching={false}
      enabled={false}
      error={{ response: { status: 403 } }}
      onRetry={() => {}}
    >
      {() => <div>never</div>}
    </EntityWindowState>,
  );
  assert.doesNotMatch(html, /Loading record|Record not found/);
});
