/**
 * CountBadge — a count pinned to the corner of something: a cart icon, a nav
 * item with unread messages.
 *
 * Not to be confused with `ColoredBadge`, which is a standalone pill you put
 * text in, or `StatusBadge`, which maps a status string to a semantic tone.
 * This one WRAPS a child and overlays a number on it, and it is the only one of
 * the three that means "how many".
 *
 * Zero renders nothing by default. A badge reading "0" is noise that has to be
 * read before it can be dismissed, and it trains people to stop looking.
 */
import { type ReactNode } from 'react';

export type CountBadgeTone = 'danger' | 'neutral' | 'accent';

const TONE: Record<CountBadgeTone, string> = {
  danger: 'bg-red-600 text-white',
  neutral: 'bg-gray-600 text-white',
  accent: 'bg-blue-600 text-white',
};

export interface CountBadgeProps {
  count?: number;
  /** Cap the display: 100 with `max={99}` shows "99+". */
  max?: number;
  /** A plain dot with no number — "something changed" without a quantity. */
  dot?: boolean;
  tone?: CountBadgeTone;
  /** Render at zero. Off by default. */
  showZero?: boolean;
  /** The thing being badged. Without one the badge renders inline on its own. */
  children?: ReactNode;
  className?: string;
}

export default function CountBadge({
  count = 0, max = 99, dot = false, tone = 'danger', showZero = false, children, className = '',
}: CountBadgeProps) {
  const visible = dot || count > 0 || (count === 0 && showZero);
  const label = count > max ? `${max}+` : String(count);

  const badge = visible ? (
    dot ? (
      <span
        className={`block h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONE[tone]}`}
        // The child already carries the meaning ("Notifications"); an unlabelled
        // dot repeating it adds a second announcement of the same thing.
        aria-hidden={children ? 'true' : undefined}
      />
    ) : (
      <span
        className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ring-2 ring-white ${TONE[tone]}`}
      >
        {label}
      </span>
    )
  ) : null;

  if (!children) return badge;

  return (
    <span className={`relative inline-flex ${className}`.trim()}>
      {children}
      {badge && <span className="absolute -right-1.5 -top-1.5 flex">{badge}</span>}
    </span>
  );
}
