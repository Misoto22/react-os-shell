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
  colorClass, tone, children, size = 'sm', capitalize = false, className = '',
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
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeCls} ${capCls} ${colour} ${className}`.trim()}>
      {children}
    </span>
  );
}
