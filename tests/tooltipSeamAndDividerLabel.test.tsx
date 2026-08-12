import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, pressKey, act } from './dom';
import Tooltip from '../src/shell/Tooltip';
import Divider from '../src/shell/Divider';
import Checkbox from '../src/forms/Checkbox';
import Dialog from '../src/shell/Dialog';

/**
 * Three follow-ups to 4.25.0/4.26.0, all found reviewing that stack rather
 * than running it — each one is a fix that was written but did not reach the
 * user it was written for.
 *
 * The Tooltip one is the substantive one. Escape-to-dismiss was added on a
 * plain `document` listener, which loses inside a window: `Modal` listens on
 * `window` in the CAPTURE phase and stops propagation when it closes, and
 * capture runs window before document. So Escape closed the whole window and
 * the tooltip listener never ran — in the three portals that render tooltips
 * inside windows, which is where WCAG 1.4.13 actually bites.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/**
 * Open a tooltip by hovering its trigger, and wait out the delay.
 *
 * Dispatched on the trigger rather than on the wrapper: inside a `Dialog` the
 * container's first child is the backdrop, so a wrapper lookup finds the wrong
 * element and the tooltip never opens. The event bubbles to the wrapper either
 * way, which is where the handler lives.
 */
async function hover(view: ReturnType<typeof render>, selector = 'button') {
  const trigger = view.container.querySelector(selector)!;
  const win = view.container.ownerDocument.defaultView as Window & typeof globalThis;
  await act(async () => {
    trigger.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
  });
  return trigger;
}

// ── Tooltip: the interceptor seam ─────────────────────────────────────────

test('Tooltip: Escape still dismisses it with no shell mounted', async () => {
  // The case 4.25.0 got right, kept honest — moving onto the seam must not
  // cost the plain-page behaviour. Since 4.27.0 the Set drains itself, so a
  // till and a routed page are served by the same registration.
  const view = render(<Tooltip content="Download the CSV" delay={0}><button>Export</button></Tooltip>);
  await hover(view);
  assert.ok(view.container.querySelector('[role="tooltip"]'), 'open on hover');

  pressKey('Escape');
  assert.equal(view.container.querySelector('[role="tooltip"]'), null, 'Escape should close it');
  view.unmount();
});

test('Tooltip: Escape dismisses the tooltip and NOT the window around it', async () => {
  // The whole point. A Dialog registers on the same seam and is walked
  // most-recent-first, so the tooltip — registered later, when it opened —
  // consumes the first Escape and the dialog is left alone. Before this, the
  // dialog closed and the tooltip rode down with it.
  let closed = 0;
  const view = render(
    <Dialog open onClose={() => { closed += 1; }} title="Cancel order">
      <Tooltip content="Releases the reserved stock" delay={0}><button>Why?</button></Tooltip>
    </Dialog>,
  );
  // Unmounted in a `finally`: a failing assertion here would otherwise skip it
  // and leave the interceptor registered, which hangs the whole file on the
  // runner's timeout instead of reporting the assertion that actually broke.
  try {
    await hover(view);
    assert.ok(view.container.querySelector('[role="tooltip"]'), 'open on hover');

    pressKey('Escape');
    assert.equal(view.container.querySelector('[role="tooltip"]'), null, 'the tooltip goes');
    assert.equal(closed, 0, 'and the dialog stays — it is not what was dismissed');

    // The second Escape is the dialog's, now that nothing is in front of it.
    pressKey('Escape');
    assert.equal(closed, 1);
  } finally {
    view.unmount();
  }
});

test('Tooltip: a closed tooltip holds no interceptor', async () => {
  // Registration is scoped to `show`, so a page of hoverable controls is not a
  // page of Escape handlers — and a dialog behind them still gets its key.
  let closed = 0;
  const view = render(
    <Dialog open onClose={() => { closed += 1; }} title="Cancel order">
      <Tooltip content="Releases the reserved stock" delay={0}><button>Why?</button></Tooltip>
    </Dialog>,
  );
  pressKey('Escape');
  assert.equal(closed, 1, 'nothing hovered, so the dialog takes it');
  view.unmount();
});

test('Tooltip: an existing aria-describedby survives being wrapped', async () => {
  // `cloneElement` overwrites, so describing your own control and then wrapping
  // it in a Tooltip used to silently drop the original description.
  const view = render(
    <Tooltip content="At least 12 characters" delay={0}>
      <button aria-describedby="password-rules">Set password</button>
    </Tooltip>,
  );
  const button = view.container.querySelector('button')!;
  assert.equal(button.getAttribute('aria-describedby'), 'password-rules', 'kept while closed');

  await hover(view);
  const described = button.getAttribute('aria-describedby')!.split(' ');
  const tip = view.container.querySelector('[role="tooltip"]')!;
  assert.ok(described.includes('password-rules'), 'the caller keeps theirs');
  assert.ok(described.includes(tip.id), 'and the bubble is added, not substituted');
  view.unmount();
});

// ── Divider: the label is the accessible name ─────────────────────────────

test('Divider: the label actually names the separator', () => {
  // `separator` takes its name from the author only — it is not a
  // name-from-content role — so a label sitting inside the element was not the
  // separator's name. Without this the rule is announced unnamed.
  const markup = html(<Divider>Shipping</Divider>);
  const labelledBy = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
  assert.ok(labelledBy, 'the separator should point at its name');
  // The id it points at is the element holding the text, not one of the rules.
  assert.match(markup, new RegExp(`id="${labelledBy}"[^>]*>Shipping<`));
});

test('Divider: the rules either side stay decorative', () => {
  const markup = html(<Divider>Shipping</Divider>);
  assert.equal((markup.match(/aria-hidden="true"/g) ?? []).length, 2);
});

test('Divider: the unlabelled and vertical forms are untouched', () => {
  assert.equal(html(<Divider />), '<hr class="border-0 border-t border-gray-200 my-4"/>');
  assert.doesNotMatch(html(<Divider orientation="vertical" />), /aria-labelledby/);
});

// ── Checkbox: a stable ref ────────────────────────────────────────────────

test('Checkbox: the caller ref is not re-attached on an unrelated re-render', () => {
  // A fresh closure each render made React detach and reattach, so the caller
  // was handed null-then-node on every render of the parent. Memoising it means
  // the ref moves when the element does, and not otherwise.
  const seen: (HTMLInputElement | null)[] = [];
  const ref = (el: HTMLInputElement | null) => { seen.push(el); };

  const view = render(<Checkbox checked={false} onChange={() => {}} ref={ref} label="Include freight" />);
  const afterMount = seen.length;

  // Same `ref` identity, unrelated prop change.
  view.rerender(<Checkbox checked={false} onChange={() => {}} ref={ref} label="Include freight and duty" />);
  assert.equal(seen.length, afterMount, 'no detach/reattach cycle');
  assert.ok(seen.filter(Boolean).length > 0, 'and it did receive the input');
  view.unmount();
});
