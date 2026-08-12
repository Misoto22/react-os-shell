/**
 * Divider — a rule between sections, optionally with a label sitting in it.
 *
 * The vertical variant is for separating controls inside a row (a toolbar), and
 * needs a parent that gives it a height — it stretches, it does not define. A
 * bare vertical divider in a block container renders as nothing, which is the
 * one way to get this wrong.
 */
import { useId, type ReactNode } from 'react';

export type DividerSpacing = 'sm' | 'md' | 'lg';

const SPACING: Record<DividerSpacing, string> = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
};

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Label set into the rule. Horizontal only. */
  children?: ReactNode;
  align?: 'left' | 'center' | 'right';
  spacing?: DividerSpacing;
  className?: string;
}

export default function Divider({
  orientation = 'horizontal', children, align = 'center', spacing = 'md', className = '',
}: DividerProps) {
  // Unconditional, above the early returns — only the labelled form uses it,
  // but a hook cannot be called conditionally.
  const labelId = useId();

  if (orientation === 'vertical') {
    return (
      <span
        // Presentational: a vertical rule between two controls is a visual
        // grouping cue, not a structural break in the document.
        role="presentation"
        className={`inline-block h-full min-h-[1em] w-px shrink-0 self-stretch bg-gray-200 ${className}`.trim()}
      />
    );
  }

  if (!children) {
    return <hr className={`border-0 border-t border-gray-200 ${SPACING[spacing]} ${className}`.trim()} />;
  }

  // Flex rules either side rather than a background trick, so the label sits on
  // the container's own background whatever that is.
  const before = align === 'left' ? 'w-4 shrink-0' : 'flex-1';
  const after = align === 'right' ? 'w-4 shrink-0' : 'flex-1';
  return (
    // `role="separator"` because the <hr> above cannot be used once there is a
    // label to place inside the rule — and losing the element must not mean
    // losing what it meant. The two rules either side are decoration.
    //
    // The name is pointed at explicitly. `separator` takes its name from the
    // AUTHOR only — it is not one of the roles that names itself from its
    // contents — so the label sitting inside the element did NOT become the
    // separator's accessible name, and the rule was announced unnamed with the
    // text loose beside it. `aria-labelledby` is what actually attaches it.
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-labelledby={labelId}
      className={`flex items-center gap-3 ${SPACING[spacing]} ${className}`.trim()}
    >
      <span aria-hidden="true" className={`${before} border-t border-gray-200`} />
      <span id={labelId} className="shrink-0 text-xs font-medium text-gray-500">{children}</span>
      <span aria-hidden="true" className={`${after} border-t border-gray-200`} />
    </div>
  );
}
