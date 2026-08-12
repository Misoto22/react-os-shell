import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, act } from './dom';
import Checkbox from '../src/forms/Checkbox';
import Breadcrumbs from '../src/shell/Breadcrumbs';

/**
 * Two gaps found while porting the dealer portal onto this kit.
 *
 * The Checkbox one is a defect rather than a difference: `indeterminate` was
 * reaching the <input> through the props spread, which React cannot honour —
 * it is a DOM PROPERTY with no attribute form, so React set a bogus attribute,
 * logged a warning, and the box rendered as plain unchecked. A select-all
 * control had no way to show a partial selection at all.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// ── Checkbox ──────────────────────────────────────────────────────────────

test('Checkbox: a partial selection reaches the DOM property', () => {
  const view = render(<Checkbox checked={false} indeterminate onChange={() => {}} />);
  const input = view.container.querySelector('input')!;

  assert.equal(input.indeterminate, true, 'the property is what the browser reads');
  // And NOT as an attribute, which is what React was being asked to do before.
  assert.equal(input.getAttribute('indeterminate'), null);
  view.unmount();
});

test('Checkbox: it survives a re-render that rewrites checked', () => {
  // The reason `checked` is in the effect's deps: a browser clears
  // `indeterminate` whenever the checked state is assigned, and React assigns
  // it on every render. Without that dep the box goes blank on the next
  // unrelated update, which is a bug that only shows up later.
  const view = render(<Checkbox checked={false} indeterminate onChange={() => {}} />);
  const input = view.container.querySelector('input')!;
  assert.equal(input.indeterminate, true);

  view.rerender(<Checkbox checked indeterminate onChange={() => {}} />);
  assert.equal(input.indeterminate, true, 'still partial after checked changed');

  view.rerender(<Checkbox checked={false} indeterminate={false} onChange={() => {}} />);
  assert.equal(input.indeterminate, false, 'and clears when asked to');
  view.unmount();
});

test('Checkbox: omitting it is exactly what it always was', () => {
  assert.equal(
    html(<Checkbox checked onChange={() => {}} label="Include freight" />),
    html(<Checkbox checked indeterminate={false} onChange={() => {}} label="Include freight" />),
  );
});

test('Checkbox: the caller keeps its ref', () => {
  // Both refs are set — a form library focusing the field must still work.
  // Collected into an array rather than a `let`: assigning inside the callback
  // is invisible to TypeScript's control-flow analysis, which then narrows the
  // variable to `never` at the assertion.
  const seen: (HTMLInputElement | null)[] = [];
  const view = render(<Checkbox checked={false} indeterminate onChange={() => {}} ref={el => { seen.push(el); }} />);
  const node = seen.find(Boolean);
  assert.ok(node, 'the forwarded ref should receive the input');
  assert.equal(node.indeterminate, true, 'and the same element carries the property');
  view.unmount();
});

// ── Breadcrumbs ───────────────────────────────────────────────────────────

test('Breadcrumbs: a crumb with an href is a real link', () => {
  // A routed app needs this: an anchor can be middle-clicked into a new tab,
  // copied, and read off the status bar before committing — none of which a
  // button offers, however well it behaves once pressed.
  const markup = html(
    <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Catalogue' }]} />,
  );
  assert.match(markup, /<a[^>]*href="\/dashboard"/);
  assert.match(markup, /aria-current="page"[\s\S]*?Catalogue/);
});

test('Breadcrumbs: onClick alone still renders a button', () => {
  // The desktop shell has no URLs to point at, so this form has to stay.
  const markup = html(
    <Breadcrumbs items={[{ label: 'Files', onClick: () => {} }, { label: 'Reports' }]} />,
  );
  assert.match(markup, /<button[^>]*type="button"/);
  assert.doesNotMatch(markup, /<a[^>]*href/);
});

test('Breadcrumbs: an href crumb still calls onClick, so a router can intercept', () => {
  let intercepted = 0;
  const view = render(
    <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard', onClick: () => { intercepted += 1; } }, { label: 'Catalogue' }]} />,
  );
  const link = view.container.querySelector('a')!;
  act(() => { link.dispatchEvent(new (view.container.ownerDocument.defaultView as Window & typeof globalThis).MouseEvent('click', { bubbles: true })); });

  assert.equal(intercepted, 1);
  assert.equal(link.getAttribute('href'), '/dashboard', 'and the href stays, for the other click kinds');
  view.unmount();
});

test('Breadcrumbs: the last crumb is never a link, href or not', () => {
  const markup = html(
    <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Catalogue', href: '/inventory' }]} />,
  );
  // One anchor, not two: you are already here.
  assert.equal((markup.match(/<a /g) ?? []).length, 1);
});
