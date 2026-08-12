import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { render, act } from './dom';
import InputNumber from '../src/forms/InputNumber';

/**
 * Dropping to `type="text"` was right — a number input discards non-numeric
 * text so the buffer could never see "1.", scrolls the value on a stray wheel
 * event, and draws spinners with a 12px hit target — but it silently took two
 * things the browser had been providing for free: arrow-key stepping, and the
 * spinbutton role that announces a field's current value and its range.
 *
 * Someone adjusting a quantity had to select the text and retype it.
 *
 * The role is claimed only because the keys are implemented. An element that
 * says spinbutton and ignores the arrows is worse than one that says textbox
 * and does the same — the same mistake as a roving tabindex with no key
 * handler.
 */

function Harness(props: Partial<React.ComponentProps<typeof InputNumber>> & { initial?: number | null }) {
  const { initial = 0, ...rest } = props;
  const [value, setValue] = useState<number | null>(initial);
  return <InputNumber value={value} onChange={setValue} {...rest} />;
}

function press(el: Element, key: string): boolean {
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const event = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event.defaultPrevented;
}

const field = (view: { container: HTMLElement }) => view.container.querySelector('input')!;

test('the arrows step the value', () => {
  const view = render(<Harness initial={3} />);
  press(field(view), 'ArrowUp');
  assert.equal(field(view).value, '4');

  press(field(view), 'ArrowDown');
  press(field(view), 'ArrowDown');
  assert.equal(field(view).value, '2');
  view.unmount();
});

test('a step of less than one does not accumulate float noise', () => {
  // 0.1 + 0.1 + 0.1 is 0.30000000000000004. A price field that shows that has
  // lost the user's trust more thoroughly than one that is simply wrong.
  const view = render(<Harness initial={0} step={0.1} precision={2} />);
  for (let i = 0; i < 3; i += 1) press(field(view), 'ArrowUp');
  assert.equal(field(view).value, '0.30');
  view.unmount();
});

test('PageUp and PageDown move by ten steps', () => {
  const view = render(<Harness initial={0} step={5} />);
  press(field(view), 'PageUp');
  assert.equal(field(view).value, '50');
  press(field(view), 'PageDown');
  assert.equal(field(view).value, '0');
  view.unmount();
});

test('stepping stops at the bounds rather than passing them', () => {
  const view = render(<Harness initial={1} min={1} max={3} />);
  press(field(view), 'ArrowDown');
  assert.equal(field(view).value, '1', 'held at the floor');

  press(field(view), 'PageUp');
  assert.equal(field(view).value, '3', 'and at the ceiling');
  view.unmount();
});

test('an empty field steps from zero', () => {
  // Not from NaN, and not by refusing — a blank quantity that will not
  // increment reads as a broken control.
  const view = render(<Harness initial={null} />);
  press(field(view), 'ArrowUp');
  assert.equal(field(view).value, '1');
  view.unmount();
});

test('a disabled field does not step', () => {
  const view = render(<Harness initial={3} disabled />);
  press(field(view), 'ArrowUp');
  assert.equal(field(view).value, '3');
  view.unmount();
});

test('the keys the field uses are claimed; the rest are left alone', () => {
  // Without preventDefault the page scrolls on PageDown and the caret jumps on
  // the arrows. With too much of it, an app shortcut never arrives.
  const view = render(<Harness initial={3} />);
  assert.equal(press(field(view), 'ArrowUp'), true);
  assert.equal(press(field(view), 'PageDown'), true);
  assert.equal(press(field(view), 'k'), false);
  assert.equal(press(field(view), 'Enter'), false, 'a form must still submit');
  view.unmount();
});

test('it announces its value and its range', () => {
  const view = render(<Harness initial={12} min={1} max={99} />);
  const el = field(view);
  assert.equal(el.getAttribute('role'), 'spinbutton');
  assert.equal(el.getAttribute('aria-valuenow'), '12');
  assert.equal(el.getAttribute('aria-valuemin'), '1');
  assert.equal(el.getAttribute('aria-valuemax'), '99');
  view.unmount();
});

test('the announced text matches what is on screen', () => {
  // aria-valuenow is a bare number. A field showing "1250.00" that announces
  // "1250" is a mismatch the user cannot explain.
  const view = render(<Harness initial={1250} precision={2} />);
  assert.equal(field(view).getAttribute('aria-valuetext'), '1250.00');
  view.unmount();
});

test('an empty field announces no value at all', () => {
  const view = render(<Harness initial={null} />);
  assert.equal(field(view).getAttribute('aria-valuenow'), null);
  assert.equal(field(view).getAttribute('aria-valuetext'), null);
  view.unmount();
});

test('typing still works exactly as before', () => {
  // The buffer that lets "1." exist mid-keystroke is the reason this is a text
  // input at all; the stepping must not have disturbed it.
  const view = render(<Harness initial={null} precision={2} />);
  const el = field(view);
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const setValue = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!;
  for (const text of ['1', '1.', '1.5']) {
    act(() => {
      setValue.call(el, text);
      el.dispatchEvent(new win.Event('input', { bubbles: true }));
    });
    assert.equal(el.value, text, `"${text}" survives`);
  }
  view.unmount();
});

/**
 * The field showed one number and reported another.
 *
 * `format` rounded for display on blur, but the value handed to `onChange` was
 * the unrounded parse — and `onChange` only fired at all when clamping had
 * changed it. So a precision-2 field given 12.345 displayed "12.35" and left
 * the consumer holding 12.345. On a price, that is a posted order that does
 * not match the one the user read back before submitting.
 */

test('blur reports the number it displays', () => {
  const seen: (number | null)[] = [];
  function Priced() {
    const [value, setValue] = useState<number | null>(null);
    return (
      <InputNumber
        value={value}
        precision={2}
        onChange={v => { seen.push(v); setValue(v); }}
      />
    );
  }
  const view = render(<Priced />);
  const el = field(view);
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const setValue = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!;

  act(() => {
    setValue.call(el, '12.345');
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  });
  act(() => { // React delegates onBlur from focusout — plain blur does not bubble,
    // so dispatching it reaches nobody.
    el.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true })); });

  assert.equal(el.value, '12.35');
  assert.equal(seen.at(-1), 12.35, 'and the consumer holds the same number');
  view.unmount();
});

test('a field with no precision is left alone', () => {
  // Without `precision` there is no rounding to agree with, and a quantity
  // field must not silently become an integer.
  const seen: (number | null)[] = [];
  function Loose() {
    const [value, setValue] = useState<number | null>(null);
    return <InputNumber value={value} onChange={v => { seen.push(v); setValue(v); }} />;
  }
  const view = render(<Loose />);
  const el = field(view);
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const setValue = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(el, '12.345');
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  });
  act(() => { // React delegates onBlur from focusout — plain blur does not bubble,
    // so dispatching it reaches nobody.
    el.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true })); });

  assert.equal(el.value, '12.345');
  assert.equal(seen.at(-1), 12.345);
  view.unmount();
});

test('clamping and rounding compose', () => {
  const seen: (number | null)[] = [];
  function Bounded() {
    const [value, setValue] = useState<number | null>(null);
    return (
      <InputNumber value={value} precision={1} max={9.94}
        onChange={v => { seen.push(v); setValue(v); }} />
    );
  }
  const view = render(<Bounded />);
  const el = field(view);
  const win = el.ownerDocument.defaultView as Window & typeof globalThis;
  const setValue = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(el, '50');
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
  });
  act(() => { // React delegates onBlur from focusout — plain blur does not bubble,
    // so dispatching it reaches nobody.
    el.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true })); });

  // Clamped to 9.94, then rounded to one place — and the two agree.
  assert.equal(el.value, '9.9');
  assert.equal(seen.at(-1), 9.9);
  view.unmount();
});
