/**
 * DropdownMenu — a trigger and the menu it opens.
 *
 * `PopupMenu` is the surface: the caller positions it and decides when it
 * exists, which is right for a context menu summoned at a cursor. A dropdown
 * hangs off a control instead, and everything that makes it usable — where it
 * lands, when it closes, which item the arrow keys are on, where focus goes
 * afterwards — is the same wherever it appears. So it lives here rather than
 * being written again beside each trigger.
 *
 * The surface is `PopupMenu`, so a dropdown and a context menu look the same
 * and follow the same `--menu-density`.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PopupMenu, PopupMenuItem } from './PopupMenu';
import { registerModalEscapeInterceptor } from './escapeInterceptors';

export type DropdownMenuAlign = 'start' | 'end';

export interface DropdownMenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  /** A destructive choice — delete, revoke. Drawn in the danger tone. */
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownMenuProps {
  /** What opens the menu. Rendered inside the trigger button. */
  trigger: ReactNode;
  items: DropdownMenuItem[];
  /** Which edge the menu lines up with. `end` (the default) suits a menu at
   *  the right of a row, where a left-aligned one would run off the card. */
  align?: DropdownMenuAlign;
  /** Names the trigger. Required in practice — the trigger is usually an icon. */
  'aria-label'?: string;
  className?: string;
  disabled?: boolean;
}

export default function DropdownMenu({
  trigger, items, align = 'end', 'aria-label': ariaLabel, className = '', disabled,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    // Focus goes back to the trigger unless the user clicked away, where
    // yanking it back would move them somewhere they did not ask to be.
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Walks from `from` until it finds an item that can take focus. Bounded by
  // the item count, so an all-disabled menu returns rather than spinning.
  const enabledFrom = (from: number, step: 1 | -1) => {
    for (let i = 0; i < items.length; i += 1) {
      const at = (((from + step * i) % items.length) + items.length) % items.length;
      if (!items[at]?.disabled) return at;
    }
    return from;
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, close]);

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  // Escape, through the shell's interceptor seam rather than an onKeyDown here.
  //
  // A bubble-phase handler cannot win: `Modal` listens for Escape on `window`
  // in the CAPTURE phase and calls stopPropagation() when it closes, and
  // capture runs window before the target — so inside any shell window,
  // Escape closed the whole window and this menu went down with it. The seam
  // is the one place Modal consults BEFORE closing, and since 4.27.0 it drains
  // itself where no shell is mounted, so a till and a routed page are covered
  // by the same registration. Same fix `Tooltip` took in 4.30.1.
  useEffect(() => {
    if (!open) return;
    return registerModalEscapeInterceptor(event => {
      if (event.key !== 'Escape') return false;
      close(true);
      return true;
    });
  }, [open, close]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(enabledFrom(0, 1));
    } else if (e.key === 'ArrowUp') {
      // Opening upward lands on the last item, which is where the eye goes.
      e.preventDefault();
      openAt(enabledFrom(items.length - 1, -1));
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(enabledFrom(active + 1, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(enabledFrom(active - 1, -1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(enabledFrom(0, 1)); }
    else if (e.key === 'End') { e.preventDefault(); setActive(enabledFrom(items.length - 1, -1)); }
    // Escape is deliberately absent: it is registered on the interceptor seam
    // above, because a bubble-phase handler here loses to Modal's window-level
    // capture listener and the whole window would close instead of the menu.
    else if (e.key === 'Tab') {
      // Tab leaves the menu rather than moving inside it, and the menu goes
      // with it — a dropdown left open behind the cursor is a stray overlay.
      //
      // Focus goes back to the TRIGGER, and the Tab is consumed rather than
      // also moving on. Letting it through looks more standard and is not:
      // the default action picks the next tabbable from whatever has focus
      // WHEN IT RUNS, which is still a menu item React has not unmounted yet,
      // so where the user lands depends on render timing. Consuming it costs
      // one more press and always ends somewhere they can see.
      e.preventDefault();
      close(true);
    }
  };

  const select = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    close(true);
    item.onSelect();
  };

  return (
    <div ref={wrapRef} className={`relative inline-flex ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close(false) : openAt(enabledFrom(0, 1)))}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {trigger}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-1 ${align === 'end' ? 'right-0' : 'left-0'}`}
          onKeyDown={onMenuKeyDown}
        >
          {/* `portal: false` — the menu is positioned against the trigger by
              this wrapper, so moving it to <body> would leave it at the top
              left of the page.

              No `onClose`: PopupMenu's own dismissal calls the same callback
              for Escape and for a click elsewhere, and those want opposite
              things. Escape is the user putting the menu away, so focus goes
              back to the trigger; a click elsewhere is them going somewhere,
              and dragging focus back would take them off what they just
              clicked. The handlers above tell the two apart. */}
          <PopupMenu portal={false} minWidth={180}>
            <div id={menuId} role="menu" aria-orientation="vertical" aria-label={ariaLabel}>
              {items.map((item, i) => (
                <PopupMenuItem
                  key={item.key}
                  ref={el => { itemRefs.current[i] = el; }}
                  role="menuitem"
                  // One tab stop for the whole menu; the arrows move inside it.
                  tabIndex={i === active ? 0 : -1}
                  danger={item.danger}
                  disabled={item.disabled}
                  onMouseEnter={() => { if (!item.disabled) setActive(i); }}
                  onClick={() => select(item)}
                >
                  {item.icon}
                  {item.label}
                </PopupMenuItem>
              ))}
            </div>
          </PopupMenu>
        </div>
      )}
    </div>
  );
}
