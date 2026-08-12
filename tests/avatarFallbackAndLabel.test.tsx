import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, act } from './dom';
import Avatar from '../src/shell/Avatar';

/**
 * Three gaps found while porting the dealer portal onto this kit.
 *
 * The first is a defect: there was no `onError`, so an avatar whose URL had
 * gone away — a deleted upload, an expired CDN link, a host briefly down —
 * rendered the browser's broken-image glyph and kept it for the rest of the
 * session. The initials fallback existed but only for the no-src case, which
 * is the case that never fails.
 *
 * The other two are accessibility. An avatar showing initials was a bare
 * <span>, so it had no role and no name — a screen reader read "HC" instead of
 * who it was. And a nameless avatar rendered a literal "?", which is announced
 * as "question mark" rather than skipped.
 */

const fire = (el: Element, type: string) =>
  act(() => {
    el.dispatchEvent(new (el.ownerDocument.defaultView as Window & typeof globalThis).Event(type, { bubbles: false }));
  });

test('a broken image falls back to initials', () => {
  const view = render(<Avatar src="/uploads/gone.png" name="Henry Chen" />);
  const img = view.container.querySelector('img');
  assert.ok(img, 'the image is attempted first');

  fire(img, 'error');

  assert.equal(view.container.querySelector('img'), null, 'the broken image is dropped');
  assert.match(view.container.textContent ?? '', /HC/, 'and the initials take over');
  view.unmount();
});

test('a new src is given its own chance', () => {
  // Otherwise one bad URL poisons the component: the user uploads a working
  // photo and still sees their initials, because `broken` was never cleared.
  const view = render(<Avatar src="/uploads/gone.png" name="Henry Chen" />);
  fire(view.container.querySelector('img')!, 'error');
  assert.equal(view.container.querySelector('img'), null);

  view.rerender(<Avatar src="/uploads/new.png" name="Henry Chen" />);
  assert.ok(view.container.querySelector('img'), 'the replacement is tried');
  view.unmount();
});

test('an avatar is named after the person, photo or initials', () => {
  // The same announcement either way. Before this the initials form had no
  // role and no label at all, so it read as the two letters.
  for (const props of [{ src: '/dealers/42.png', name: 'Henry Chen' }, { name: 'Henry Chen' }]) {
    const view = render(<Avatar {...props} />);
    const el = view.container.firstElementChild!;
    assert.equal(el.getAttribute('role'), 'img');
    assert.equal(el.getAttribute('aria-label'), 'Henry Chen');
    view.unmount();
  }
});

test('the inner image is decoration, so the name is not read twice', () => {
  const view = render(<Avatar src="/dealers/42.png" name="Henry Chen" />);
  assert.equal(view.container.querySelector('img')!.getAttribute('alt'), '');
  view.unmount();
});

test('a nameless avatar is skipped rather than read as "question mark"', () => {
  const view = render(<Avatar />);
  const el = view.container.firstElementChild!;
  assert.equal(el.getAttribute('aria-hidden'), 'true');
  assert.equal(el.getAttribute('role'), null);
  // The "?" stays on screen — it is doing visual work. It is only the
  // announcement that was noise.
  assert.match(el.textContent ?? '', /\?/);
  view.unmount();
});

test('initials are still first and last, capped at two', () => {
  // Pinned because the label change touches the same element.
  const many = render(<Avatar name="Henry Wei Ming Chen" />);
  assert.match(many.container.textContent ?? '', /HC/);
  many.unmount();

  const one = render(<Avatar name="Henry" />);
  assert.match(one.container.textContent ?? '', /H/);
  one.unmount();
});
