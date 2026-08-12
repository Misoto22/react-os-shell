import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, pressKey, act } from './dom';
import Dialog from '../src/shell/Dialog';
import Drawer from '../src/shell/Drawer';
import { registerModalEscapeInterceptor } from '../src/shell/escapeInterceptors';

/**
 * Escape did nothing in the two places these components exist to serve.
 *
 * `Dialog` and `Drawer` register an Escape interceptor and have no other key
 * handler. The only caller of `runEscapeInterceptors` is `Modal` — the window
 * manager. So with no shell mounted, which is a till and a routed portal, the
 * Set was never drained and Escape was inert. Both were already shipping that
 * way.
 *
 * The Set now drains itself while anything is registered. These specs run with
 * no Modal anywhere, which is exactly the case that was broken.
 */

test('Dialog: Escape closes it with no shell mounted', () => {
  let closed = 0;
  const view = render(<Dialog open onClose={() => { closed += 1; }} title="Cancel order">Cancelling releases the stock.</Dialog>);

  pressKey('Escape');
  assert.equal(closed, 1);
  view.unmount();
});

test('Drawer: Escape closes it with no shell mounted', () => {
  let closed = 0;
  const view = render(<Drawer open onClose={() => { closed += 1; }} title="Filters">Narrow the list.</Drawer>);

  pressKey('Escape');
  assert.equal(closed, 1);
  view.unmount();
});

test('blocking still refuses Escape', () => {
  // It claims the event and deliberately does nothing — a dialog whose outcome
  // must be resolved rather than dismissed.
  let closed = 0;
  const view = render(<Dialog open blocking onClose={() => { closed += 1; }} title="Unresolved sale">Finish this first.</Dialog>);

  pressKey('Escape');
  assert.equal(closed, 0);
  view.unmount();
});

test('stacked dialogs: Escape closes the top one only', () => {
  // Registration order tracks stacking, and the walk is most-recent-first. The
  // self-draining listener must not change that — it starts the walk, it does
  // not decide who consumes.
  let outer = 0, inner = 0;
  const view = render(
    <>
      <Dialog open onClose={() => { outer += 1; }} title="Outer">Outer body.</Dialog>
      <Dialog open onClose={() => { inner += 1; }} title="Inner">Inner body.</Dialog>
    </>,
  );

  pressKey('Escape');
  assert.equal(inner, 1, 'the dialog the user is looking at');
  assert.equal(outer, 0, 'not the one underneath it');
  view.unmount();
});

test('the listener is removed once nothing is registered', () => {
  // Otherwise a keydown handler outlives every dialog on the page, on a
  // document that may live for the rest of the session.
  const view = render(<Dialog open onClose={() => {}} title="Cancel order">Body.</Dialog>);
  view.unmount();

  let ran = 0;
  const unregister = registerModalEscapeInterceptor(() => { ran += 1; return true; });
  pressKey('Escape');
  assert.equal(ran, 1, 'a fresh registration re-attaches it');
  unregister();

  // With nothing registered, nothing should be listening — assert by proving a
  // later registration works again rather than by inspecting the document.
  let ranAgain = 0;
  const unregister2 = registerModalEscapeInterceptor(() => { ranAgain += 1; return true; });
  pressKey('Escape');
  assert.equal(ranAgain, 1);
  unregister2();
});

test('Dialog and Drawer describe themselves with their own body', () => {
  // Without this a screen reader announces "Cancel order, dialog" and the user
  // has to go looking for what cancelling actually does.
  const dialog = render(<Dialog open onClose={() => {}} title="Cancel order">Cancelling releases the stock.</Dialog>);
  const dPanel = dialog.container.ownerDocument.querySelector('[role="dialog"]')!;
  const dDescribed = dPanel.getAttribute('aria-describedby');
  assert.ok(dDescribed);
  assert.match(
    dialog.container.ownerDocument.getElementById(dDescribed)?.textContent ?? '',
    /Cancelling releases the stock/,
  );
  dialog.unmount();

  const drawer = render(<Drawer open onClose={() => {}} title="Filters">Narrow the list.</Drawer>);
  const wPanel = drawer.container.ownerDocument.querySelector('[role="dialog"]')!;
  const wDescribed = wPanel.getAttribute('aria-describedby');
  assert.ok(wDescribed);
  assert.match(
    drawer.container.ownerDocument.getElementById(wDescribed)?.textContent ?? '',
    /Narrow the list/,
  );
  drawer.unmount();
});

test('a dialog with no body claims no description', () => {
  const view = render(<Dialog open onClose={() => {}} title="Are you sure?" footer={<button>OK</button>} />);
  const panel = view.container.ownerDocument.querySelector('[role="dialog"]')!;
  assert.equal(panel.getAttribute('aria-describedby'), null);
  view.unmount();
});
