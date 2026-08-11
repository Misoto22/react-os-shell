/**
 * confirm / confirmDestructive / prompt — the imperative dialogs, callable from
 * any click handler without a hook.
 *
 * Rebuilt on `./Dialog` in 4.18.0. It previously rendered Headless UI, which
 * meant every consumer of `react-os-shell/ui` inherited `@headlessui/react` and
 * `@heroicons/react` to ask someone a yes/no question. Focus containment and
 * scroll locking now come from `./focusTrap`; the icons are inline SVG. The
 * three dialogs' behaviour is otherwise unchanged, with two deliberate
 * exceptions noted below.
 *
 * FAIL-CLOSED. Each global starts as a function resolving to false/null, so a
 * `confirm()` with no provider mounted answers "no" rather than hanging or
 * throwing. A dialog nobody can see must never resolve true — that is the
 * difference between a no-op and a deletion.
 *
 * CONFIRMS QUEUE, they do not drop. A second `confirm()` while one is open
 * waits its turn and shows afterwards. Dropping it would silently resolve a
 * question the user was never asked, and the caller cannot tell that from a
 * genuine "no".
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import Dialog from './Dialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;
interface PendingConfirm {
  id: number;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

// Global callable — works without a hook, usable from any click handler
let globalConfirmFn: ConfirmFn = () => Promise.resolve(false);
export const confirm = (opts: ConfirmOptions | string) => globalConfirmFn(opts);

interface DestructiveConfirmOptions {
  title?: string;
  message: string;
  /**
   * Require typing this word (case-sensitive) before the action is enabled —
   * for something genuinely irreversible at scale, like dropping a tenant.
   *
   * OPTIONAL since 4.18.0. Omit it for a plain two-button destructive confirm.
   * Type-to-confirm assumes a keyboard, and a touch device that has none (a
   * till, a warehouse scanner) cannot satisfy it at all — the dialog becomes an
   * unanswerable question. Ask for a word when the cost of a mis-tap is high
   * enough to justify making the user work; not by default.
   */
  confirmWord?: string;
  /** Label for the action button when there is no `confirmWord`. */
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}
type DestructiveConfirmFn = (options: DestructiveConfirmOptions) => Promise<boolean>;
let globalDestructiveConfirmFn: DestructiveConfirmFn = () => Promise.resolve(false);
export const confirmDestructive = (opts: DestructiveConfirmOptions) => globalDestructiveConfirmFn(opts);

// Prompt — windowed replacement for native window.prompt(). Resolves to the
// trimmed string, or null if the user cancelled. Empty input counts as
// cancel by default; pass `allowEmpty: true` to opt in.
interface PromptOptions {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  allowEmpty?: boolean;
}
type PromptFn = (options: PromptOptions | string) => Promise<string | null>;
let globalPromptFn: PromptFn = () => Promise.resolve(null);
export const prompt = (opts: PromptOptions | string) => globalPromptFn(opts);

const TONE: Record<'danger' | 'warning' | 'info', { icon: string; button: string }> = {
  danger: { icon: 'text-red-600 bg-red-100', button: 'bg-red-600 hover:bg-red-700 text-white' },
  warning: { icon: 'text-yellow-600 bg-yellow-100', button: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
  info: { icon: 'text-blue-600 bg-blue-100', button: 'bg-blue-600 hover:bg-blue-700 text-white' },
};

const CANCEL_BTN =
  'bg-white text-gray-700 border border-gray-300 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50';

/** Inline replacements for the two Heroicons this file used to import. */
function WarningIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [confirmId, setConfirmId] = useState(0);
  const resolveRef = useRef<(value: boolean) => void>();
  const activeConfirmIdRef = useRef<number | null>(null);
  const nextConfirmIdRef = useRef(0);
  const confirmQueueRef = useRef<PendingConfirm[]>([]);

  // Cancel is the default focus target in every dialog here. The destructive
  // action sits on the RIGHT and is never what Enter or a stray keypress hits.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dCancelRef = useRef<HTMLButtonElement>(null);

  const showConfirm = useCallback((request: PendingConfirm) => {
    activeConfirmIdRef.current = request.id;
    resolveRef.current = request.resolve;
    setConfirmId(request.id);
    setOptions(request.options);
    setOpen(true);
  }, []);

  const confirmFn: ConfirmFn = useCallback((opts) => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise<boolean>((resolve) => {
      const request = { id: ++nextConfirmIdRef.current, options: normalized, resolve };
      if (activeConfirmIdRef.current === null) showConfirm(request);
      else confirmQueueRef.current.push(request);
    });
  }, [showConfirm]);

  // Destructive confirm state
  const [dOpen, setDOpen] = useState(false);
  const [dOptions, setDOptions] = useState<DestructiveConfirmOptions>({ message: '' });
  const [dInput, setDInput] = useState('');
  const dResolveRef = useRef<(value: boolean) => void>();

  const destructiveConfirmFn: DestructiveConfirmFn = useCallback((opts) => {
    setDOptions(opts);
    setDInput('');
    setDOpen(true);
    return new Promise<boolean>((resolve) => {
      dResolveRef.current = resolve;
    });
  }, []);

  // Prompt state
  const [pOpen, setPOpen] = useState(false);
  const [pOptions, setPOptions] = useState<PromptOptions>({});
  const [pInput, setPInput] = useState('');
  const pResolveRef = useRef<(value: string | null) => void>();

  const promptFn: PromptFn = useCallback((opts) => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    setPOptions(normalized);
    setPInput(normalized.defaultValue ?? '');
    setPOpen(true);
    return new Promise<string | null>((resolve) => {
      pResolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    globalConfirmFn = confirmFn;
    globalDestructiveConfirmFn = destructiveConfirmFn;
    globalPromptFn = promptFn;
  }, [confirmFn, destructiveConfirmFn, promptFn]);

  const handleClose = (id: number, result: boolean) => {
    // A callback captured by the previous dialog must never settle the next
    // queued request after the active request advances.
    if (activeConfirmIdRef.current !== id) return;
    const resolve = resolveRef.current;
    const next = confirmQueueRef.current.shift();
    if (next) showConfirm(next);
    else {
      activeConfirmIdRef.current = null;
      resolveRef.current = undefined;
      setOpen(false);
    }
    resolve?.(result);
  };

  const handleDClose = (result: boolean) => {
    setDOpen(false);
    setDInput('');
    dResolveRef.current?.(result);
  };

  const handlePClose = (commit: boolean) => {
    if (commit) {
      const trimmed = pInput.trim();
      if (!trimmed && !pOptions.allowEmpty) {
        // Empty + not opted-in to allow empty: treat Save as Cancel.
        setPOpen(false);
        pResolveRef.current?.(null);
        return;
      }
      setPOpen(false);
      pResolveRef.current?.(trimmed);
    } else {
      setPOpen(false);
      pResolveRef.current?.(null);
    }
  };

  // Escape is claimed by each Dialog itself now, and interceptors run most
  // recent first, so a stack of these dismisses top-down without the provider
  // hand-ordering them the way it used to.

  const variant = options.variant || (options.confirmLabel?.toLowerCase().includes('delete') || options.message.toLowerCase().includes('delete') ? 'danger' : 'info');
  const tone = TONE[variant];
  const dTone = TONE[dOptions.variant === 'warning' ? 'warning' : 'danger'];
  const dWord = dOptions.confirmWord;
  const dSatisfied = dWord == null || dInput === dWord;

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}

      <Dialog
        open={open}
        onClose={() => handleClose(confirmId, false)}
        initialFocus={cancelRef}
        footer={
          <>
            <button ref={cancelRef} type="button" onClick={() => handleClose(confirmId, false)} className={CANCEL_BTN}>
              {options.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={() => handleClose(confirmId, true)}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${tone.button}`}>
              {options.confirmLabel || 'OK'}
            </button>
          </>
        }
      >
        <div className="flex gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${tone.icon}`}>
            <WarningIcon />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">{options.title || 'Confirm'}</h2>
            <p className="mt-2 text-sm text-gray-600">{options.message}</p>
          </div>
        </div>
      </Dialog>

      {/* Destructive confirm — optionally gated on typing a word */}
      <Dialog
        open={dOpen}
        onClose={() => handleDClose(false)}
        // With a word to type, focus the input: that is the task. Without one,
        // focus Cancel, so the irreversible button is never one Enter away.
        initialFocus={dWord != null ? undefined : dCancelRef}
        footer={
          <>
            <button ref={dCancelRef} type="button" onClick={() => handleDClose(false)} className={CANCEL_BTN}>
              {dOptions.cancelLabel || 'Dismiss'}
            </button>
            <button type="button" onClick={() => handleDClose(true)} disabled={!dSatisfied}
              className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 ${dTone.button}`}>
              {dWord ?? dOptions.confirmLabel ?? 'Delete'}
            </button>
          </>
        }
      >
        <button
          type="button"
          onClick={() => handleDClose(false)}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <CloseIcon />
        </button>
        <div className="flex gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${dTone.icon}`}>
            <WarningIcon />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 pr-6">{dOptions.title || 'Confirm Action'}</h2>
            <p className="mt-2 text-sm text-gray-600">{dOptions.message}</p>
            {dWord != null && (
              <>
                <p className="mt-3 text-sm text-gray-700">
                  Type <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-bold text-red-600 font-mono">{dWord}</kbd> to confirm:
                </p>
                <input
                  autoFocus
                  type="text"
                  value={dInput}
                  onChange={e => setDInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && dInput === dWord) handleDClose(true); }}
                  placeholder={dWord}
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                />
              </>
            )}
          </div>
        </div>
      </Dialog>

      {/* Prompt — windowed replacement for window.prompt() */}
      <Dialog
        open={pOpen}
        onClose={() => handlePClose(false)}
        title={pOptions.title || 'Enter a value'}
        footer={
          <>
            <button type="button" onClick={() => handlePClose(false)} className={CANCEL_BTN}>
              {pOptions.cancelLabel || 'Cancel'}
            </button>
            <button type="button" onClick={() => handlePClose(true)}
              disabled={!pOptions.allowEmpty && !pInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40">
              {pOptions.confirmLabel || 'OK'}
            </button>
          </>
        }
      >
        {pOptions.message && <p className="text-sm text-gray-600">{pOptions.message}</p>}
        <input
          autoFocus
          type="text"
          value={pInput}
          onChange={(e) => setPInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlePClose(true);
            else if (e.key === 'Escape') handlePClose(false);
          }}
          onFocus={(e) => e.target.select()}
          placeholder={pOptions.placeholder}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </Dialog>
    </ConfirmContext.Provider>
  );
}
