/**
 * Switch — an on/off control that takes effect immediately.
 *
 * `Checkbox` is the one to use inside a form: it means "this will be true when
 * you save". A Switch means the change has already happened. Choosing the wrong
 * one tells the user the wrong thing about whether they still need to press
 * Save, so the distinction is worth keeping.
 *
 * Built on a real `<button role="switch">` with `aria-checked` rather than a
 * styled checkbox, because that is what the state actually is and it keeps
 * keyboard and screen-reader behaviour without further work.
 */
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type SwitchSize = 'sm' | 'md' | 'touch';

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type' | 'className'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  /** Text beside the control. Clicking it toggles, as a label should. */
  label?: ReactNode;
  /** A line under the label for what the setting actually does. */
  hint?: ReactNode;
  id?: string;
  className?: string;
}

const TRACK: Record<SwitchSize, string> = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
  touch: 'h-8 w-14',
};

const KNOB: Record<SwitchSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  touch: 'h-7 w-7',
};

// Travel = track width − knob width − 2× the 2px inset.
const TRAVEL: Record<SwitchSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  touch: 'translate-x-6',
};

/**
 * Forwards its ref, and spreads the rest onto the button.
 *
 * A form library hands a field three things: a change handler, a name, and a
 * ref it uses to move focus to the field when validation fails. The first was
 * here; the other two had nowhere to go, so this control could not be a form
 * field at all — which contradicts the kit's own guidance that its controls
 * drop into react-hook-form.
 */
const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch({
  checked, onChange, disabled = false, size = 'md', label, hint, id, className = '', ...rest
}, ref) {
  const generated = useId();
  const switchId = id ?? generated;
  const hintId = hint ? `${switchId}-hint` : undefined;

  const control = (
    <button
      ref={ref}
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={hintId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...rest}
      className={[
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-400/40',
        'disabled:cursor-not-allowed disabled:opacity-40',
        TRACK[size],
        checked ? 'bg-blue-600' : 'bg-gray-300',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block rounded-full bg-white shadow transition-transform',
          KNOB[size],
          checked ? TRAVEL[size] : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );

  if (!label && !hint) return <span className={className}>{control}</span>;

  return (
    <span className={`flex items-start gap-3 ${className}`.trim()}>
      {control}
      <span className="min-w-0">
        {label && (
          <label htmlFor={switchId} className="block text-sm font-medium text-gray-800">
            {label}
          </label>
        )}
        {hint && <span id={hintId} className="mt-0.5 block text-xs text-gray-500">{hint}</span>}
      </span>
    </span>
  );
});

export default Switch;
