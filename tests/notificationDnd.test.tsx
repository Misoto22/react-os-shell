/**
 * NotificationBell Do Not Disturb — the badge keeps counting, the
 * interruptions stop. Contracts:
 *
 *  - with DND off, an unread-count increase shows the pop-up card;
 *  - with DND on, the same increase shows NOTHING — but the badge number
 *    still updates, because muting alerts must not hide their existence;
 *  - prevCount still advances under DND, so turning it off later does not
 *    replay the backlog (asserted via: bump under DND, disable DND, no card
 *    until the NEXT increase);
 *  - the popover carries the toggle, persisted through ShellPrefs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// First, and before anything that touches `src/` — see `dom.ts`.
import { act, render } from './dom';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationBell, { type ShellNotification } from '../src/shell/NotificationBell';
import { ShellPrefsProvider, type ShellPrefsAdapter } from '../src/shell/ShellPrefs';

const NOTIF: ShellNotification = {
  id: 'n1', title: 'Order approved', message: 'SO-1 was approved', is_read: false,
  created_at: new Date().toISOString(),
};

function makePrefs(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  return { store, adapter: { prefs: store, save: (p: Record<string, unknown>) => { Object.assign(store, p); } } as ShellPrefsAdapter };
}

let setCount: (n: number) => void = () => {};
function Host({ adapter }: { adapter: ShellPrefsAdapter }) {
  const [count, set] = useState(0);
  setCount = set;
  // One client, created once, with gc disabled: a client per render leaks a
  // five-minute gc timer per render, and node's test runner waits for every
  // one of them before exiting.
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchInterval: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <ShellPrefsProvider value={adapter}>
        <NotificationBell
          useUnreadCount={() => count}
          list={async () => ({ results: [NOTIF] })}
          markRead={async () => {}}
          markAllRead={async () => {}}
          onItemClick={() => {}}
        />
      </ShellPrefsProvider>
    </QueryClientProvider>
  );
}

const settle = () => act(async () => { await new Promise(r => setTimeout(r, 30)); });
const card = () => [...document.querySelectorAll('div')].find(d => d.textContent === 'Order approved' && d.className.includes('font-medium'));
const badge = (c: HTMLElement) => c.querySelector('button span');

test('DND off: an unread increase pops the card', async () => {
  const { adapter } = makePrefs();
  const view = render(<Host adapter={adapter} />);
  await settle();
  act(() => setCount(1));
  await settle();
  assert.ok(card(), 'the pop-up card should appear');
  assert.equal(badge(view.container)?.textContent, '1');
  await act(async () => { view.unmount(); });
});

test('DND on: no card, but the badge still counts — and no replay on unmute', async () => {
  const { store, adapter } = makePrefs({ notifications_dnd: true });
  const view = render(<Host adapter={adapter} />);
  await settle();
  act(() => setCount(1));
  await settle();
  assert.equal(card(), undefined, 'DND must suppress the pop-up');
  assert.equal(badge(view.container)?.textContent, '1', 'but the badge must keep counting');

  // Unmute. The already-counted notification must NOT replay...
  delete store.notifications_dnd;
  act(() => setCount(1));
  await settle();
  assert.equal(card(), undefined, 'no backlog replay on unmute');
  // ...while the NEXT increase pops normally.
  act(() => setCount(2));
  await settle();
  assert.ok(card(), 'the next notification interrupts again');
  await act(async () => { view.unmount(); });
});

test('the popover carries a persisted DND toggle', async () => {
  const { store, adapter } = makePrefs();
  const view = render(<Host adapter={adapter} />);
  act(() => { view.container.querySelector('button')!.click(); }); // open the bell
  await settle();
  const toggle = [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.getAttribute('aria-pressed') !== null);
  assert.ok(toggle, 'the DND toggle is in the popover');
  assert.equal(toggle!.getAttribute('aria-pressed'), 'false');
  act(() => { toggle!.click(); });
  assert.equal(store.notifications_dnd, true, 'the choice lands in prefs');
  await act(async () => { view.unmount(); });
});
