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
 * window). Interceptors run in registration order; the first to return true
 * consumes the event (the modal neither closes nor sees it). An interceptor
 * is global, so it must check it belongs to the *active* modal itself (via
 * `getActiveModalId()`) before consuming.
 *
 * With no Modal mounted nothing drains this Set, and that is correct rather
 * than merely harmless: a registered interceptor simply never runs, and the
 * component's own `onKeyDown` handles Escape — which is what `Select` already
 * documents and does on a plain page.
 */
const escapeInterceptors = new Set<(e: KeyboardEvent) => boolean>();

/** Register an Escape interceptor; returns an unregister function. */
export function registerModalEscapeInterceptor(fn: (e: KeyboardEvent) => boolean): () => void {
  escapeInterceptors.add(fn);
  return () => { escapeInterceptors.delete(fn); };
}

/** Run the registered interceptors; true if one consumed the event. Internal
 *  to the shell — the window key handler calls this, consumers never do. */
export function runEscapeInterceptors(e: KeyboardEvent): boolean {
  for (const fn of escapeInterceptors) {
    try {
      if (fn(e)) return true;
    } catch { /* a broken interceptor must not block closing */ }
  }
  return false;
}
