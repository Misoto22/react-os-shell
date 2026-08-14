/**
 * SessionWindowRestore — reopen the windows the user had open.
 *
 * Window state is in-memory, so logging out — or just pressing F5 — has
 * always meant coming back to an empty desktop with the taskbar cleared.
 * Everything needed to rebuild it already existed: the window manager can
 * open a page window from its route and an entity window from its registry
 * key + id (it does exactly that when restoring a minimised item), and
 * ShellPrefs persists per-user state. This component is just the two wires:
 * it saves the identifying refs of the open windows (never their content),
 * and on a fresh mount with nothing open it replays them.
 *
 * Contracts:
 *  - Off switch: `restore_windows: false` in prefs (Preferences → Behavior).
 *    Default on.
 *  - Restore runs ONCE per mount, and only when no window is already open —
 *    a deep link that opened a window before this ran wins, we never stack
 *    a stale session on top of it.
 *  - Persisting starts only after the restore attempt, so mounting with an
 *    empty desktop cannot overwrite the saved set it was about to replay.
 *    Saves are debounced — opening five windows writes once.
 *  - The saved refs are read from the prefs available AT MOUNT. The bundled
 *    localStorage adapter is synchronous, so that is simply "the prefs"; a
 *    consumer whose prefs hydrate later misses the restore for that load
 *    rather than restoring at a surprising moment mid-session.
 *  - Part-number lookup windows are not restored: they open through a search
 *    round-trip, not the registry, and a stale lookup re-running a search at
 *    login is a surprise rather than a restoration.
 */
import { useEffect, useRef } from 'react';

import { useWindowManager, type MinimizedItem } from './WindowManager';
import { useShellPrefs } from './ShellPrefs';

export interface SessionWindowRef {
  type: 'page' | 'entity';
  route?: string;
  entityType?: string;
  entityId?: string;
  label?: string;
}

/** The persistable identity of each open window — content never leaves the
 *  window, only the coordinates the registry needs to reopen it. */
export function toSessionRefs(openWindows: MinimizedItem[]): SessionWindowRef[] {
  const refs: SessionWindowRef[] = [];
  for (const w of openWindows) {
    if (w.type === 'page' && w.route) {
      refs.push({ type: 'page', route: w.route });
    } else if (w.entityType && w.entityId && w.type !== 'part_number') {
      refs.push({ type: 'entity', entityType: w.entityType, entityId: w.entityId, label: w.label, route: w.route });
    }
  }
  return refs;
}

const SAVE_DEBOUNCE_MS = 800;

export default function SessionWindowRestore() {
  const { openWindows, openEntity, openPage } = useWindowManager();
  const { prefs, save } = useShellPrefs();
  const restoredRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Restore, once, at mount ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (prefs.restore_windows === false) return;
    if (openWindows.length > 0) return;
    const saved: SessionWindowRef[] = Array.isArray(prefs.session_windows) ? prefs.session_windows : [];
    for (const w of saved) {
      if (w.type === 'page' && w.route) openPage(w.route);
      else if (w.type === 'entity' && w.entityType && w.entityId) openEntity(w.entityType, w.entityId, undefined, w.label, w.route);
    }
    // The restore itself changes openWindows, which the persist effect below
    // will re-save — same refs, harmless, and it confirms the round-trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist on change, only after the restore attempt ──
  useEffect(() => {
    if (!restoredRef.current) return;
    clearTimeout(saveTimer.current);
    const refs = toSessionRefs(openWindows);
    saveTimer.current = setTimeout(() => save({ session_windows: refs }), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [openWindows, save]);

  return null;
}
