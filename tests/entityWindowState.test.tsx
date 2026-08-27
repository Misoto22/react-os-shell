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
