import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, act, pressKey } from './dom';
import DropdownMenu from '../src/shell/DropdownMenu';

/**
 * `PopupMenu` is a surface: the caller positions it and decides when it
 * exists, which is right for a context menu summoned at a cursor. A dropdown
 * hangs off a control, and everything that makes it usable — where it lands,
 * when it closes, which item the arrows are on, where focus goes afterwards —
 * is the same wherever it appears, so it belongs here rather than beside each
 * trigger.
 *
 * These specs are the contract the portals' own dropdowns already met.
 */

const ITEMS = [
  { key: 'edit', label: 'Edit', onSelect: () => {} },
  { key: 'duplicate', label: 'Duplicate', onSelect: () => {} },
  { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
];

const open = (view: { container: HTMLElement }) => view.container.querySelector('[role="menu"]');
const items = (view: { container: HTMLElement }) =>
  [...view.container.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
const trigger = (view: { container: HTMLElement }) => view.container.querySelector('button')!;

function key(el: Element, k: string): boolean {
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const e = new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(e); });
  return e.defaultPrevented;
}

test('the trigger says what it opens, before it opens it', () => {
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  const t = trigger(view);
  assert.equal(t.getAttribute('aria-haspopup'), 'menu');
  assert.equal(t.getAttribute('aria-expanded'), 'false');
  assert.equal(t.getAttribute('aria-label'), 'Row actions', 'the trigger is an icon; it needs a name');
  assert.equal(open(view), null);
  view.unmount();
});

test('clicking opens it and points the trigger at it', () => {
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });

  const menu = open(view)!;
  assert.ok(menu);
  assert.equal(trigger(view).getAttribute('aria-expanded'), 'true');
  assert.equal(trigger(view).getAttribute('aria-controls'), menu.id);
  assert.deepEqual(items(view).map(i => i.textContent), ['Edit', 'Duplicate', 'Delete']);
  view.unmount();
});

test('the arrows move between items, and the menu is one tab stop', () => {
  // Roving tabindex: Tab reaches the menu, the arrows move inside it. Without
  // the roving half, Tab would walk every item on the way past.
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });

  assert.deepEqual(items(view).map(i => i.tabIndex), [0, -1, -1]);
  key(open(view)!, 'ArrowDown');
  assert.deepEqual(items(view).map(i => i.tabIndex), [-1, 0, -1]);
  key(open(view)!, 'ArrowUp');
  assert.deepEqual(items(view).map(i => i.tabIndex), [0, -1, -1]);
  view.unmount();
});

test('Home and End jump to the ends, and the ends wrap', () => {
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });

  key(open(view)!, 'End');
  assert.equal(items(view).findIndex(i => i.tabIndex === 0), 2);
  key(open(view)!, 'ArrowDown');
  assert.equal(items(view).findIndex(i => i.tabIndex === 0), 0, 'past the last is the first');
  key(open(view)!, 'ArrowUp');
  assert.equal(items(view).findIndex(i => i.tabIndex === 0), 2);
  view.unmount();
});

test('a disabled item is skipped rather than landed on', () => {
  // It cannot take focus, so stopping there strands the keyboard user inside
  // a menu they can no longer move within.
  const withDisabled = [
    ITEMS[0],
    { key: 'duplicate', label: 'Duplicate', disabled: true, onSelect: () => {} },
    ITEMS[2],
  ];
  const view = render(<DropdownMenu trigger="⋮" items={withDisabled} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });

  key(open(view)!, 'ArrowDown');
  assert.equal(items(view).findIndex(i => i.tabIndex === 0), 2, 'Duplicate is passed over');
  view.unmount();
});

test('opening with ArrowUp lands on the last item', () => {
  // Which is where the eye goes when a menu opens upward from the keyboard.
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  key(trigger(view), 'ArrowUp');
  assert.equal(items(view).findIndex(i => i.tabIndex === 0), 2);
  view.unmount();
});

test('choosing an item runs it once and closes', () => {
  const ran: string[] = [];
  const view = render(
    <DropdownMenu
      trigger="⋮"
      aria-label="Row actions"
      items={[{ key: 'edit', label: 'Edit', onSelect: () => ran.push('edit') }]}
    />,
  );
  act(() => { trigger(view).click(); });
  act(() => { items(view)[0].click(); });

  assert.deepEqual(ran, ['edit']);
  assert.equal(open(view), null);
  view.unmount();
});

test('a disabled item does nothing at all', () => {
  const ran: string[] = [];
  const view = render(
    <DropdownMenu
      trigger="⋮"
      aria-label="Row actions"
      items={[{ key: 'edit', label: 'Edit', disabled: true, onSelect: () => ran.push('edit') }]}
    />,
  );
  act(() => { trigger(view).click(); });
  act(() => { items(view)[0].click(); });
  assert.deepEqual(ran, []);
  view.unmount();
});

test('Escape closes it and gives focus back', () => {
  // Otherwise focus is on an element that no longer exists and the next Tab
  // starts from the top of the document.
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });
  assert.equal(key(open(view)!, 'Escape'), true);

  assert.equal(open(view), null);
  assert.equal(view.container.ownerDocument.activeElement, trigger(view));
  view.unmount();
});

test('Tab leaves, and does not leave the menu behind', () => {
  // A dropdown still open after the cursor has moved on is a stray overlay
  // sitting over whatever the user went to next.
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });
  key(open(view)!, 'Tab');
  assert.equal(open(view), null);
  view.unmount();
});

test('a click outside closes it without stealing focus back', () => {
  // Focus returns to the trigger when the user dismissed it deliberately; on a
  // click elsewhere it would drag them away from what they just clicked.
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });
  const doc = view.container.ownerDocument;
  const win = doc.defaultView as Window & typeof globalThis;
  // A MouseEvent of type `pointerdown`: jsdom ships no PointerEvent
  // constructor, and the listener reads the event's TYPE and target, not its
  // class — so this exercises the same path a real pointer does.
  act(() => { doc.body.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true })); });

  assert.equal(open(view), null);
  assert.notEqual(doc.activeElement, trigger(view));
  view.unmount();
});

test('an unrelated key is left for the app', () => {
  const view = render(<DropdownMenu trigger="⋮" items={ITEMS} aria-label="Row actions" />);
  act(() => { trigger(view).click(); });
  assert.equal(key(open(view)!, 'k'), false);
  assert.ok(open(view), 'and the menu stays');
  view.unmount();
});

void pressKey;
