import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { INPUT_BASE, INPUT_SIZES, inputClasses } from '../src/forms/styles';
import { NativeSelect } from '../src/forms/Select';
import Textarea from '../src/forms/Textarea';

/**
 * `sm` and `lg` join the desktop ladder, which had only `md`.
 *
 * A form is not one size. A filter row wants controls smaller than the field
 * they filter; a sign-in page wants one control bigger than everything around
 * it. With only `md` on the desktop side, a consumer needing either had to
 * either reach for `touch` — which is 56px, sized for a finger on glass — or
 * append its own padding through `className`, which is the failure this
 * module's whole shape exists to prevent: two padding utilities in one class
 * attribute resolve by compiled-stylesheet order, not by the order they were
 * written.
 */

test('the desktop rungs differ from each other', () => {
  const { sm, md, lg } = INPUT_SIZES;
  assert.notEqual(sm, md);
  assert.notEqual(md, lg);
  // The failure mode of a size table is every rung collapsing to one value,
  // which reads as "sizes do nothing" rather than as a bug.
  assert.equal(new Set([sm, md, lg]).size, 3);
});

test('a desktop rung has no explicit height; the touch rung does', () => {
  // A text control's height should follow its own font — pin it and a long
  // label wraps out of the box. A hit target is the opposite: it needs a
  // guaranteed size regardless of what font it ends up with.
  for (const size of ['sm', 'md', 'lg'] as const) {
    assert.doesNotMatch(INPUT_SIZES[size], /\bh-\d/, size);
  }
  assert.match(INPUT_SIZES.touch, /h-14/);
});

test('the size is swapped in, never appended', () => {
  // The point of the whole module. If a rung were appended, the string would
  // carry both px-3 and px-3.5 and render one of them by stylesheet order.
  const large = inputClasses({ size: 'lg' });
  assert.match(large, /px-3\.5/);
  assert.doesNotMatch(large, /px-3(?!\.)/, 'the md padding must not survive alongside it');

  const small = inputClasses({ size: 'sm' });
  assert.match(small, /px-2\.5/);
  assert.doesNotMatch(small, /py-1\.5/);
});

test('omitting the size, or asking for md, is byte-identical to before', () => {
  // Every existing caller passes neither. This is the compatibility claim.
  const bare = inputClasses();
  assert.equal(inputClasses({ size: 'md' }), bare);
  assert.ok(bare.startsWith(INPUT_BASE), 'INPUT_BASE is still the default shape');
});

test('the invalid and disabled layers still apply at every rung', () => {
  for (const size of ['sm', 'md', 'lg', 'touch'] as const) {
    const cls = inputClasses({ size, invalid: true });
    assert.match(cls, /border-red-300/, size);
    assert.match(cls, /disabled:opacity-60/, size);
  }
});

test('the touch rung is untouched', () => {
  // The reason it is a separate rung and not the top of this ladder: 56px and
  // text-base, the latter by agreement with the (pointer: coarse) rule that
  // stops iOS zooming the viewport on focus.
  assert.equal(INPUT_SIZES.touch, 'h-14 px-4 text-base');
});

/**
 * Select and Textarea gain the rung too. Both already routed through
 * `inputClasses`; only the prop was missing, so a form could not be sized
 * consistently — an Input beside a Select would take `sm` and the Select
 * would not.
 */

test('Select shadows the native size attribute rather than colliding with it', () => {
  // `<select size>` is a NUMBER — the rows a list box shows. Left to the
  // spread, a rung would land in that numeric attribute. The kit's Select is a
  // dropdown and has never rendered as a list box, so nothing is lost; the
  // point is that the rung must not reach the DOM.
  const markup = renderToStaticMarkup(
    <NativeSelect value="a" onChange={() => {}} options={[{ value: 'a', label: 'A' }]} size="sm" />,
  );
  assert.doesNotMatch(markup, /size="/, 'no size attribute on the element');
  assert.match(markup, /px-2\.5/, 'and the rung reached the class string');
});

test('Textarea takes the rung', () => {
  const markup = renderToStaticMarkup(<Textarea size="lg" />);
  assert.match(markup, /px-3\.5/);
  assert.doesNotMatch(markup, /size="/);
});
