import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoot, act } from './dom';
import InputNumber from '../src/forms/InputNumber';

/**
 * A controlled numeric field eats the number you are typing.
 *
 * The naive version stores `Number(e.target.value)` and renders it back. Type
 * "1." and it parses to 1, re-renders as "1", and the decimal point vanishes
 * under the cursor. The same happens to the "-" of a negative number and to a
 * trailing zero in "1.50". It passes any test that types "1.5" in one go — the
 * parsed result is identical — so it reaches production and is discovered by
 * someone entering a price.
 *
 * These specs type CHARACTER BY CHARACTER, which is the only way the bug shows.
 */

/**
 * Set an input's value the way a browser does, so React's own onChange fires.
 *
 * Assigning `input.value` directly is invisible to React — it tracks the last
 * value it wrote and skips the event as a no-op. The native setter has to be
 * called explicitly. Taken off the instance's prototype rather than a global
 * `HTMLInputElement`, which jsdom does not expose as a bare global here.
 */
function setValue(input: HTMLInputElement, next: string) {
  const proto = Object.getPrototypeOf(input) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) throw new Error('no native value setter on the input prototype');
  setter.call(input, next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function mount(initial: number | null = null) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const reported: (number | null)[] = [];
  let value = initial;

  const render = () => act(() => {
    root.render(
      <InputNumber
        value={value}
        onChange={v => { reported.push(v); value = v; render(); }}
        precision={undefined}
      />,
    );
  });
  render();

  const input = host.querySelector('input')!;
  const type = (text: string) => {
    // One character at a time, re-reading the field between each, exactly as a
    // person types. Typing the whole string at once hides the defect.
    for (const ch of text) {
      const next = input.value + ch;
      act(() => { setValue(input, next); });
    }
  };

  return {
    input,
    type,
    reported,
    blur: () => act(() => { input.dispatchEvent(new FocusEvent('blur', { bubbles: true })); }),
    unmount: () => { act(() => { root.unmount(); }); host.remove(); },
  };
}

test('typing a decimal point survives the keystroke that follows it', () => {
  const f = mount();
  f.type('1.');
  assert.equal(f.input.value, '1.', 'the point is still there');
  f.type('5');
  assert.equal(f.input.value, '1.5');
  assert.equal(f.reported.at(-1), 1.5);
  f.unmount();
});

test('a trailing zero is not swallowed while typing', () => {
  // "1.50" round-tripped through Number() renders as "1.5", deleting a zero
  // the user is still typing past.
  const f = mount();
  f.type('1.50');
  assert.equal(f.input.value, '1.50');
  assert.equal(f.reported.at(-1), 1.5);
  f.unmount();
});

test('a lone minus is a valid thing to have typed so far', () => {
  const f = mount();
  f.type('-');
  assert.equal(f.input.value, '-');
  assert.equal(f.reported.at(-1), null, 'it is not yet a number');
  f.type('4');
  assert.equal(f.reported.at(-1), -4);
  f.unmount();
});

test('non-numeric characters are refused rather than accepted and dropped', () => {
  const f = mount();
  f.type('12a3');
  assert.equal(f.input.value, '123');
  f.unmount();
});

test('a second decimal point is refused', () => {
  const f = mount();
  f.type('1.2.3');
  assert.equal(f.input.value, '1.23');
  f.unmount();
});

test('an emptied field reports null, not zero', () => {
  // Zero is a quantity someone chose. Empty is a question they have not
  // answered, and a form needs to tell those apart.
  const f = mount(5);
  act(() => { setValue(f.input, ''); });
  assert.equal(f.reported.at(-1), null);
  f.unmount();
});

test('the field is text with a numeric keyboard, not type=number', () => {
  // type="number" discards non-numeric input before React sees it (so the
  // buffer above could never hold "1."), scrolls on a stray wheel event, and
  // renders spinners that are a 12px hit target.
  const f = mount();
  assert.equal(f.input.getAttribute('type'), 'text');
  assert.equal(f.input.getAttribute('inputmode'), 'decimal');
  f.unmount();
});
