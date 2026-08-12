/**
 * IconButton — a button whose whole content is an icon.
 *
 * A separate component rather than a `Button` prop, for a reason that is
 * type-level and worth the file: an icon-only control has no accessible name
 * unless someone supplies one, and a REQUIRED `aria-label` in the props is the
 * only way to make forgetting it a compile error instead of a screen-reader
 * user's dead end. `Button` cannot require it — most buttons have text, which
 * names them for free.
 *
 * The size axis is square. `Button` sizes with horizontal padding, so it has no
 * icon-only form: a 32px button there is 32px tall and as wide as its content.
 * The rungs here match `Button`'s heights exactly (`md` is 32px in both), so a
 * row mixing the two lines up.
 *
 * It reuses `Button`'s base and variants — never its class string. Passing a
 * square size through `Button`'s `className` would put two competing padding
 * utilities in one attribute, and those resolve by compiled-stylesheet order
 * rather than by the order they were written, which is the trap documented at
 * length in forms/styles.ts. Composing here means only one size ever lands.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { BUTTON_BASE, BUTTON_VARIANTS, type ButtonSize, type ButtonVariant } from './Button';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  /** The icon. Sized by the caller — the kit does not resize what it is given. */
  children: ReactNode;
  /**
   * What the button does, in words. Required: there is no text to read, so
   * without this the control is unusable to anyone not looking at it.
   */
  'aria-label': string;
  /**
   * Defaults to `ghost`, where `Button` defaults to `primary`. An icon with no
   * label is almost always a secondary action — a row's overflow menu, a copy
   * affordance, a close — and a grid of solid blue squares is not what any of
   * those want. Ask for `primary` on the rare icon-only main action.
   */
  /**
   * `link` is excluded: it exists to shed the box, and a square icon button is
   * nothing but the box. Asking for it would produce a bare coloured glyph
   * with a 40px hit area it no longer draws.
   */
  variant?: Exclude<ButtonVariant, 'link'>;
  size?: ButtonSize;
  className?: string;
}

/**
 * Square, and matching `Button`'s heights rung for rung: `sm` is 24px in both
 * (py-1 either side of a 16px line box), `md` 32px, and the touch rungs carry
 * the same explicit heights for the same reason — a hit target has to be a
 * guaranteed size, not one implied by the current font.
 *
 * A Record keyed by the union, so a new ButtonSize member without an entry here
 * is a compile error rather than a silent fall-through.
 */
const SQUARE: Record<ButtonSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  'touch-sm': 'h-11 w-11',
  'touch': 'h-14 w-14',
  'touch-lg': 'h-16 w-16',
  'touch-xl': 'h-20 w-20',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { children, variant = 'ghost', size = 'md', type = 'button', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[BUTTON_BASE, BUTTON_VARIANTS[variant], SQUARE[size], 'shrink-0 p-0', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
