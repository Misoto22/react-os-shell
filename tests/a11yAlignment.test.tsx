import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, pressKey, act } from './dom';
import Result from '../src/shell/Result';
import Divider from '../src/shell/Divider';
import Tooltip from '../src/shell/Tooltip';

/**
 * Three accessibility gaps, found by porting the dealer portal onto this kit:
 * its own versions of these components had the behaviour and the kit's did not,
 * so adopting the kit would have been a regression. Each one below is a real
 * defect against a specific criterion, not a style difference.
 *
 * Two things the port turned up that are deliberately NOT changed here, because
 * they are design decisions rather than defects: `Result`'s heading is an `h2`
 * (the portal used `h1`) — changing the level would rewrite the document
 * outline of three shipping portals — and a vertical `Divider` stays
 * `role="presentation"`, which its own docblock argues for.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// ── Result: WCAG 4.1.3 Status Messages ────────────────────────────────────

test('Result: a failure announces itself', () => {
  // It appears without the user moving focus. Without a live region a screen
  // reader says nothing at all, and the user waits for a page that already
  // failed.
  assert.match(html(<Result status="error" title="Failed to load inventory" />), /role="alert"/);
  assert.match(html(<Result status="500" title="Something went wrong" />), /role="alert"/);
});

test('Result: an expected or neutral outcome does not interrupt', () => {
  // `alert` is assertive — it cuts off whatever is being read. Right for a
  // failure, wrong for a completed checkout or an empty cart, which the user
  // either asked for or already knows about.
  for (const status of ['success', 'info', 'warning', '404', '403'] as const) {
    assert.doesNotMatch(html(<Result status={status} title="x" />), /role="alert"/, `${status} should stay quiet`);
  }
});

test('Result: the heading is still a heading', () => {
  // Pinned because the live-region change touches the same element.
  assert.match(html(<Result status="error" title="Failed to load inventory" />), /<h2[^>]*>Failed to load inventory<\/h2>/);
});

// ── Divider: the label case kept its semantics ────────────────────────────

test('Divider: a labelled rule is still a separator', () => {
  // The plain form is an <hr>, which carries the meaning by itself. Once there
  // is a label the <hr> cannot be used — and losing the element must not mean
  // losing what it meant.
  const markup = html(<Divider>Delivery</Divider>);
  assert.match(markup, /role="separator"/);
  assert.match(markup, /aria-orientation="horizontal"/);
  assert.match(markup, /Delivery/);
});

test('Divider: the rules either side are decoration', () => {
  const markup = html(<Divider>Delivery</Divider>);
  assert.equal((markup.match(/aria-hidden="true"/g) ?? []).length, 2);
});

test('Divider: the plain and vertical forms are unchanged', () => {
  assert.match(html(<Divider />), /<hr/);
  assert.match(html(<Divider orientation="vertical" />), /role="presentation"/);
});

// ── Tooltip: WCAG 1.4.13 Content on Hover or Focus ────────────────────────

test('Tooltip: the description lands on the trigger, not on the wrapper', async () => {
  // A screen reader announces the description of the element that HAS focus,
  // and focus lands on the trigger. On an ancestor it is not inherited, so the
  // tooltip was being read by nobody.
  const view = render(<Tooltip content="Download the CSV" delay={0}><button>Export</button></Tooltip>);
  const button = view.container.querySelector('button')!;
  const wrapper = view.container.firstElementChild!;

  await act(async () => {
    wrapper.dispatchEvent(new (view.container.ownerDocument.defaultView as Window & typeof globalThis).MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
  });

  const described = button.getAttribute('aria-describedby');
  assert.ok(described, 'the trigger should be described while the tooltip is open');
  // Compared by id rather than looked up with a selector: React's useId
  // produces `:r0:`, which is not a valid CSS selector without escaping.
  const tip = view.container.querySelector('[role="tooltip"]');
  assert.equal(described, tip?.id);
  // And NOT on the wrapper, which is where it used to be — an ancestor's
  // describedby is not inherited by the element that takes focus.
  assert.equal(wrapper.getAttribute('aria-describedby'), null);
  view.unmount();
});

test('Tooltip: Escape dismisses it', async () => {
  // A tooltip opened by HOVER holds no focus, so a keydown never reaches the
  // component — the dismissal is registered on the shell's Escape interceptor
  // seam, which also keeps it from losing to a Modal that would otherwise
  // close the whole window first. See tooltipSeamAndDividerLabel.test.tsx.
  const view = render(<Tooltip content="Download the CSV" delay={0}><button>Export</button></Tooltip>);
  const wrapper = view.container.firstElementChild!;

  await act(async () => {
    wrapper.dispatchEvent(new (view.container.ownerDocument.defaultView as Window & typeof globalThis).MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
  });
  assert.ok(view.container.querySelector('[role="tooltip"]'), 'open on hover');

  pressKey('Escape');
  assert.equal(view.container.querySelector('[role="tooltip"]'), null, 'Escape should close it');
  view.unmount();
});
