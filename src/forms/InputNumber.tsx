/**
 * InputNumber — a numeric field that reports a `number | null`.
 *
 * The whole difficulty is that a number and the text of a number are not the
 * same thing while someone is typing one.
 *
 * A controlled field that stores `Number(e.target.value)` and renders it back
 * destroys every intermediate state: typing "1." parses to 1, re-renders as
 * "1", and the decimal point the user just pressed disappears. So does the "-"
 * of a negative number, and so does a trailing zero in "1.50". It looks correct
 * in review, it looks correct in a test that types "1.5" in one go, and it is
 * infuriating in use.
 *
 * So this keeps the RAW TEXT in local state and reports the parsed value
 * upward. The text is re-synced from the prop only when the prop describes a
 * different number than the text already does — which means a parent resetting
 * the field works, while a parent echoing back what the user typed does not
 * fight them mid-keystroke.
 *
 * Clamping is applied on BLUR, not on change: clamping while typing means
 * someone entering 25 into a field with `min={10}` gets their "2" rewritten to
 * "10" before they can press "5".
 */
import { forwardRef, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { inputClasses, type InputSize } from './styles';

export interface InputNumberProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Decimal places enforced on blur. */
  precision?: number;
  step?: number;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  size?: InputSize;
  /** Inside the field's edges — a currency mark, a unit. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  id?: string;
  name?: string;
  className?: string;
  onBlur?: () => void;
}

const format = (v: number | null, precision?: number): string =>
  v == null ? '' : precision != null ? v.toFixed(precision) : String(v);

/** Parses "", "-", "1." and "1.50" the way a half-typed number should be read. */
function parse(text: string): number | null {
  const t = text.trim();
  if (t === '' || t === '-' || t === '.' || t === '-.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const InputNumber = forwardRef<HTMLInputElement, InputNumberProps>(function InputNumber(
  { value, onChange, min, max, precision, step, disabled, invalid, placeholder,
    size, prefix, suffix, id, name, className = '', onBlur },
  ref,
) {
  const [text, setText] = useState(() => format(value, precision));
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    // Re-sync only when the incoming value is genuinely different from what the
    // text already represents. Comparing PARSED values, not strings, is what
    // stops "1." being overwritten while the user is still typing it.
    if (parse(textRef.current) !== value) setText(format(value, precision));
  }, [value, precision]);

  const handleChange = (next: string) => {
    // Digits, one optional leading minus, one optional point. Rejecting the
    // keystroke outright beats accepting it and silently dropping it later.
    if (next !== '' && !/^-?\d*\.?\d*$/.test(next)) return;
    setText(next);
    onChange(parse(next));
  };

  // A `type="number"` field gets arrow-key stepping from the browser. This one
  // does not, and dropping to `type="text"` must not cost the user a way to
  // adjust a quantity without reaching for the keyboard's digits. PageUp and
  // PageDown move by ten steps, which is the native behaviour too.
  const bump = (by: number) => {
    const from = parse(textRef.current) ?? 0;
    let next = from + by;
    if (min != null && next < min) next = min;
    if (max != null && next > max) next = max;
    // Round to the precision so repeated 0.1 steps do not accumulate float
    // noise into 0.30000000000000004.
    const places = precision ?? String(step ?? 1).split('.')[1]?.length ?? 0;
    next = Number(next.toFixed(places));
    setText(format(next, precision));
    onChange(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const unit = step ?? 1;
    const by = event.key === 'ArrowUp' ? unit
      : event.key === 'ArrowDown' ? -unit
      : event.key === 'PageUp' ? unit * 10
      : event.key === 'PageDown' ? -unit * 10
      : null;
    if (by === null || disabled) return;
    // The browser would otherwise scroll the page on PageUp/PageDown and move
    // the caret on the arrows.
    event.preventDefault();
    bump(by);
  };

  const handleBlur = () => {
    const parsed = parse(text);
    if (parsed == null) {
      setText('');
      onChange(null);
    } else {
      let v = parsed;
      if (min != null && v < min) v = min;
      if (max != null && v > max) v = max;
      // Round to the field's precision BEFORE reporting it. `format` was
      // already rounding for display, so a precision-2 field given 12.345
      // showed "12.35" and left the consumer holding 12.345 — a price field
      // that posts a different number from the one on screen.
      if (precision != null) v = Number(v.toFixed(precision));
      setText(format(v, precision));
      if (v !== parsed) onChange(v);
    }
    onBlur?.();
  };

  const field = (
    <input
      ref={ref}
      id={id}
      name={name}
      // `type="text"` with a numeric inputMode, not `type="number"`: a number
      // input silently discards non-numeric text (so the buffer above could
      // never see "1."), scrolls the value on a stray wheel event, and renders
      // spinners that are a 12px hit target.
      type="text"
      inputMode={precision === 0 ? 'numeric' : 'decimal'}
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      step={step}
      // The role is claimed only because the keys behind it are implemented —
      // an element that says spinbutton and ignores the arrows is worse than
      // one that says textbox and does the same.
      role="spinbutton"
      aria-valuenow={value ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      // A spinbutton's value is announced from aria-valuenow, which is a bare
      // number. This carries the formatting the user can see — "1,250.00" and
      // the currency the prefix is showing — so the two agree.
      aria-valuetext={value == null ? undefined : format(value, precision)}
      aria-invalid={invalid || undefined}
      onChange={e => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={inputClasses({
        invalid,
        size,
        className: [prefix ? 'pl-7' : '', suffix ? 'pr-9' : '', 'text-right tabular-nums', className]
          .filter(Boolean).join(' '),
      })}
    />
  );

  if (!prefix && !suffix) return field;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span>}
      {field}
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{suffix}</span>}
    </div>
  );
});

export default InputNumber;
