import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from './dom';
import Card from '../src/shell/Card';

/**
 * A card with a title is a region of the page — the thing a screen-reader user
 * jumps between, and the thing a heading list is for. It rendered as a `div`
 * whose title was a bold `div`: it looked like a heading to everyone who could
 * see it and was invisible to everyone navigating by structure.
 *
 * Both halves are opt-in. Every card shipping today passes neither and is
 * unchanged, which the specs below pin rather than assume.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('a titled card is a region named by its heading', () => {
  const view = render(<Card header="Order summary" headingLevel={2}>4 items</Card>);
  const region = view.container.firstElementChild!;

  assert.equal(region.tagName, 'SECTION');
  const heading = region.querySelector('h2')!;
  assert.equal(heading.textContent, 'Order summary');
  assert.equal(region.getAttribute('aria-labelledby'), heading.id);
  assert.ok(heading.id, 'the heading needs an id for the name to point at');
  view.unmount();
});

test('the level is the caller\'s', () => {
  // A card inside a section that already has an h2 needs an h3. Guessing
  // produces a jumbled outline, which is worse than no outline.
  for (const level of [2, 3, 4, 5, 6] as const) {
    assert.match(html(<Card header="T" headingLevel={level}>x</Card>), new RegExp(`<h${level}`));
  }
});

test('the heading carries the header row styling, not a second box', () => {
  // Otherwise the title sits two elements deep and the border lands on the
  // wrapper rather than under the title.
  const markup = html(<Card header="Order summary" headingLevel={2}>x</Card>);
  assert.match(markup, /<h2[^>]*class="border-b[^"]*font-semibold/);
});

test('aria-label names a card that has no header', () => {
  // A card whose title lives outside it, or which has none.
  const view = render(<Card aria-label="Recent orders">rows</Card>);
  const region = view.container.firstElementChild!;
  assert.equal(region.tagName, 'SECTION');
  assert.equal(region.getAttribute('aria-label'), 'Recent orders');
  view.unmount();
});

test('a heading wins over aria-label rather than joining it', () => {
  // Two names on one element is a contradiction, not a belt and braces.
  const view = render(<Card header="Order summary" headingLevel={2} aria-label="Something else">x</Card>);
  const region = view.container.firstElementChild!;
  assert.equal(region.getAttribute('aria-label'), null);
  assert.ok(region.getAttribute('aria-labelledby'));
  view.unmount();
});

test('an unnamed card stays a plain div', () => {
  // The important one. A dashboard of twelve cards would otherwise become
  // twelve unnamed regions, which is worse for navigation than none — and
  // every card shipping today is in exactly this shape.
  const view = render(<Card header="Totals">x</Card>);
  const root = view.container.firstElementChild!;
  assert.equal(root.tagName, 'DIV');
  assert.equal(root.getAttribute('aria-labelledby'), null);
  assert.equal(root.getAttribute('aria-label'), null);
  assert.equal(root.querySelector('h2, h3, h4, h5, h6'), null, 'the header is still a div');
  view.unmount();
});

test('an empty aria-label does not conjure a region', () => {
  // An unnamed section is the exact thing this avoids, and `aria-label=""` is
  // what a caller interpolating a missing title produces.
  assert.equal(render(<Card aria-label="">x</Card>).container.firstElementChild!.tagName, 'DIV');
});

test('the surface, padding and footer are untouched', () => {
  const markup = html(<Card header="H" footer={<button>Save</button>} headingLevel={3}>body</Card>);
  assert.match(markup, /rounded-lg border border-gray-200 bg-white shadow-sm/);
  assert.match(markup, /border-t border-gray-100/);
  assert.match(markup, /Save/);
  // And the unpadded form still is.
  assert.match(html(<Card padded={false}>body</Card>), /rounded-lg/);
});

test('headingLevel without a header claims nothing', () => {
  // There is no title to name the region with, so it must not become an
  // unnamed section on the strength of the prop alone.
  const view = render(<Card headingLevel={2}>x</Card>);
  assert.equal(view.container.firstElementChild!.tagName, 'DIV');
  view.unmount();
});
