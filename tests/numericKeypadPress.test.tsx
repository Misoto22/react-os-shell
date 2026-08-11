import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoot, act } from './dom';
import NumericKeypad from '../src/forms/NumericKeypad';

/**
 * A rejected keypress must notify nobody.
 *
 * `appendKey` returns the value unchanged when a press is not allowed — a third
 * decimal place, a second decimal point. Calling `onChange` with that unchanged
 * value reports a change that did not happen. On screen it is invisible: the
 * number is identical either way. What it corrupts is everything downstream
 * that reasonably treats "onChange fired" as "the user did something" — a dirty
 * flag, a cleared validation error, a reset idle timer.
 *
 * Found by the POS till's own keypad spec while migrating it onto this kit,
 * which had asserted `not.toHaveBeenCalled()` since before the kit existed.
 */

function mount(value: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const seen: string[] = [];
  act(() => { root.render(<NumericKeypad value={value} onChange={v => seen.push(v)} />); });
  const key = (label: string) =>
    [...host.querySelectorAll('button')].find(b => b.textContent === label)!;
  return { seen, key, unmount: () => { act(() => { root.unmount(); }); host.remove(); } };
}

test('a third decimal place changes nothing and reports nothing', () => {
  const k = mount('1.23');
  act(() => { k.key('4').click(); });
  assert.deepEqual(k.seen, []);
  k.unmount();
});

test('a second decimal point changes nothing and reports nothing', () => {
  const k = mount('1.5');
  act(() => { k.key('.').click(); });
  assert.deepEqual(k.seen, []);
  k.unmount();
});

test('backspace on an empty value reports nothing', () => {
  const k = mount('');
  act(() => { k.key('⌫').click(); });
  assert.deepEqual(k.seen, []);
  k.unmount();
});

test('an accepted press still reports, exactly once', () => {
  const k = mount('1.2');
  act(() => { k.key('5').click(); });
  assert.deepEqual(k.seen, ['1.25']);
  k.unmount();
});
