/**
 * Tooltip — a frosted hover/focus bubble around its trigger, using the shared
 * glassStyle() so it matches the kit's menus and follows dark mode. Static
 * previews show only the trigger (the bubble appears on interaction), like
 * ShortcutHelp.
 */
import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { glassStyle } from '../utils/glass';
import { registerModalEscapeInterceptor } from './escapeInterceptors';

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Hover delay before showing, in ms. */
  delay?: number;
  children: ReactNode;
}

const SIDE_POS: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

export default function Tooltip({ content, side = 'top', delay = 200, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const open = () => { timer.current = window.setTimeout(() => setShow(true), delay); };
  const close = () => { window.clearTimeout(timer.current); setShow(false); };
  // Cancel a pending open if the trigger unmounts mid-delay.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // WCAG 1.4.13 — content shown on hover or focus has to be dismissible
  // without moving the pointer or the focus.
  //
  // Through the interceptor seam rather than a listener of this component's
  // own, for two reasons. A tooltip opened by HOVER holds no focus, so a
  // keydown never reaches the trigger — that rules out an `onKeyDown` here.
  // And a plain `document` listener loses inside a window: `Modal` listens on
  // `window` in the CAPTURE phase and calls `stopPropagation()` when it closes,
  // and capture runs window before document, so Escape closed the whole window
  // and this never ran. Three portals render tooltips inside windows, which is
  // where the rule matters most.
  //
  // The seam is the one place that gets both: `Modal` consults it before
  // closing, and since 4.27.0 the Set drains itself when no shell is mounted,
  // so a till and a routed page are covered by the same registration.
  //
  // Registration order is stacking order, walked most-recent-first, so a
  // tooltip opened inside a dialog consumes the first Escape and the dialog
  // takes the second — which is the order the user expects.
  useEffect(() => {
    if (!show) return;
    return registerModalEscapeInterceptor(event => {
      if (event.key !== 'Escape') return false;
      close();
      return true;
    });
  }, [show]);

  // `aria-describedby` belongs on the TRIGGER, not on this wrapper. A screen
  // reader announces the description of the element that has focus, and focus
  // lands on the trigger — a describedby on an ancestor is not inherited, so
  // the tooltip was being read by nobody. Cloning is the only way to reach an
  // element the caller passed in; a caller who passes a fragment or a string
  // still gets the wrapper form, which at least keeps the association in the
  // accessibility tree.
  //
  // Merged with whatever the trigger already had rather than assigned over it:
  // `cloneElement` overwrites, so a caller who describes their own control
  // (`<button aria-describedby="password-rules">`) lost that description as
  // soon as a tooltip was wrapped around it — and lost it permanently, since
  // the clone writes `undefined` while the bubble is closed.
  const describedBy = show ? id : undefined;
  const trigger = isValidElement<{ 'aria-describedby'?: string }>(children)
    ? cloneElement(children, {
        'aria-describedby':
          [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
      })
    : children;

  return (
    <span
      className="relative inline-flex"
      aria-describedby={isValidElement(children) ? undefined : describedBy}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
    >
      {trigger}
      {show && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute z-[300] whitespace-nowrap rounded-md px-2 py-1 text-xs text-gray-800 ${SIDE_POS[side]}`}
          style={glassStyle()}
        >
          {content}
        </span>
      )}
    </span>
  );
}
