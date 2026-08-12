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

/**
 * A card header is usually a title AND something opposite it — a count, a
 * filter, a "View all". The header was a single slot, so the only way to place
 * both was to fold them into one node — which puts the second one inside the
 * heading.
 */

test('actions stay out of the heading', () => {
  // The whole reason for a second slot. Folded in, a card titled "Team
  // Members" with a "Team active" chip announces itself as "Team Members Team
  // active" — the string a heading list shows and a voice command must match.
  const view = render(
    <Card header="Team Members" headingLevel={2} headerActions={<span>Team active</span>}>
      rows
    </Card>,
  );
  const heading = view.container.querySelector('h2')!;
  assert.equal(heading.textContent, 'Team Members');
  assert.match(view.container.textContent ?? '', /Team active/, 'and it is still on screen');
  view.unmount();
});

test('the region is still named by the title alone', () => {
  const view = render(
    <Card header="Team Members" headingLevel={2} headerActions={<span>Team active</span>}>rows</Card>,
  );
  const region = view.container.firstElementChild!;
  const heading = view.container.querySelector('h2')!;
  assert.equal(region.getAttribute('aria-labelledby'), heading.id);
  view.unmount();
});

test('actions work without a heading level too', () => {
  const markup = html(<Card header="Recent orders" headerActions={<a href="/orders">View all</a>}>rows</Card>);
  assert.match(markup, /Recent orders/);
  assert.match(markup, /View all/);
  assert.doesNotMatch(markup, /<h[2-6]/, 'no heading was asked for');
});

test('a header with no actions is byte-identical to before', () => {
  // The flex row must not appear for the plain form, which is every card
  // shipping today.
  const markup = html(<Card header="Totals">x</Card>);
  assert.doesNotMatch(markup, /justify-between/);
});

test('the body takes classes of its own', () => {
  // The body is a wrapper this component owns, so `className` cannot reach it.
  // Without this, a card whose contents are a column with a gap has to nest a
  // div inside the one already there just to say so.
  const markup = html(<Card bodyClassName="flex flex-col gap-4">rows</Card>);
  assert.match(markup, /class="p-4 flex flex-col gap-4"/);
});

test('bodyClassName does not displace the padding', () => {
  // It is additive. Replacing p.body would make every caller that wants a gap
  // also responsible for the padding, silently.
  assert.match(html(<Card padding="lg" bodyClassName="grid">x</Card>), /class="p-6 grid"/);
  assert.match(html(<Card padded={false} bodyClassName="grid">x</Card>), /class="grid"/);
});

test('style reaches the surface', () => {
  // For what cannot be a class: an animation delay computed per item.
  assert.match(html(<Card style={{ animationDelay: '120ms' }}>x</Card>), /style="animation-delay:120ms"/);
});

test('style and the region element compose', () => {
  const view = render(<Card header="Totals" headingLevel={2} style={{ animationDelay: '60ms' }}>x</Card>);
  const region = view.container.firstElementChild as HTMLElement;
  assert.equal(region.tagName, 'SECTION');
  assert.equal(region.style.animationDelay, '60ms');
  view.unmount();
});

test('neither prop appears when it is not passed', () => {
  const markup = html(<Card>x</Card>);
  assert.doesNotMatch(markup, /style=/);
  assert.match(markup, /class="p-4"/, 'and the body class is exactly the padding');
});
