import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import EmptyState from '../src/shell/EmptyState';

/**
 * `icon` was a boolean toggling one hardcoded inbox, so every empty state in
 * every app was an inbox — an empty catalogue, an empty invoice list and an
 * empty message drawer drawn identically. The icon is the fastest thing on the
 * screen to read, and it was the one part that said nothing about the page.
 *
 * It now also takes an element. The boolean behaviour is untouched, which
 * matters: every existing caller passes a boolean or nothing.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const INBOX = /M20 13V6a2 2/;

test('an element is used as the icon', () => {
  const markup = html(<EmptyState title="No wheels" icon={<svg data-testid="wheel" />} />);
  assert.match(markup, /data-testid="wheel"/);
  assert.doesNotMatch(markup, INBOX, 'and the placeholder is not drawn as well');
});

test('the boolean forms are exactly what they were', () => {
  assert.match(html(<EmptyState title="Nothing" />), INBOX, 'the default');
  assert.match(html(<EmptyState title="Nothing" icon />), INBOX);
  assert.doesNotMatch(html(<EmptyState title="Nothing" icon={false} />), INBOX);
  // `card` has always defaulted to no icon.
  assert.doesNotMatch(html(<EmptyState title="Nothing" variant="card" />), INBOX);
  assert.match(html(<EmptyState title="Nothing" variant="card" icon />), INBOX);
});

test('a falsy element still renders rather than falling back', () => {
  // The check is on the TYPE, not on truthiness. `icon={0}` is a caller
  // computing an icon and getting a surprising value; silently drawing an
  // inbox instead hides that from them.
  const markup = html(<EmptyState title="Nothing" icon={0} />);
  assert.doesNotMatch(markup, INBOX);
});

test('the icon is decoration either way', () => {
  // It repeats what the title already says. Announced, it is noise on the one
  // screen whose whole message is that there is nothing to read.
  assert.match(html(<EmptyState title="Nothing" />), /aria-hidden="true"/);
  assert.match(html(<EmptyState title="No wheels" icon={<svg />} />), /aria-hidden="true"/);
});

test('the rest of the layout is unchanged', () => {
  const markup = html(
    <EmptyState title="No orders" description="Orders you place appear here." icon={<svg />}>
      <button>Browse the catalogue</button>
    </EmptyState>,
  );
  assert.match(markup, /<h3[^>]*>No orders<\/h3>/);
  assert.match(markup, /Orders you place appear here\./);
  assert.match(markup, /Browse the catalogue/);
});
