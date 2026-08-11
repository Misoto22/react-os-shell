/**
 * The rules for typing a decimal amount on an on-screen keypad — pure string
 * functions, no React and no DOM.
 *
 * Split out for the same reason as `selectNav.ts`: these are the rules people
 * actually get wrong, and they are far easier to pin exhaustively as functions
 * than by rendering a keypad and firing clicks at it.
 *
 * A STRING, not a number, all the way through. `'1.'` and `'1.0'` are states a
 * user passes through while typing and neither survives a round trip through a
 * float — `'1.'` would become `1` and erase the decimal point the moment it was
 * pressed. The caller converts once, at the end, when it has a whole amount.
 */

/** Digits after the point. Two, because these are money amounts. */
export const MAX_FRACTION_DIGITS = 2;

/**
 * Apply one keypress. `key` is a digit `'0'`-`'9'` or `'.'`.
 * Returns the value unchanged when the press is not allowed, so a caller can
 * always assign the result — an ignored key is a no-op, never an error.
 */
export function appendKey(value: string, key: string): string {
  if (key === '.') {
    // A second point is meaningless, and a leading one is ambiguous — '.5'
    // reads as an error on a receipt where '0.5' does not.
    if (value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }

  if (key < '0' || key > '9') return value;

  const dot = value.indexOf('.');
  if (dot !== -1 && value.length - dot - 1 >= MAX_FRACTION_DIGITS) return value;

  // A leading zero is a placeholder, not a digit: pressing 5 at '0' means 5,
  // not 05. But '0.' is a real prefix and keeps accumulating.
  if (value === '0') return key;

  return value + key;
}

/** Remove the last character. Empty stays empty rather than underflowing. */
export function backspace(value: string): string {
  return value.slice(0, -1);
}
