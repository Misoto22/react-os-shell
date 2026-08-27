import { act, flush, render } from './dom';
import { useEffect } from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AxiosInstance } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setShellApiClient } from '../src/api/client';
import { WindowManagerProvider, useWindowManager } from '../src/shell/WindowManager';
import { setShellWindowRegistry } from '../src/windowRegistry/types';

const ENTITY_TYPE = 'entity-window-loading-test';
const ENTITY_ID = 'speed';

setShellWindowRegistry({
  [ENTITY_TYPE]: {
    endpoint: '/designs/',
    title: (entity: { name: string }) => entity.name,
    render: (entity: { name: string }) => <div data-testid="entity-detail">{entity.name}</div>,
  },
});

function OpenEntityFromSearch() {
  const { openEntity } = useWindowManager();
  useEffect(() => {
    // Command K deliberately has no list-row snapshot.
    openEntity(ENTITY_TYPE, ENTITY_ID, null, 'Speed');
  }, [openEntity]);
  return <div id="taskbar-windows" />;
}

test('Command K entity stays in loading until its detail request resolves', async () => {
  let resolveRequest!: (response: {
    data: { name: string };
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: Record<string, never>;
  }) => void;
  const request = new Promise<Parameters<typeof resolveRequest>[0]>((resolve) => {
    resolveRequest = resolve;
  });
  setShellApiClient({
    get: () => request,
  } as unknown as AxiosInstance);
  localStorage.setItem('erp_open_windows', '[]');

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <WindowManagerProvider>
          <OpenEntityFromSearch />
        </WindowManagerProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

  await flush();
  await flush();

  assert.match(document.body.textContent ?? '', /Loading record/);
  assert.doesNotMatch(document.body.textContent ?? '', /not found/i);
  assert.ok(document.querySelector('[role="status"]'), 'the wait is announced');

  await act(async () => {
    resolveRequest({
      data: { name: 'Speed' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    await request;
  });
  await flush();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

  assert.match(document.body.textContent ?? '', /Speed/);
  assert.ok(document.querySelector('[data-testid="entity-detail"]'), 'the loaded detail replaces the wait');
  assert.doesNotMatch(document.body.textContent ?? '', /Loading record|not found/i);

  await act(async () => { view.unmount(); });
  queryClient.clear();
});
