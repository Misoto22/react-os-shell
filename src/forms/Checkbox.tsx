/**
 * Checkbox — a styled native checkbox. Controlled via `checked` +
 * `onChange(checked)` (boolean, not the event — the kit idiom). When `label`
 * or `description` is given it renders inside a clickable `<label>` row.
 *
 * Uses `accent-blue-600`, which the theme system points at the active accent,
 * so the check fill follows the user's accent in both light and dark mode.
 */
import { forwardRef, useCallback, useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked' | 'className'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /**
   * Neither checked nor unchecked — the "some of the rows below are selected"
   * state on a select-all box.
   *
   * It has to be a prop because it cannot be an attribute: `indeterminate`
   * exists only as a DOM property, so passing it through JSX sets a bogus
   * attribute, logs "Received `true` for a non-boolean attribute", and leaves
   * the box looking unchecked. Set here through a ref instead.
   *
   * A native checkbox in this state reports itself as `mixed` to assistive
   * technology on its own, so no `aria-checked` is added — writing one would
   * risk contradicting the element.
   */
  indeterminate?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
}

const BOX =
  'h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600 focus:outline-none ' +
  'focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-60';

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, onChange, indeterminate = false, label, description, disabled, className = '', ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);

  // `checked` is in the deps as well: React writes it on every render, and a
  // browser clears `indeterminate` whenever the checked state is assigned. So
  // this has to run after that, not only when `indeterminate` itself changes.
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);

  // The caller's ref still has to work — it is how a form library focuses the
  // field — so both are set.
  //
  // Memoised on `ref`: React detaches and reattaches a callback ref whenever
  // its identity changes, so a fresh closure each render meant the caller's ref
  // was handed `null` and then the node again on EVERY render, unrelated to
  // anything it cares about. Stable identity means it is called when the
  // element actually changes and not otherwise.
  const attachRef = useCallback((node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  const input = (extra = '') => (
    <input
      ref={attachRef}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      className={`${BOX} ${extra}`.trim()}
      {...rest}
    />
  );

  if (!label && !description) {
    return input(className);
  }
  return (
    <label className={`flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`.trim()}>
      {input('mt-0.5')}
      <span className="text-sm leading-tight">
        {label && <span className="font-medium text-gray-700">{label}</span>}
        {description && <span className="mt-0.5 block text-xs text-gray-500">{description}</span>}
      </span>
    </label>
  );
});

export default Checkbox;
