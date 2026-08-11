/**
 * Focus containment and scroll locking for a modal surface — the two things
 * Headless UI was doing for `ConfirmDialog` before it was rewritten to import
 * nothing.
 *
 * Both are small, and both are the kind of small that is wrong in a way nobody
 * notices until someone navigates by keyboard: focus tabbing out of a dialog
 * onto the page behind it reads as the dialog having closed, and a page that
 * scrolls under a fixed overlay loses the user's place when it reopens.
 */
import { useEffect, type RefObject } from 'react';

/**
 * Focusable candidates, in DOM order. Deliberately excludes anything with
 * `tabindex="-1"` — that attribute means "focusable by script, skipped by Tab",
 * and treating it as a stop is the usual bug in a hand-rolled trap.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    // A hidden element still matches the selector. offsetParent is null for
    // anything display:none or inside it — cheap, and right for our markup.
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

/**
 * While `active`, keep Tab inside `ref`, move focus in on open, and restore it
 * to wherever it came from on close.
 *
 * Restoring matters more than trapping: a dialog opened from a button in a
 * toolbar should hand focus back to that button, or a keyboard user is dumped
 * at the top of the document and has to find their place again.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  initialFocus?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previous = document.activeElement as HTMLElement | null;

    // Focus the requested element, else the first natural stop, else the
    // container itself so the trap has somewhere to hold focus at all.
    const first = initialFocus?.current ?? focusable(root)[0] ?? root;
    if (first === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    first.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const stops = focusable(root);
      if (stops.length === 0) { e.preventDefault(); return; }
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];
      const current = document.activeElement;

      // Wrap at both ends. Also catches focus having escaped the dialog
      // entirely (current is outside root), which happens if something inside
      // was removed while focused.
      if (e.shiftKey && (current === firstStop || !root.contains(current))) {
        e.preventDefault();
        lastStop.focus();
      } else if (!e.shiftKey && (current === lastStop || !root.contains(current))) {
        e.preventDefault();
        firstStop.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // Only take focus back if it is still inside the dialog. If something
      // else claimed it in the meantime, stealing it back is the rude option.
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
      previous?.focus?.();
    };
  }, [ref, active, initialFocus]);
}

/**
 * While `active`, stop the document behind the overlay from scrolling.
 *
 * Compensates for the scrollbar's width so the page does not visibly jump
 * sideways as it locks — the artefact that makes a dialog feel cheap. Nested
 * locks are counted, so two stacked dialogs unlock exactly once.
 */
let lockCount = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (lockCount === 0) {
      restore = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const gap = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (gap > 0) body.style.paddingRight = `${gap}px`;
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0 && restore) {
        body.style.overflow = restore.overflow;
        body.style.paddingRight = restore.paddingRight;
        restore = null;
      }
    };
  }, [active]);
}
