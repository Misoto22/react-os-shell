/**
 * The Escape-interceptor seam — deliberately a leaf that imports NOTHING.
 *
 * This lived inside `shell/Modal.tsx` until 4.16.0, and that one detail decided
 * what the whole package cost to import. `forms/Select.tsx` registers an
 * interceptor so Escape closes its portaled listbox instead of the window
 * around it — a two-line need — and reaching it through Modal pulled the entire
 * window manager into any bundle containing a dropdown: react-router-dom,
 * @tanstack/react-query, axios, @headlessui/react and @heroicons/react, plus
 * Modal's module-scope `localStorage` reads, which run at import time. An app
 * that wanted a text field and a select paid for a desktop it never rendered.
 *
 * Splitting the Set out is the whole fix: Modal and Select now both import this
 * file, and neither imports the other. `registerModalEscapeInterceptor` is
 * re-exported from Modal (and so from the package root) with the same binding
 * identity, so nothing downstream changes.
 *
 * NOTHING may be imported here — not React, not a type, not a sibling. The
 * moment it has an edge, every consumer of `react-os-shell/ui` inherits that
 * edge's transitive graph, which is exactly the failure this module exists to
 * prevent. `tests/uiEntryIsPeerFree.test.ts` enforces it.
 *
 * ── Escape interceptors ────────────────────────────────────────────────────
 * Window content can claim an Escape press before the topmost-modal handler
 * closes the window — e.g. the DXF Preview's measure tool exits AutoCAD-style
 * (clear the command input, then the tool, and only a further Esc closes the
 * window). Interceptors run in REVERSE registration order — most recently
 * registered first — and the first to return true consumes the event (the
 * modal neither closes nor sees it). An interceptor is global, so it must
 * check it belongs to the *active* modal itself (via `getActiveModalId()`)
 * before consuming.
 *
 * Reverse, because registration order tracks stacking order and Escape belongs
 * to whatever is on top. Two stacked `Dialog`s each register one; oldest-first
 * would hand Escape to the dialog UNDERNEATH and dismiss the wrong surface,
 * leaving the one the user is looking at on screen. This was invisible while
 * `ConfirmDialog` was the only multi-dialog registrant, because it registered
 * a single interceptor and hand-ordered its three dialogs inside it.
 *
 * Registrants that check `getActiveModalId()` are unaffected: at most one of
 * them can consume, so the order they are offered the event in cannot change
 * which one takes it.
 *
 * ── Draining the Set with no shell present ────────────────────────────────
 * This used to say that nothing draining the Set was fine, because a component
 * would handle Escape itself. That holds for `Select`, which has its own
 * `onKeyDown`. It did NOT hold for `Dialog`, which registers here and has no
 * other handler — so on a till or a routed portal, the two places `Dialog`
 * exists to serve, Escape did nothing at all.
 *
 * So the Set drains itself. The first registration attaches one document-level
 * capture listener; the last removal takes it away.
 *
 * It cannot double-fire when a shell IS present. `Modal` listens on `window`
 * in the capture phase, and capture runs window before document: Modal's
 * handler goes first, calls `runEscapeInterceptors`, and stops propagation when
 * one consumes — so this listener never sees the event. When Modal declines
 * (it is not the topmost window), this runs and the dialog floating above it
 * still gets its Escape, which is the right outcome anyway.
 *
 * Ordering across stacked dialogs is unchanged, because it is still the same
 * reverse walk deciding who consumes — not the listener that started it.
 */
const escapeInterceptors = new Set<(e: KeyboardEvent) => boolean>();

/**
 * The self-drain listener, attached while at least one interceptor is
 * registered. Kept in module scope rather than per-registration so N dialogs
 * share one listener and the reverse walk stays the only thing deciding who
 * consumes.
 */
let detachDrain: (() => void) | null = null;

function attachDrain(): void {
  // `document` is absent when this module is imported on a server; there is no
  // Escape to handle there, and registration still works for when it hydrates.
  if (detachDrain || typeof document === 'undefined') return;
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (runEscapeInterceptors(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  detachDrain = () => document.removeEventListener('keydown', onKeyDown, true);
}

/** Register an Escape interceptor; returns an unregister function. */
export function registerModalEscapeInterceptor(fn: (e: KeyboardEvent) => boolean): () => void {
  escapeInterceptors.add(fn);
  attachDrain();
  return () => {
    escapeInterceptors.delete(fn);
    if (escapeInterceptors.size === 0 && detachDrain) {
      detachDrain();
      detachDrain = null;
    }
  };
}

/** Run the registered interceptors, most recent first; true if one consumed
 *  the event. Internal to the shell — the window key handler calls this,
 *  consumers never do. */
export function runEscapeInterceptors(e: KeyboardEvent): boolean {
  // A Set iterates in insertion order and has no reverse iterator, so snapshot
  // it. The copy also makes the walk safe against an interceptor that
  // unregisters itself while handling the event — which is exactly what a
  // dialog closing on Escape does.
  const ordered = Array.from(escapeInterceptors);
  for (let i = ordered.length - 1; i >= 0; i--) {
    try {
      if (ordered[i](e)) return true;
    } catch { /* a broken interceptor must not block closing */ }
  }
  return false;
}
