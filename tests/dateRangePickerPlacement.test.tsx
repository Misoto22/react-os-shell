/**
 * Where the date-range panel opens (BG#00480, then UI-11).
 *
 * The panel used to be pinned to `right: 0`, so it always grew LEFTWARD from
 * the trigger. On the Customer window's Account Statement tab the trigger is
 * the first control in the filter bar, hard against the left edge of the window
 * body — and that body is `overflow-hidden`, so the overhang was not off to one
 * side, it was gone: no From box, no month/year header, no previous-month
 * arrow, and nothing to scroll to reach them. "The view is only the half
 * portion. I can't select properly the date that I want." Maximising did not
 * help, because the trigger stays pinned to the edge that moves.
 *
 * Since 4.91.0 the panel is portalled to <body> and placed by the kit's shared
 * `useDropdownPosition`, so the clip is gone entirely and the question is the
 * one UI-11 asks instead: does the panel stay inside the shell WINDOW that owns
 * the trigger, rather than spilling onto the desktop beside it.
 *
 * jsdom does no layout, so every rect is zero and the placement logic would
 * read nothing. The geometry is therefore supplied here, per element, by
 * selector. That is the honest shape of the test: the component's job is not to
 * measure, it is to DECIDE, and what it decides is asserted on the one thing
 * that reaches the browser — the inline placement on the panel.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, act } from './dom';
import DateRangePicker from '../src/forms/DateRangePicker';

/** A stubbed geometry, applied to the first selector that matches. */
interface Rect { selector: string; left: number; width: number; top?: number; height?: number }

let RECTS: Rect[] = [];

// Node's runner gives each spec file its own process, so patching the
// prototype here cannot leak into another file.
window.HTMLElement.prototype.getBoundingClientRect = function stubRect(this: HTMLElement) {
  const hit = RECTS.find((r) => this.matches(r.selector));
  const left = hit ? hit.left : 0;
  const width = hit ? hit.width : 0;
  const top = hit?.top ?? 0;
  const height = hit?.height ?? 0;
  return {
    x: left, y: top, left, right: left + width, width,
    top, bottom: top + height, height, toJSON: () => ({}),
  } as DOMRect;
};

/** The shell window's panel, spanning 100 … 1000 horizontally. */
const WINDOW_LEFT = 100;
const WINDOW_WIDTH = 900;
/** `VIEWPORT_MARGIN` in `dropdownPosition.ts`. */
const EDGE = 8;
/** The panel's own `preferredMaxWidth` — a calendar plus a preset column, not
 *  an option list's `POPUP_MAX_WIDTH`. */
const PANEL_MAX_WIDTH = 520;

/**
 * Mount the picker inside a shell window panel, with the trigger at
 * `triggerLeft`, and hand back the panel's inline placement once opened.
 */
function place(opts: { triggerLeft: number; triggerWidth: number; windowWidth?: number }) {
  const windowWidth = opts.windowWidth ?? WINDOW_WIDTH;
  RECTS = [
    { selector: '[data-modal-panel]', left: WINDOW_LEFT, width: windowWidth, top: 0, height: 600 },
    { selector: '.relative', left: opts.triggerLeft, width: opts.triggerWidth, top: 40, height: 36 },
  ];
  const { unmount } = render(
    <div data-modal-panel style={{ overflow: 'hidden' }}>
      <DateRangePicker from="" to="" onChange={() => {}} />
    </div>,
  );
  const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLElement;
  assert.ok(trigger, 'trigger button is rendered');
  act(() => { trigger.click(); });
  // Portalled to <body>, so it is not inside the render container.
  const panel = document.querySelector('[role="dialog"]') as HTMLElement;
  assert.ok(panel, 'panel opens');
  return {
    left: panel.style.left,
    right: panel.style.right,
    maxWidth: panel.style.maxWidth,
    position: panel.className.includes('fixed'),
    unmount,
  };
}

test('a trigger at the left of the window opens the panel rightward', () => {
  // Johna's case: first control in the filter bar, 8px in from the body edge.
  const triggerLeft = WINDOW_LEFT + 8;
  const { left, right, position, unmount } = place({ triggerLeft, triggerWidth: 140 });
  assert.equal(position, true, 'the panel is fixed-positioned, not clipped by the body');
  assert.equal(left, `${triggerLeft}px`, 'panel starts at the trigger');
  assert.equal(right, '', 'and is not pinned right');
  unmount();
});

test('a trigger near the right of the window keeps the panel inside it', () => {
  // 880 + 448 runs 328px past the window's right edge at 1000. Right-aligning
  // is what keeps it in, and the offset is measured from the VIEWPORT because
  // that is what a `position: fixed` `right` means.
  const { left, right, unmount } = place({ triggerLeft: 880, triggerWidth: 100 });
  assert.equal(left, '', 'panel is not pinned left');
  assert.equal(right, `${window.innerWidth - 980}px`, 'panel ends at the trigger');
  unmount();
});

test('a window narrower than the panel caps the panel, it does not overhang', () => {
  // 300px of window. The panel may not be 448 wide there, and the cap is what
  // says so — an uncapped `max-content` would draw straight over the desktop.
  const { maxWidth, unmount } = place({
    triggerLeft: WINDOW_LEFT + 8, triggerWidth: 140, windowWidth: 300,
  });
  assert.equal(maxWidth, `${300 - 2 * EDGE}px`);
  unmount();
});

test('a wide window lets the panel take its full preferred width', () => {
  const { maxWidth, unmount } = place({ triggerLeft: WINDOW_LEFT + 8, triggerWidth: 140 });
  assert.equal(maxWidth, `${PANEL_MAX_WIDTH}px`);
  unmount();
});

test('with no window around it, the panel is placed against the viewport', () => {
  // A routed page or a till: there is no `[data-modal-panel]` to belong to, so
  // the viewport is the bound — and a trigger near its right edge still flips.
  const triggerRight = window.innerWidth - 20;
  RECTS = [
    { selector: '.relative', left: triggerRight - 140, width: 140, top: 40, height: 36 },
  ];
  const { unmount } = render(
    <div><DateRangePicker from="" to="" onChange={() => {}} /></div>,
  );
  const trigger = document.querySelector('button[aria-haspopup="dialog"]') as HTMLElement;
  act(() => { trigger.click(); });
  const panel = document.querySelector('[role="dialog"]') as HTMLElement;
  assert.equal(
    panel.style.right, `${window.innerWidth - triggerRight}px`,
    'hung off the trigger\'s right edge, which is already inside the margin',
  );
  assert.equal(panel.style.left, '');
  unmount();
});
