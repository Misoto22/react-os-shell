import { GROUP_COLORS, type SemanticGroup } from './StatusBadge';
import type { ReactNode } from 'react';

export interface ColoredBadgeProps {
  /**
   * A semantic tone, resolved through the same table `StatusBadge` uses — so a
   * badge given `tone="success"` and one given a status string that maps to
   * success are the same green.
   *
   * Prefer this to `colorClass`. Raw classes are the escape hatch for a colour
   * the system has no name for, and every consumer reaching for them is a
   * place the theme system cannot follow.
   */
  tone?: SemanticGroup;
  /** Tailwind classes for the badge color, e.g. `bg-green-100 text-green-800`.
   *  Wins over `tone` when both are given. */
  colorClass?: string;
  children: ReactNode;
  /** `xs` = 10px (dense list cells), `sm` = 12px / px-2 (default), `md` =
   *  12px / px-2.5 (matches StatusBadge). */
  size?: 'xs' | 'sm' | 'md';
  /** Capitalize each word — useful for raw status strings like `in_progress`
   *  (rendered as `In Progress`). Default false. */
  capitalize?: boolean;
  /**
   * Render a close control — a filter chip the user can drop.
   *
   * Its accessible name is derived from the badge's own text: "Remove Winter
   * tyres", not "Remove". A row of filter chips otherwise gives a screen-reader
   * user five identical buttons and no way to tell which one drops which
   * filter. `closeLabel` overrides it, and is required in practice whenever
   * the children are not plain text — there is nothing to derive from.
   */
  closable?: boolean;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

/**
 * ColoredBadge — a small rounded-full pill. Give it a `tone` from the shell's
 * semantic vocabulary, or raw Tailwind classes when the colour has no name.
 *
 * Counterpart to StatusBadge, which takes a domain status STRING and maps it
 * through a provider. Both read the same colour table, so the two never
 * disagree about what success looks like.
 */
export default function ColoredBadge({
  colorClass, tone, children, size = 'sm', capitalize = false,
  closable = false, onClose, closeLabel, className = '',
}: ColoredBadgeProps) {
  // Explicit beats semantic: a caller who passed raw classes did so to say
  // something the tone vocabulary cannot. Neither given is neutral, which is
  // what an unlabelled pill has always looked like.
  const colour = colorClass ?? GROUP_COLORS[tone ?? 'neutral'];
  const sizeCls =
    size === 'xs' ? 'px-2 py-0.5 text-[10px]' :
    size === 'md' ? 'px-2.5 py-0.5 text-xs' :
                    'px-2 py-0.5 text-xs';
  const capCls = capitalize ? 'capitalize' : '';
  const closeName = closeLabel ?? (typeof children === 'string' ? `Remove ${children}` : 'Remove');
  const closeSize = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  return (
    <span className={['inline-flex items-center rounded-full font-medium', sizeCls, capCls, colour, className].filter(Boolean).join(' ')}>
      {children}
      {closable && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeName}
          className="-mr-0.5 ml-1 inline-flex shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        >
          <svg className={closeSize} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </span>
  );
}
