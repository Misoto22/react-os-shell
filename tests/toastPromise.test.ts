/**
 * toast.promise — one toast for one async operation. The contracts:
 *
 *  - while pending: a sticky loading toast (role="status", no auto-dismiss);
 *  - on resolve: the loading toast goes, a success toast with the resolved
 *    message appears (message may be a function of the value);
 *  - on reject: an error toast (role="alert") with the CALLER'S message —
 *    there is deliberately no fallback that prints the exception itself;
 *  - the promise is returned untouched, so the caller's own error handling
 *    still runs.
 *
 * The module is imperative DOM (no React), so these specs drive it directly
 * against jsdom's document. Dismissal keeps the element for FADE_MS before
 * removing it, so "gone" is asserted as opacity 0 rather than absence.
 *
 * `act` is imported by NAME even though nothing here renders React: the
 * package marks itself side-effect-free (`sideEffects: ["**\/*.css"]`), so a
 * bare `import './dom'` is dead code to esbuild and the DOM globals never
 * land. A named import that is actually used keeps the module.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act } from './dom';
import toast from '../src/shell/toast';

const settle = (ms = 30) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const toasts = () => [...document.querySelectorAll<HTMLElement>('#toast-container > div')];
const visible = () => toasts().filter(t => t.style.opacity !== '0');

test('pending shows a sticky loading status; resolve swaps it for success', async () => {
  let resolve!: (v: number) => void;
  const p = new Promise<number>(r => { resolve = r; });
  const returned = toast.promise(p, {
    loading: 'Saving rows…',
    success: n => `Saved ${n} rows`,
    error: 'Save failed',
  });
  assert.equal(returned, p, 'the promise is returned untouched');
  await settle();
  const [loading] = visible();
  assert.match(loading.textContent!, /Saving rows…/);
  assert.equal(loading.getAttribute('role'), 'status');

  resolve(3);
  await settle();
  assert.equal(loading.style.opacity, '0', 'the loading toast is dismissed');
  const success = visible().find(t => /Saved 3 rows/.test(t.textContent!));
  assert.ok(success, 'the resolved value reaches the success message');
  assert.equal(success!.getAttribute('role'), 'status');
});

test('reject swaps it for the caller-written error alert', async () => {
  let reject!: (e: unknown) => void;
  const p = new Promise<void>((_, r) => { reject = r; });
  const returned = toast.promise(p, {
    loading: 'Deleting…',
    success: 'Deleted',
    error: 'Could not delete',
  });
  returned.catch(() => {}); // the caller's own handling — still their job
  reject(new Error('ECONNREFUSED 10.0.0.7')); // must never reach the screen
  await settle();
  const error = visible().find(t => /Could not delete/.test(t.textContent!));
  assert.ok(error, 'the error toast carries the written message');
  assert.equal(error!.getAttribute('role'), 'alert');
  assert.ok(!document.body.textContent!.includes('ECONNREFUSED'),
    'the raw exception must not leak into the UI');
});
