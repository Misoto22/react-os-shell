/**
 * Input — a styled text `<input>`. A thin wrapper over the shared INPUT_BASE
 * look; it forwards its ref and spreads every native prop, so it drops into
 * `react-hook-form` via `register()` and works as a controlled or uncontrolled
 * field unchanged. Native dark-mode input styling applies automatically.
 */
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { inputClasses, type InputSize } from './styles';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> {
  /** Error state — red border + ring. */
  invalid?: boolean;
  /** Icon rendered inside the field's left edge (e.g. a search glyph). */
  leftIcon?: ReactNode;
  /** Content pinned to the field's right edge (e.g. a unit, a small action). */
  rightAdornment?: ReactNode;
  /**
   * `touch` gives a 56px field for a finger. Defaults to the desktop size.
   *
   * This shadows the native `size` attribute (a character count), which is
   * omitted above rather than left to collide — the width of a `w-full` field
   * has never come from that attribute here, so nothing loses a capability it
   * was using. Set `style`/`className` for width instead.
   */
  size?: InputSize;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leftIcon, rightAdornment, size, className = '', ...rest },
  ref,
) {
  const pad = `${leftIcon ? 'pl-9' : ''} ${rightAdornment ? 'pr-9' : ''}`.trim();
  const field = (
    // `inputMode` needs no plumbing — it rides the native spread onto the
    // <input>, which is how a till sets inputMode="none" to keep the OS
    // keyboard off the screen while its own keypad drives the field.
    <input
      ref={ref}

      aria-invalid={invalid || undefined}
      className={inputClasses({ invalid, size, className: [pad, className].filter(Boolean).join(' ') })}
      {...rest}
    />
  );

  if (!leftIcon && !rightAdornment) return field;
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</span>
      )}
      {field}
      {rightAdornment && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{rightAdornment}</span>
      )}
    </div>
  );
});

export default Input;
