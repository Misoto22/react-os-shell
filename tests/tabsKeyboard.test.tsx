import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { render, act } from './dom';
import Tabs, { tabButtonId, tabPanelId } from '../src/shell/Tabs';

/**
 * The tab strip could not be operated by keyboard at all.
 *
 * It carried `tabIndex={active ? 0 : -1}` — the roving-tabindex half of the
 * ARIA tablist pattern, which deliberately makes the whole strip ONE tab stop
 * — but there was no key handler to do the roving. So Tab skipped every
 * inactive tab, the arrow keys did nothing, and a keyboard user reaching the
 * strip could not switch to another tab by any means. Three portals ship this.
 *
 * A stateful harness rather than a fixed `value`: the pattern moves selection
 * AND focus together, so asserting on focus alone would pass against a
 * component that moved focus and changed nothing.
 */

function Harness({ items, initial }: { items: React.ComponentProps<typeof Tabs>['items']; initial: string }) {
  const [value, setValue] = useState(initial);
  return <Tabs items={items} value={value} onChange={setValue} />;
}

const ITEMS = [
  { id: 'summary', label: 'Summary' },
  { id: 'lines', label: 'Lines' },
  { id: 'history', label: 'History' },
];

function press(el: Element, key: string): void {
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  act(() => {
    el.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

const tabs = (view: { container: HTMLElement }) =>
  Array.from(view.container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];

const selected = (view: { container: HTMLElement }) =>
  tabs(view).find(t => t.getAttribute('aria-selected') === 'true')?.textContent;

test('the arrow keys move between tabs', () => {
  const view = render(<Harness items={ITEMS} initial="summary" />);
  press(tabs(view)[0], 'ArrowRight');
  assert.equal(selected(view), 'Lines');

  press(tabs(view)[1], 'ArrowRight');
  assert.equal(selected(view), 'History');

  press(tabs(view)[2], 'ArrowLeft');
  assert.equal(selected(view), 'Lines');
  view.unmount();
});

test('focus follows the selection, so the next key press lands on the right tab', () => {
  // Without this the strip's single tab stop is left on a tab that is no
  // longer selected, and the next arrow press appears to jump.
  const view = render(<Harness items={ITEMS} initial="summary" />);
  press(tabs(view)[0], 'ArrowRight');
  assert.equal(view.container.ownerDocument.activeElement?.textContent, 'Lines');
  view.unmount();
});

test('the ends wrap', () => {
  const view = render(<Harness items={ITEMS} initial="summary" />);
  press(tabs(view)[0], 'ArrowLeft');
  assert.equal(selected(view), 'History', 'left from the first lands on the last');

  press(tabs(view)[2], 'ArrowRight');
  assert.equal(selected(view), 'Summary');
  view.unmount();
});

test('Home and End jump to the ends', () => {
  const view = render(<Harness items={ITEMS} initial="lines" />);
  press(tabs(view)[1], 'End');
  assert.equal(selected(view), 'History');

  press(tabs(view)[2], 'Home');
  assert.equal(selected(view), 'Summary');
  view.unmount();
});

test('a disabled tab is skipped, not landed on', () => {
  // It cannot take focus, so stopping there would strand the keyboard user on
  // a tab strip they can no longer leave by arrow key.
  const items = [
    { id: 'summary', label: 'Summary' },
    { id: 'lines', label: 'Lines', disabled: true },
    { id: 'history', label: 'History' },
  ];
  const view = render(<Harness items={items} initial="summary" />);
  press(tabs(view)[0], 'ArrowRight');
  assert.equal(selected(view), 'History');

  press(tabs(view)[2], 'ArrowRight');
  assert.equal(selected(view), 'Summary', 'and wraps past it in the other direction too');
  view.unmount();
});

test('End skips a disabled last tab', () => {
  const items = [
    { id: 'summary', label: 'Summary' },
    { id: 'lines', label: 'Lines' },
    { id: 'history', label: 'History', disabled: true },
  ];
  const view = render(<Harness items={items} initial="summary" />);
  press(tabs(view)[0], 'End');
  assert.equal(selected(view), 'Lines');
  view.unmount();
});

test('an all-disabled strip does nothing rather than hanging', () => {
  // The walk is bounded by the item count; an unbounded one spins forever on
  // this input, which is a legitimate empty state.
  const items = [
    { id: 'a', label: 'A', disabled: true },
    { id: 'b', label: 'B', disabled: true },
  ];
  const view = render(<Harness items={items} initial="a" />);
  press(tabs(view)[0], 'ArrowRight');
  assert.equal(selected(view), 'A');
  view.unmount();
});

test('an unrelated key is left alone', () => {
  // The strip must not swallow a shortcut the app is listening for.
  const view = render(<Harness items={ITEMS} initial="summary" />);
  const list = view.container.querySelector('[role="tablist"]')!;
  const win = list.ownerDocument.defaultView as Window & typeof globalThis;
  const event = new win.KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true });
  act(() => { list.dispatchEvent(event); });
  assert.equal(event.defaultPrevented, false);
  assert.equal(selected(view), 'Summary');
  view.unmount();
});

test('both variants get the keys', () => {
  // The two used to be separate return branches; the handler must not have
  // landed on only one of them.
  for (const variant of ['underline', 'pill'] as const) {
    function V() {
      const [value, setValue] = useState('summary');
      return <Tabs items={ITEMS} value={value} onChange={setValue} variant={variant} />;
    }
    const view = render(<V />);
    press(tabs(view)[0], 'ArrowRight');
    assert.equal(selected(view), 'Lines', variant);
    view.unmount();
  }
});

test('the strip is still one tab stop', () => {
  // The whole reason the arrow keys are needed. If this regresses to
  // tabIndex=0 everywhere the keys become redundant and the strip becomes N
  // stops in the page's tab order.
  const view = render(<Harness items={ITEMS} initial="lines" />);
  const order = tabs(view).map(t => t.tabIndex);
  assert.deepEqual(order, [-1, 0, -1]);
  view.unmount();
});

/**
 * The panel association.
 *
 * The strip is only ever the strip — the consumer renders the body — so ARIA's
 * tab/panel pair had no way to be completed: `role="tab"` carried no
 * `aria-controls`, the buttons had no ids for a panel to name itself with, and
 * nothing the consumer could pass would supply either. A screen-reader user
 * moving through the tabs was told nothing about what each one governs.
 *
 * One prop supplies both halves, through two exported helpers, so the two
 * strings cannot drift: the panel is rendered by the consumer, and agreeing on
 * an id by convention in a comment is exactly how that goes wrong.
 */

test('a tab points at its panel, and carries the id the panel names itself with', () => {
  const view = render(<Harness items={ITEMS} initial="summary" />);
  view.rerender(<Tabs items={ITEMS} value="summary" onChange={() => {}} idPrefix="order" />);

  const [first] = tabs(view);
  assert.equal(first.id, tabButtonId('order', 'summary'));
  assert.equal(first.getAttribute('aria-controls'), tabPanelId('order', 'summary'));
  view.unmount();
});

test('the two helpers never collide', () => {
  // They are used on the same page, on two elements, from the same inputs.
  assert.notEqual(tabButtonId('order', 'lines'), tabPanelId('order', 'lines'));
  assert.equal(tabButtonId('order', 'lines'), 'order-tab-lines');
  assert.equal(tabPanelId('order', 'lines'), 'order-panel-lines');
});

test('without idPrefix nothing is claimed', () => {
  // A strip used as a filter has no panel. Pointing aria-controls at an id
  // that does not exist is a dangling reference, not a helpful one — and the
  // strips already shipping are all in that shape.
  const view = render(<Harness items={ITEMS} initial="summary" />);
  for (const tab of tabs(view)) {
    assert.equal(tab.getAttribute('aria-controls'), null);
    assert.equal(tab.id, '');
  }
  view.unmount();
});

test('every tab is wired, not only the selected one', () => {
  // A screen reader reads the association while walking the strip, which
  // happens before anything is selected.
  const view = render(<Harness items={ITEMS} initial="summary" />);
  view.rerender(<Tabs items={ITEMS} value="summary" onChange={() => {}} idPrefix="order" />);
  assert.deepEqual(
    tabs(view).map(t => t.getAttribute('aria-controls')),
    ITEMS.map(i => tabPanelId('order', i.id)),
  );
  view.unmount();
});

test('the strip can be named', () => {
  // A page with two — order sections above, media types below — otherwise
  // gives a screen-reader user two "tab list"s with nothing to tell them
  // apart, and there was no way to pass a name at all.
  const view = render(<Harness items={ITEMS} initial="summary" />);
  view.rerender(<Tabs items={ITEMS} value="summary" onChange={() => {}} aria-label="Order sections" />);
  assert.equal(view.container.querySelector('[role="tablist"]')!.getAttribute('aria-label'), 'Order sections');

  view.rerender(<Tabs items={ITEMS} value="summary" onChange={() => {}} aria-labelledby="sections-heading" />);
  const list = view.container.querySelector('[role="tablist"]')!;
  assert.equal(list.getAttribute('aria-labelledby'), 'sections-heading');
  assert.equal(list.getAttribute('aria-label'), null, 'and only the one that was passed');
  view.unmount();
});

test('an icon does not become part of the tab name', () => {
  // A TabItem must have a label, so its icon is always supplementary. Left
  // exposed, a text or emoji icon is read as part of the name — "# Lines"
  // rather than "Lines" — and a screen-reader user hunting for "Lines" by
  // voice or by first letter does not find it.
  const items = [{ id: 'lines', label: 'Lines', icon: <span>#</span> }];
  const view = render(<Harness items={items} initial="lines" />);
  const [tab] = tabs(view);
  assert.equal(tab.querySelector('[aria-hidden="true"]')?.textContent, '#');
  assert.match(tab.textContent ?? '', /Lines/);
  view.unmount();
});
