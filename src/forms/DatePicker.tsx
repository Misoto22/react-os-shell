/**
 * DatePicker — one calendar date, on the platform's own date input.
 *
 * `DateRangePicker` is the other one: two dates, a rendered calendar, presets,
 * and its own placement logic. This is a native `<input type="date">` wearing
 * the kit's field styling — the browser supplies the calendar, so it also
 * supplies the locale, the keyboard behaviour and the mobile date wheel for
 * free, and there is nothing here to keep in step with any of them.
 *
 * ── Every date bug in this file is the same bug ──
 * `new Date('2026-08-11')` is UTC midnight, which is the 10th anywhere west of
 * Greenwich; `toISOString()` on a locally-built Date is the previous day
 * anywhere east of it. So this component never crosses that boundary: a bare
 * `YYYY-MM-DD` string is passed through untouched, a Date is serialised through
 * `toISODate` (which reads local calendar fields, and says so at length), and
 * the Date handed back to `onChange` is built from the three integers with the
 * local constructor. `DateRangePicker` learned this the same way.
 */
import { forwardRef, type InputHTMLAttributes } from 'react';

import { toISODate } from './DateRangePicker';
import { inputClasses, type InputSize } from './styles';

/** What a native date input speaks, and what this component stores. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DatePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  /** A Date, a `YYYY-MM-DD` string, or nothing. */
  value?: Date | string | null;
  /**
   * The chosen date at local midnight, or `null` when the field is empty.
   *
   * A native date input also reports `''` mid-entry, while a partly typed date
   * is not yet a date. Both arrive here as `null`: "no date yet" and "cleared"
   * are the same thing to a caller storing a value.
   */
  onChange?: (value: Date | null) => void;
  /** Earliest selectable date. */
  min?: Date | string | null;
  /** Latest selectable date. */
  max?: Date | string | null;
  /** Error state — red border + ring, matching Input. */
  invalid?: boolean;
  /** `touch` gives a 56px field for a finger. Defaults to the desktop size. */
  size?: InputSize;
  className?: string;
}

/**
 * Normalise anything the caller holds into what the input element wants.
 *
 * The `ISO_DATE` short-circuit is load-bearing rather than an optimisation: it
 * is what stops a string that is already correct from being round-tripped
 * through `new Date(...)` and coming back a day early.
 */
function toInputValue(value: Date | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : toISODate(value);
  if (ISO_DATE.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toISODate(parsed);
}

/** `YYYY-MM-DD` → local midnight. Built from the parts, never parsed as a string. */
function fromInputValue(raw: string): Date | null {
  if (!ISO_DATE.test(raw)) return null;
  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects 2026-02-31, which the constructor would happily roll into March.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, onChange, min, max, invalid, size, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="date"

      aria-invalid={invalid || undefined}
      value={toInputValue(value)}
      min={toInputValue(min) || undefined}
      max={toInputValue(max) || undefined}
      onChange={event => onChange?.(fromInputValue(event.target.value))}
      className={inputClasses({ invalid, size, className })}
      {...rest}
    />
  );
});

export default DatePicker;
