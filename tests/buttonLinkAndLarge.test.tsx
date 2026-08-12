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
  // Anchored: `/py-2/` also matches `py-2.5`, so the loose form could not tell
  // the 36px rung from the 40px one.
  assert.match(lg, /\bpy-2\.5\b/);
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
  assert.match(classOf(html(<IconButton aria-label="Close" size="lg">×</IconButton>)), /h-10 w-10/);
});

/**
 * The rung-for-rung promise, asserted as a RELATIONSHIP.
 *
 * `IconButton`'s docblock says "The rungs here match `Button`'s heights exactly
 * (`md` is 32px in both), so a row mixing the two lines up." Every spec above
 * pins the two sides separately — `py-2.5` here, `h-10` seventy lines away —
 * which is exactly how `lg` shipped at 36px against IconButton's 40px with the
 * suite green. Two independent assertions cannot catch a mismatch BETWEEN
 * them; only comparing the computed heights can.
 */

/** Tailwind's spacing scale is 4px per unit, so `h-10`/`py-2.5` are 40/10px. */
const px = (n: string) => Number(n) * 4;
/** The line box each text rung contributes, in px. */
const LEADING: Record<string, number> = {
  xs: 16, sm: 20, base: 24, lg: 28, xl: 28, '2xl': 32,
};

/** A control's height from its classes: an explicit `h-*` wins, else padding + line box. */
function heightOf(cls: string): number {
  const explicit = /\bh-([\d.]+)\b/.exec(cls);
  if (explicit) return px(explicit[1]);
  const py = /\bpy-([\d.]+)\b/.exec(cls);
  const text = /\btext-(xs|sm|base|lg|xl|2xl)\b/.exec(cls);
  assert.ok(py && text, `a desktop rung needs py-* and text-*, got: ${cls}`);
  return LEADING[text![1]] + 2 * px(py![1]);
}

const SIZES = ['sm', 'md', 'lg', 'touch-sm', 'touch', 'touch-lg', 'touch-xl'] as const;

test('every Button rung is the same height as the IconButton rung of that name', () => {
  for (const size of SIZES) {
    const button = heightOf(classOf(html(<Button size={size}>Save</Button>)));
    const icon = heightOf(classOf(html(<IconButton aria-label="Close" size={size}>×</IconButton>)));
    assert.equal(button, icon, `${size}: Button is ${button}px, IconButton is ${icon}px`);
  }
});

test('the desktop rungs climb, and stop below the touch floor', () => {
  // Ordering is the other half of "a ladder": lg has to sit above md and below
  // the 44px hit-target floor, or it is not a rung between them.
  const h = (size: (typeof SIZES)[number]) => heightOf(classOf(html(<Button size={size}>Save</Button>)));
  assert.ok(h('sm') < h('md'), `sm ${h('sm')} should be under md ${h('md')}`);
  assert.ok(h('md') < h('lg'), `md ${h('md')} should be under lg ${h('lg')}`);
  assert.ok(h('lg') < h('touch-sm'), `lg ${h('lg')} should stay under the 44px floor`);
});

test('a disabled link is still marked disabled', () => {
  const markup = html(<Button variant="link" disabled>Change</Button>);
  assert.match(markup, /disabled=""/);
  assert.match(classOf(markup), /disabled:opacity-60/);
});
