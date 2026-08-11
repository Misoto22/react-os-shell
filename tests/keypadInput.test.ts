import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendKey, backspace, MAX_FRACTION_DIGITS } from '../src/forms/keypadInput';

/**
 * The rules for typing money on a keypad. Every case below is one somebody
 * gets wrong, and each produces a wrong amount rather than an error — a keypad
 * that accepts `1.234` or `.5` or `05` hands a cashier a total they will not
 * notice is wrong until the drawer is counted.
 *
 * Ignored presses return the value UNCHANGED rather than throwing, so a caller
 * can always assign the result. That is what makes these safe to wire straight
 * to an onClick.
 */

test('digits accumulate', () => {
  assert.equal(appendKey('', '1'), '1');
  assert.equal(appendKey('1', '2'), '12');
  assert.equal(appendKey('12', '3'), '123');
});

test('a leading zero is a placeholder, not a digit', () => {
  // '0' then 5 means 5, not 05.
  assert.equal(appendKey('0', '5'), '5');
  // But '0.' is a real prefix and keeps accumulating.
  assert.equal(appendKey('0.', '5'), '0.5');
});

test('a bare decimal point is normalised to a leading zero', () => {
  // '.5' reads as a mistake on a receipt where '0.5' does not.
  assert.equal(appendKey('', '.'), '0.');
});

test('only one decimal point', () => {
  assert.equal(appendKey('1.5', '.'), '1.5');
  assert.equal(appendKey('0.', '.'), '0.');
});

test('at most two fraction digits, and the third press is a no-op', () => {
  assert.equal(MAX_FRACTION_DIGITS, 2);
  assert.equal(appendKey('1.2', '3'), '1.23');
  assert.equal(appendKey('1.23', '4'), '1.23');
  // Explicitly an unchanged value, not a thrown error or a truncation.
  assert.equal(appendKey('1.23', '4'), appendKey('1.23', '9'));
});

test('the integer part is not capped', () => {
  assert.equal(appendKey('123456', '7'), '1234567');
});

test('a non-key is ignored', () => {
  assert.equal(appendKey('1', 'a'), '1');
  assert.equal(appendKey('1', ''), '1');
});

test('backspace removes one character and empty stays empty', () => {
  assert.equal(backspace('1.23'), '1.2');
  assert.equal(backspace('1'), '');
  assert.equal(backspace(''), '');
});

test('backspacing past the point lets a new one be typed', () => {
  // The regression this guards: tracking "has a decimal" in separate state
  // rather than reading the string leaves the flag set after a backspace, and
  // the user can never type another point.
  assert.equal(appendKey(backspace('1.'), '.'), '1.');
});
