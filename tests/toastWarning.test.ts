import { flush } from './dom';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import toast from '../src/shell/toast';

// `flush` rather than a bare `import './dom'`: the runner bundles with esbuild,
// which drops a side-effect-only import of a module it believes to be pure —
// so the jsdom globals were never installed and every assertion here failed on
// `document is not defined`. Every other spec in this directory imports a
// binding and therefore never hit it.

/**
 * The kit had success, error and info. A portal reporting a partial outcome —
 * "saved, but the tax rate could not be refreshed" — had to pick between
 * `error`, which says the thing did not happen, and `info`, which says nothing
 * needs attention. Neither is true, and painting a warning in the error red
 * teaches people to stop reading the colour.
 */

const shown = () => document.getElementById('toast-container')?.textContent ?? '';
const swatch = () => document.getElementById('toast-container')?.querySelector('svg')?.getAttribute('stroke') ?? '';

afterEach(() => {
  document.getElementById('toast-container')?.remove();
  document.getElementById('toast-bottom-container')?.remove();
});

test('a warning reaches the screen', async () => {
  toast.warning('Saved, but the tax rate could not be refreshed');
  await flush();
  assert.match(shown(), /tax rate could not be refreshed/);
});

test('a warning is amber, not the error red', () => {
  toast.warning('Check the delivery date');
  const warning = swatch();
  document.getElementById('toast-container')?.remove();

  toast.error('Could not save');
  const error = swatch();

  assert.equal(warning, '#f59e0b');
  assert.notEqual(warning, error, 'a warning that looks like a failure is read as one');
});

test('the message is set as text, never as markup', () => {
  // Messages are routinely a server string — `response.message || '…'` — so
  // this is the difference between a toast and an injection point.
  toast.warning('<img src=x onerror="alert(1)">');
  const container = document.getElementById('toast-container')!;
  assert.equal(container.querySelector('img'), null);
  assert.match(container.textContent ?? '', /<img src=x/);
});

test('the other kinds are unchanged', () => {
  for (const [kind, colour] of [['success', '#22c55e'], ['error', '#ef4444'], ['info', '#3b82f6']] as const) {
    toast[kind](`a ${kind}`);
    assert.equal(swatch(), colour, kind);
    document.getElementById('toast-container')?.remove();
  }
});

test('a warning takes part in de-duplication', () => {
  // `dedupe` is opt-in, and the key is placement|variant|message — so a new
  // variant has to be threaded through it or a failing poll writes the same
  // warning a dozen times for the consumer that asked not to have that.
  //
  // A message no other spec uses: the live map outlives a spec, so a repeat of
  // wording seen earlier de-duplicates against an element this file's afterEach
  // has already pulled out of the document.
  toast.warning('Dedupe probe A', { dedupe: true });
  toast.warning('Dedupe probe A', { dedupe: true });
  assert.equal(document.getElementById('toast-container')!.children.length, 1);
});

test('and two different warnings still both appear', () => {
  // The key includes the message; de-duplication must not collapse the kind.
  toast.warning('Dedupe probe B', { dedupe: true });
  toast.warning('Dedupe probe C', { dedupe: true });
  assert.equal(document.getElementById('toast-container')!.children.length, 2);
});

/**
 * A toast appears without the user moving focus, so without a live region it
 * is announced to nobody — the same criterion (WCAG 4.1.3) that `Result` was
 * fixed against in 4.25.0. Every toast in every portal was silent.
 */

test('a toast announces itself', () => {
  toast.success('Order placed');
  const el = document.getElementById('toast-container')!.firstElementChild!;
  assert.equal(el.getAttribute('role'), 'status');
  assert.equal(el.getAttribute('aria-atomic'), 'true');
});

test('a failure interrupts; a confirmation does not', () => {
  // `alert` is assertive and cuts off whatever is being read. Right for
  // something that did not happen, wrong for one the user just asked for.
  toast.error('Could not place the order');
  assert.equal(document.getElementById('toast-container')!.firstElementChild!.getAttribute('role'), 'alert');
  document.getElementById('toast-container')?.remove();

  for (const kind of ['success', 'warning', 'info'] as const) {
    toast[kind](`a ${kind} that should not interrupt`);
    assert.equal(
      document.getElementById('toast-container')!.firstElementChild!.getAttribute('role'),
      'status',
      kind,
    );
    document.getElementById('toast-container')?.remove();
  }
});

test('the timer holds while the pointer rests on it', async () => {
  // Three seconds is enough to read a confirmation and not enough to read an
  // address someone leaned in for — and a toast that vanishes as you reach for
  // it cannot be re-read, because there is no history to open.
  toast.success('Saved to 13900 Valley Blvd, La Puente', { duration: 30 });
  const el = document.getElementById('toast-container')!.firstElementChild as HTMLElement;
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;

  el.dispatchEvent(new win.MouseEvent('mouseenter'));
  await new Promise(r => setTimeout(r, 60));
  assert.equal(el.isConnected, true, 'it must still be there after its duration passed');

  el.dispatchEvent(new win.MouseEvent('mouseleave'));
  await new Promise(r => setTimeout(r, 80));
  assert.equal(el.style.opacity, '0', 'and it leaves once the pointer does');
});
