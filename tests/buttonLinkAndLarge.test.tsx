import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Button from '../src/forms/Button';
import IconButton from '../src/forms/IconButton';

/**
 * Two additions the dealer portal needed, both to the DESKTOP ladder — the
 * touch rungs are untouched and still have to be asked for by name.
 *
 * `lg` is the third desktop rung. `sm`/`md` alone left no room between a
 * dense toolbar button and a 44px hit target, so a page's primary action had
 * nothing to reach for.
 *
 * `link` is an action that belongs in running text. The interesting part is
 * that it cannot be built by overriding: `px-0` in a variant string does not
 * beat `px-3` from a size string — two padding utilities in one class
 * attribute resolve by compiled-stylesheet order, not by the order they were
 * written. So the link variant never RECEIVES the padding.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const classOf = (markup: string) => /class="([^"]*)"/.exec(markup)?.[1] ?? '';

test('lg sits between md and the touch rungs', () => {
  const md = classOf(html(<Button size="md">Save</Button>));
  const lg = classOf(html(<Button size="lg">Save</Button>));
  assert.notEqual(md, lg, 'a new rung has to actually differ');
  assert.match(lg, /px-4/);
  assert.match(lg, /py-2/);
  // And it is a DESKTOP rung: no explicit height, which is what separates the
  // two ladders. A hit target gets a guaranteed height; a desktop button's
  // height follows its text.
  assert.doesNotMatch(lg, /\bh-\d/);
});

test('the touch ladder is unchanged', () => {
  // The whole argument for two ladders is that a till's "medium" is 56px. A
  // desktop rung landing in the middle of them would undo that.
  assert.match(classOf(html(<Button size="touch">Tender</Button>)), /h-14/);
  assert.match(classOf(html(<Button size="touch-xl">9</Button>)), /h-20/);
});

test('link sheds the box rather than overriding it', () => {
  // The bug this avoids: `px-0` in the variant losing to `px-3` from the size,
  // silently, depending on stylesheet order. The padding is never applied.
  const link = classOf(html(<Button variant="link">Forgot your password?</Button>));
  assert.doesNotMatch(link, /\bpx-/, 'no horizontal padding at all');
  assert.doesNotMatch(link, /\bpy-/, 'nor vertical');
  assert.doesNotMatch(link, /rounded/, 'there is no box to round');
  assert.match(link, /hover:underline/);
});

test('link keeps the text size of the rung it was asked for', () => {
  // It sheds the padding, not the scale — a link beside a small field should
  // still read as small.
  assert.match(classOf(html(<Button variant="link" size="sm">Change</Button>)), /text-xs/);
  assert.match(classOf(html(<Button variant="link" size="md">Change</Button>)), /text-sm/);
});

test('every other variant still draws its box', () => {
  // Guards the branch: an accidental widening would flatten every button.
  for (const variant of ['primary', 'secondary', 'ghost', 'ghost-danger', 'danger'] as const) {
    const cls = classOf(html(<Button variant={variant}>Save</Button>));
    assert.match(cls, /rounded-md/, variant);
    assert.match(cls, /px-3/, variant);
  }
});

test('a link button is still a button', () => {
  // It looks like a link on purpose and is not one. Anything that navigates
  // should be an anchor; this is for actions that merely look quiet.
  const markup = html(<Button variant="link">Use a different address</Button>);
  assert.match(markup, /<button/);
  assert.doesNotMatch(markup, /<a[\s>]/);
});

test('IconButton gained the matching square rung', () => {
  // The Record is keyed by the union, so this is really asserting the two
  // ladders stayed rung-for-rung rather than that one entry exists.
  assert.match(classOf(html(<IconButton aria-label="Close" size="lg">×</IconButton>)), /h-10 w-10/);
});

test('a disabled link is still marked disabled', () => {
  const markup = html(<Button variant="link" disabled>Change</Button>);
  assert.match(markup, /disabled=""/);
  assert.match(classOf(markup), /disabled:opacity-60/);
});
