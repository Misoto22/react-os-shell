/**
 * Two presentations:
 *
 * 1. toast.success / error / info — brief operation feedback, top-center,
 *    auto-dismiss (success/error ~3s, info ~4.5s). The everyday "what just
 *    happened" feedback — most messages want this.
 * 2. toast.notify — system notification, top-right card, stays 10s, dismissible.
 *    For an alert worth lingering on; reach for it deliberately, not by default.
 *
 * (Historically `toast.info` rendered the top-right notification card; it now
 * renders a brief toast — that persistent card moved to `toast.notify`.)
 */

const TOAST_CONTAINER_ID = 'toast-container';
const TOAST_BOTTOM_CONTAINER_ID = 'toast-container-bottom';
const NOTIF_CONTAINER_ID = 'notif-container';
const FADE_MS = 300;

export type ToastPlacement = 'top' | 'bottom';

export interface ToastOptions {
  /** Milliseconds before auto-dismiss. Ignored when `sticky`. */
  duration?: number;
  /**
   * Stay until dismissed. For a message the user must actually act on — the
   * kind that must not scroll past while they are looking at a customer.
   * Implies tap-to-dismiss is the only way out, which it already is.
   */
  sticky?: boolean;
  /**
   * `bottom` centres toasts along the bottom edge. On a till the top of the
   * screen is the cart total and the bottom is nearest the hand.
   */
  placement?: ToastPlacement;
  /**
   * Drop a message identical to one already showing, and RESTART its timer
   * rather than stacking a second copy. A failing poll otherwise writes the
   * same sentence a dozen times. The restart matters: the user asked twice, so
   * the message should persist, not expire on the first one's schedule.
   */
  dedupe?: boolean;
}

/**
 * Defaults for every subsequent toast, set once at app startup — the same
 * "consumer wires this once" shape as `setShellApiClient`/`setShellNavIcons`.
 * A till calls `toast.configure({ placement: 'bottom', duration: 6000,
 * dedupe: true })` instead of repeating those options at 40 call sites.
 * Per-call options still win.
 */
let defaults: ToastOptions = {};

/** Live toasts by dedupe key, so a repeat can find and refresh its own. */
const live = new Map<string, { el: HTMLElement; restart: () => void; dismiss: () => void }>();

function getOrCreate(id: string, className: string): HTMLElement {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = className;
    document.body.appendChild(el);
  }
  return el;
}

function getMenuOpacity(): number {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--menu-opacity')?.trim();
    if (val) return parseFloat(val);
  } catch {}
  return 0.95;
}

function glassBackground(o: number): string {
  return `linear-gradient(135deg, rgba(255,255,255,${o * 0.85}) 0%, rgba(255,255,255,${o * 0.65}) 50%, rgba(255,255,255,${o * 0.75}) 100%)`;
}

const GLASS_COMMON = `
  backdrop-filter: blur(40px) saturate(1.8); -webkit-backdrop-filter: blur(40px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.35);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
`;

// ── Toast (operation feedback) — top-center, brief ──

function showToast(variant: 'success' | 'error' | 'warning' | 'info' | 'loading', message: string,
                   opts?: ToastOptions): { dismiss: () => void } {
  const opts_ = { ...defaults, ...opts };
  const placement: ToastPlacement = opts_.placement ?? 'top';
  const sticky = opts_.sticky ?? false;

  // A repeat of a message already on screen refreshes it instead of stacking.
  const key = `${placement}|${variant}|${message}`;
  if (opts_.dedupe) {
    const existing = live.get(key);
    if (existing) { existing.restart(); return { dismiss: existing.dismiss }; }
  }

  // A loading toast is the START of an operation — the sound belongs to the
  // outcome, which follows in a moment.
  if (variant !== 'loading') {
    import('../utils/sounds').then(s => {
      if (variant === 'success') s.playSuccess();
      else if (variant === 'error') s.playError();
      else s.playNotification();
    }).catch(() => {});
  }

  const container = placement === 'bottom'
    ? getOrCreate(TOAST_BOTTOM_CONTAINER_ID, 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 items-center pointer-events-none')
    : getOrCreate(TOAST_CONTAINER_ID, 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none');
  const o = getMenuOpacity();
  const color =
    variant === 'success' ? '#22c55e' :
    variant === 'error' ? '#ef4444' :
    // Amber, and deliberately not the error red: a warning is something the
    // user should read before continuing, not something that failed. Painting
    // both red teaches people to ignore the colour.
    variant === 'warning' ? '#f59e0b' :
    '#3b82f6'; // info and loading share the working blue
  const icons = {
    success: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="' + color + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    error: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="' + color + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
    warning: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="' + color + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>',
    info: '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="' + color + '" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    // An open arc that spins — same vocabulary as LoadingSpinner.
    loading: '<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="' + color + '" stroke-width="2"><path stroke-linecap="round" d="M12 3a9 9 0 019 9"/></svg>',
  };
  const icon = icons[variant];

  // Enter from the edge the toast is anchored to, so it reads as arriving from
  // off-screen rather than drifting in from the wrong direction.
  const offscreen = placement === 'bottom' ? 'translateY(10px)' : 'translateY(-10px)';

  const el = document.createElement('div');
  el.className = 'pointer-events-auto cursor-pointer';
  el.style.cssText = `
    padding: 8px 20px; border-radius: 12px;
    background: ${glassBackground(o)}; ${GLASS_COMMON}
    opacity: 0; transform: ${offscreen} scale(0.95);
    transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease;
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 500; color: rgb(55,65,81);
    max-width: min(90vw, 460px);
  `;
  // A toast IS a status message, and it appears without the user moving focus
  // — so without a live region it is announced to nobody. `alert` is
  // assertive and interrupts whatever is being read, which is right for a
  // failure and wrong for a confirmation the user already expected.
  el.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  // Read the whole toast, not the word that changed. Without it a repeat that
  // only alters a number announces the number alone.
  el.setAttribute('aria-atomic', 'true');

  el.innerHTML = icon;
  const span = document.createElement('span');
  span.textContent = message;
  el.appendChild(span);

  container.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0) scale(1)'; });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let gone = false;
  const dismiss = () => {
    if (gone) return;
    gone = true;
    if (timer) clearTimeout(timer);
    live.delete(key);
    el.style.opacity = '0';
    el.style.transform = `${offscreen} scale(0.95)`;
    setTimeout(() => el.remove(), FADE_MS);
  };

  // Info messages are usually a sentence ("no matches — check X"); give them a
  // beat longer to read than the terse success/error confirmations.
  const duration = opts_.duration ?? (variant === 'info' ? 4500 : 3000);
  const restart = () => {
    if (timer) clearTimeout(timer);
    if (!sticky) timer = setTimeout(dismiss, duration);
  };
  restart();

  // Hold the timer while the pointer rests on it. Three seconds is enough to
  // read a confirmation and not enough to read an address someone leaned in
  // for — and a toast that vanishes as you reach for it cannot be re-read at
  // all, since there is no history to open.
  el.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
  el.addEventListener('mouseleave', () => { if (!gone) restart(); });

  // Tap anywhere on the toast to dismiss it. A toast has no other click
  // affordance, and a sticky one has no other exit at all — `notify` has
  // behaved this way since it existed.
  el.addEventListener('click', dismiss);

  live.set(key, { el, restart, dismiss });
  // Internal handle — `toast.promise` swaps its loading toast for the outcome.
  return { dismiss };
}

// ── Notification (system alert) — top-right, stays longer ──

function showNotification(message: string, opts?: { duration?: number }) {
  import('../utils/sounds').then(s => s.playNotification()).catch(() => {});

  const container = getOrCreate(NOTIF_CONTAINER_ID, 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 items-end pointer-events-none');
  const o = getMenuOpacity();

  const el = document.createElement('div');
  el.className = 'pointer-events-auto cursor-pointer';
  el.style.cssText = `
    min-width: 280px; max-width: 380px; padding: 12px 16px; border-radius: 16px;
    background: ${glassBackground(o)}; ${GLASS_COMMON}
    opacity: 0; transform: translateX(30px) scale(0.95);
    transition: opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1), transform ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1);
    display: flex; align-items: flex-start; gap: 12px;
  `;

  el.innerHTML = `
    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59,130,246,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
    </div>
    <div style="flex: 1; min-width: 0;">
      <div style="font-size: 11px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Notification</div>
      <div class="notif-msg" style="font-size: 13px; font-weight: 500; color: rgb(55,65,81); line-height: 1.4;"></div>
    </div>
    <button style="flex-shrink: 0; padding: 4px; color: rgb(156,163,175); font-size: 18px; line-height: 1; transition: color 0.2s;" onmouseenter="this.style.color='rgb(75,85,99)'" onmouseleave="this.style.color='rgb(156,163,175)'">&times;</button>
  `;

  const msgEl = el.querySelector('.notif-msg');
  if (msgEl) msgEl.textContent = message;

  const dismiss = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px) scale(0.95)';
    setTimeout(() => el.remove(), FADE_MS);
  };

  el.querySelector('button')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  el.addEventListener('click', dismiss);

  container.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0) scale(1)'; });

  setTimeout(dismiss, opts?.duration ?? 10000);
}

const toast = {
  success: (message: string, opts?: ToastOptions) => showToast('success', message, opts),
  error: (message: string, opts?: ToastOptions) => showToast('error', message, opts),
  /**
   * Something the user should read before continuing — a partial success, a
   * setting that will not apply until they do something else. Distinct from
   * `error`, which is "this did not happen".
   */
  warning: (message: string, opts?: ToastOptions) => showToast('warning', message, opts),
  info: (message: string, opts?: ToastOptions) => showToast('info', message, opts),
  // Persistent top-right notification card (the old toast.info presentation).
  notify: (message: string, opts?: { duration?: number }) => showNotification(message, opts),
  /**
   * One toast for one async operation: a spinning "loading" toast while `p`
   * is pending, swapped for a success or error toast when it settles. The
   * promise is returned untouched, so `await toast.promise(save(), …)` still
   * throws to the caller — this narrates the operation, it does not handle it.
   *
   * `error` is REQUIRED, and there is deliberately no fallback that prints
   * the exception: a raw `e.message` in a toast is how internals leak to the
   * screen (the same reasoning that keeps ErrorBoundary's stack behind
   * `showDetails`). The success/error messages may be functions of the
   * resolved value / the rejection, for the "Saved 3 rows" case.
   */
  promise: <T,>(
    p: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((error: unknown) => string);
    },
    opts?: ToastOptions,
  ): Promise<T> => {
    const pending = showToast('loading', msgs.loading, { ...opts, sticky: true });
    p.then(
      value => {
        pending.dismiss();
        showToast('success', typeof msgs.success === 'function' ? msgs.success(value) : msgs.success, opts);
      },
      error => {
        pending.dismiss();
        showToast('error', typeof msgs.error === 'function' ? msgs.error(error) : msgs.error, opts);
      },
    );
    return p;
  },
  /**
   * Set defaults for every subsequent toast. Call once at app startup; later
   * calls replace the whole object rather than merging, so a consumer sets its
   * policy in one place. Per-call options still take precedence.
   */
  configure: (next: ToastOptions) => { defaults = { ...next }; },
};

export default toast;
