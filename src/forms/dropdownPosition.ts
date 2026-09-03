/**
 * Fixed-viewport dropdown positioning, shared by the combobox-style form
 * controls (SearchableSelect, TagInput, Select, DatePicker, DateRangePicker).
 * Promoted out of SearchableSelect verbatim when TagInput needed the identical
 * logic — the flip/track/clamp behaviour is the kind of thing that drifts when
 * copied, and it did: Select carried its own copy and DateRangePicker a third,
 * so the same trigger placed its menu differently depending on which control
 * was under it.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';

/** `max-w-[28rem]` on the menu, as a number for the fit math. */
export const POPUP_MAX_WIDTH = 448;
/** Menu's own max height (former `max-h-60` = 15rem). Capped smaller when the
 *  space it is allowed is tight. */
export const MENU_MAX_HEIGHT = 240;
/** Gap between the trigger and the menu, and the safety margin at every edge. */
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

export interface MenuPos {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  minWidth: number;
  /** Cap for a menu that grows to its content — never wider than it may go. */
  maxWidth: number;
  /** Set only for `matchTriggerWidth`: the menu is exactly this wide. */
  width?: number;
  maxHeight: number;
}

export interface DropdownPositionOptions {
  /**
   * The menu takes the trigger's width rather than growing to its longest
   * option. What a native `<select>` does, and what `Select` needs.
   */
  matchTriggerWidth?: boolean;
  /**
   * How wide and tall this popup would LIKE to be, before the owning window
   * has its say. The defaults suit an option list; a calendar panel is a fixed
   * composition rather than a scrolling list, and capping it at a list's 240px
   * scrolls its Apply button out of a window with 700px to spare.
   */
  preferredMaxWidth?: number;
  preferredMaxHeight?: number;
}

interface Bounds { left: number; right: number; top: number; bottom: number }

const viewportBounds = (): Bounds => ({
  left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight,
});

/**
 * The box an anchored popup has to stay inside (UI-11).
 *
 * A menu is portalled to `<body>` so an `overflow-hidden` ancestor cannot clip
 * it away. That escape is about clipping, not about ownership: the menu still
 * belongs to the shell window its trigger sits in, and a menu drawn over the
 * desktop beside that window belongs to nothing. So the bounds are the owning
 * window's panel — every shell window marks it `data-modal-panel` — intersected
 * with the viewport, because a window may itself be dragged half off screen.
 *
 * Falls back to the viewport when the trigger is not inside a window at all: a
 * routed page, a till, a login screen.
 *
 * A rect of zeros means the browser has not laid the panel out yet (and is all
 * jsdom ever reports), which says nothing about where the popup may go — so
 * treat it as "no window" rather than as a zero-sized one.
 */
export function popupBounds(trigger: Element | null | undefined): Bounds {
  const viewport = viewportBounds();
  const owner = trigger?.closest?.('[data-modal-panel]');
  if (!owner) return viewport;
  const rect = owner.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return viewport;
  return {
    left: Math.max(viewport.left, rect.left),
    right: Math.min(viewport.right, rect.right),
    top: Math.max(viewport.top, rect.top),
    bottom: Math.min(viewport.bottom, rect.bottom),
  };
}

/**
 * Compute the menu's fixed-viewport position from the trigger rect while the
 * dropdown is open, re-running on scroll (capture, so nested form-scroll
 * containers count), resize, and every animation frame the trigger moves so it
 * tracks a moving trigger. Anchors below the trigger by default, flips above
 * when below is cramped and above has more room, and flips to right-aligned
 * when the max width wouldn't fit to the right of the trigger's left edge.
 *
 * Every edge is measured against `popupBounds`, not the viewport, so the menu
 * stays inside the window that owns it.
 */
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  options: DropdownPositionOptions = {},
): MenuPos | null {
  const {
    matchTriggerWidth = false,
    preferredMaxWidth = POPUP_MAX_WIDTH,
    preferredMaxHeight = MENU_MAX_HEIGHT,
  } = options;
  const [pos, setPos] = useState<MenuPos | null>(null);
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    // Remember the last trigger rect the rAF poll acted on, so the idle loop
    // recomputes only when the trigger has actually moved.
    let lastLeft = NaN, lastTop = NaN, lastRight = NaN, lastBottom = NaN;
    const compute = () => {
      const trigger = triggerRef.current;
      const rect = trigger?.getBoundingClientRect();
      if (!rect) return;
      lastLeft = rect.left; lastTop = rect.top; lastRight = rect.right; lastBottom = rect.bottom;
      const bounds = popupBounds(trigger);

      const spaceBelow = bounds.bottom - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - bounds.top - MENU_GAP - VIEWPORT_MARGIN;
      const placeAbove = spaceBelow < Math.min(preferredMaxHeight, 160) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(96, Math.min(preferredMaxHeight, placeAbove ? spaceAbove : spaceBelow));

      // Room the popup is allowed at all, before any alignment decision.
      const roomWide = Math.max(0, bounds.right - bounds.left - 2 * VIEWPORT_MARGIN);
      const next: MenuPos = {
        minWidth: rect.width,
        maxWidth: Math.min(preferredMaxWidth, roomWide),
        maxHeight,
      };

      if (matchTriggerWidth) {
        // The menu is the WIDTH of the field, not a minimum for it.
        //
        // It was `minWidth` with nothing capping the other end, so the list
        // grew to its longest option: in a 512px dialog, a field of 464px
        // opened a menu of 583px that hung 95px past the dialog's edge. A
        // native <select> matches its field and truncates what does not fit,
        // and that is the shape people read a select as having.
        const width = Math.min(rect.width, roomWide);
        next.width = width;
        next.maxWidth = width;
        next.left = Math.min(
          Math.max(bounds.left + VIEWPORT_MARGIN, rect.left),
          bounds.right - VIEWPORT_MARGIN - width,
        );
      } else if (bounds.right - VIEWPORT_MARGIN - rect.left < next.maxWidth) {
        // No room to grow rightward from the trigger's left edge: hang the
        // menu off its right edge instead, pulled in far enough that the menu
        // ends inside the window rather than inside the viewport.
        const rightEdge = Math.min(rect.right, bounds.right - VIEWPORT_MARGIN);
        next.right = window.innerWidth - rightEdge;
        next.maxWidth = Math.min(
          next.maxWidth,
          Math.max(0, rightEdge - bounds.left - VIEWPORT_MARGIN),
        );
      } else {
        next.left = Math.max(bounds.left + VIEWPORT_MARGIN, rect.left);
      }

      if (placeAbove) next.bottom = window.innerHeight - rect.top + MENU_GAP;
      else next.top = rect.bottom + MENU_GAP;
      setPos(next);
    };
    compute();
    // Dragging a shell window moves the trigger via a CSS transform on an
    // ancestor — that fires neither scroll nor resize, so the listeners below
    // never see it and the menu would hang at its open-time spot while the
    // window slides out from under it. Poll the trigger rect each animation
    // frame and recompute when it shifts, so the menu tracks the window
    // through a drag (and any other transform-/animation-driven move). The
    // rect dirty-check keeps the idle loop cheap when nothing is moving.
    let raf = requestAnimationFrame(function tick() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect && (rect.left !== lastLeft || rect.top !== lastTop || rect.right !== lastRight || rect.bottom !== lastBottom)) {
        compute();
      }
      raf = requestAnimationFrame(tick);
    });
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [open, triggerRef, matchTriggerWidth, preferredMaxWidth, preferredMaxHeight]);
  return pos;
}
