/**
 * Button — the kit's standard button. `primary` uses `bg-blue-600`, which the
 * theme system remaps to the active accent (and to a readable tone in dark
 * mode), so a primary button always follows the user's chosen accent.
 *
 * Controlled by the consumer like any native button (spread `onClick`, `type`,
 * `form`, …); the component only adds the look, a `loading` spinner state, and
 * optional icon slots.
 */
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * `ghost-danger` is a destructive action sitting in a row of ordinary ones —
 * Clear, Discard, Remove — where solid `danger` would be wrong. Two solid
 * shouting buttons on one screen means neither is read, so the destructive one
 * borrows `ghost`'s weight and keeps only the colour. The colour is the point:
 * it lets someone tell what the button costs WITHOUT reading it, which under
 * time pressure is what actually happens.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghost-danger' | 'danger';
/**
 * `sm`/`md` are the desktop scale. The `touch-*` rungs are for a finger on
 * glass — a till, a warehouse tablet — and are a SEPARATE ladder on purpose:
 * a till's idea of "medium" is 56px, and naming it `md` would have made the
 * same word mean two sizes depending on which app you were reading.
 *
 * Nothing picks a touch size automatically. An app that wants them asks for
 * them, so a desktop portal cannot grow finger-sized buttons by accident.
 */
export type ButtonSize = 'sm' | 'md' | 'touch-sm' | 'touch' | 'touch-lg' | 'touch-xl';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable the button while an action is in flight. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Stretch to the full width of the container. */
  block?: boolean;
  className?: string;
  /**
   * Why this button is disabled, rendered as text BESIDE it — never as a
   * `title` tooltip. A tooltip needs a hover, a touchscreen has no hover, and a
   * cashier facing a dead button with no explanation calls a manager.
   *
   * Only rendered while the button is actually disabled (or loading); ignored
   * otherwise, so it is safe to pass unconditionally. Note it changes the
   * rendered shape: the button gains a wrapper element, which matters to a
   * parent `flex gap-*` row or a `:first-child` selector.
   */
  disabledReason?: ReactNode;
}

/**
 * Shared with `IconButton`, which composes its own class string rather than
 * passing a square size through this component's `className` — two competing
 * padding utilities in one attribute resolve by compiled-stylesheet order, not
 * by the order they were written (the reasoning in forms/styles.ts applies
 * here identically).
 *
 * Package-internal on purpose: exported from the module so IconButton can share
 * it, deliberately absent from `src/ui/kit.ts` so it is not public API. A
 * consumer restyling a button is a consumer the theme system cannot reach.
 */
export const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
  'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-blue-400/40',
  secondary: 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-blue-400/30',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-400/30',
  'ghost-danger': 'text-red-600 hover:bg-red-50 focus:ring-red-400/30',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-400/40',
};

// A Record keyed by the union, not a ternary chain: adding a member without a
// size here is then a compile error rather than a silent fall-through to the
// default branch. The desktop two are byte-for-byte what they have always been,
// and `tests/buttonSizes.test.tsx` pins them against a captured literal.
//
// The touch rungs carry an explicit `h-*` where the desktop pair uses `py-*`.
// That is deliberate: a hit target has to be a guaranteed height, not a height
// implied by the current font size. They are separate map entries and never
// concatenated with each other, so no two competing utilities land in one class
// attribute.
const SIZES: Record<ButtonSize, string> = {
  sm: 'gap-1 px-2.5 py-1 text-xs',
  md: 'gap-1.5 px-3 py-1.5 text-sm',
  // 44px is the WCAG 2.5.5 floor, and a floor is not a comfortable size. Use it
  // ONLY for chrome that sits outside the task — switching screens, ending a
  // shift — and never on the path someone is actually working through. It
  // exists so a dense toolbar has something legitimate to reach for instead of
  // borrowing the desktop `sm`, which is half this height.
  'touch-sm': 'gap-1.5 h-11 px-4 text-base',
  'touch': 'gap-2 h-14 px-5 text-base',      // 56px — the comfortable default
  'touch-lg': 'gap-2 h-16 px-6 text-lg',     // 64px — primary action on a page
  'touch-xl': 'gap-3 h-20 px-8 text-2xl',    // 80px — keypad keys, tender
};

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, block = false,
    disabled, type = 'button', children, className = '', disabledReason, ...rest },
  ref,
) {
  // useId, not a module counter: a counter assigns different ids on the server
  // and the client and breaks hydration. Called unconditionally — it is a hook.
  const generatedId = useId();
  const isDisabled = disabled || loading;
  const showReason = isDisabled && disabledReason != null && disabledReason !== '';
  const reasonId = showReason ? generatedId : undefined;

  const button = (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-describedby={reasonId}
      className={[BUTTON_BASE, BUTTON_VARIANTS[variant], SIZES[size], block ? 'w-full' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );

  // No reason to show ⇒ the bare <button>, byte-identical to every release
  // before this prop existed. Only the disabled-with-a-reason case wraps.
  if (!showReason) return button;

  return (
    <span className={block ? 'flex w-full flex-col gap-1' : 'inline-flex flex-col items-start gap-1'}>
      {button}
      <span id={reasonId} className="text-xs text-red-600">{disabledReason}</span>
    </span>
  );
});

export default Button;
