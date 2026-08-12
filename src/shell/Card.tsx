/**
 * Card — the kit's standard surface: a rounded, bordered panel with optional
 * header and footer rows. StatCard is the dashboard variant (label + big value
 * + optional trend delta). Both are pure presentational components.
 */
import { useId, type CSSProperties, type ReactNode } from 'react';

/** How much room the card gives its contents. `md` is the desktop default;
 *  `lg` suits a touch layout, where the same density reads as cramped. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  /** Title row above the body, divided by a hairline. */
  header?: ReactNode;
  /** Row below the body, divided by a hairline. */
  footer?: ReactNode;
  /** Apply default padding to the body. Default true; set false to fill edge-to-edge. */
  /**
   * Render the header as a real heading at this level, and the card as a
   * region named by it.
   *
   * A card with a title IS a region of the page — the thing a screen-reader
   * user jumps between, and the thing a heading list is for. Without this the
   * title is a bold `<div>`: it looks like a heading to everyone who can see
   * it and is invisible to everyone navigating by structure.
   *
   * The level is the caller's because only the caller knows the page's
   * outline; a card inside a section that already has an `h2` needs an `h3`,
   * and guessing produces a jumbled outline rather than no outline.
   *
   * Omitted, nothing changes — the header stays a styled `div` and the card a
   * plain `div`, which is what every card shipping today is.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Rendered at the far end of the header row, opposite the title — a count, a
   * filter, a "View all" link.
   *
   * It is a separate slot because it must stay OUT of the heading. Folded into
   * `header`, a card titled "Team Members" with a "Team active" chip beside it
   * announces itself as "Team Members Team active", and that is the string a
   * heading list shows and a voice command has to match.
   */
  headerActions?: ReactNode;
  /**
   * Names the card as a region when there is no header to name it — a card
   * whose title lives outside it, or which has none.
   *
   * Ignored when `headingLevel` is set: the heading is the better name, and
   * two names on one element is a contradiction rather than a belt and braces.
   */
  'aria-label'?: string;
  padded?: boolean;
  /**
   * Padding scale. Takes precedence over `padded`, which remains supported and
   * is now the two-value shorthand for it (`true` → `md`, `false` → `none`).
   */
  padding?: CardPadding;
  className?: string;
  /**
   * Classes for the body, beside the padding this component supplies.
   *
   * The body is a wrapper this component owns, so `className` cannot reach it
   * — and a card whose contents are a column with a gap otherwise has to nest
   * a div inside the one already there just to say so.
   */
  bodyClassName?: string;
  /**
   * Inline style for the surface. For values that cannot be a class: an
   * animation delay computed per item, a measured height.
   */
  style?: CSSProperties;
}

// Header/footer padding scales WITH the body. A `p-6` body above a `px-4 py-3`
// footer reads as a mistake, and the caller cannot fix it — those rows take no
// className. `edge` is the horizontal/vertical pair for those rows.
const PADDING: Record<CardPadding, { body: string; edge: string }> = {
  none: { body: '', edge: 'px-4 py-3' },
  sm: { body: 'p-3', edge: 'px-3 py-2' },
  md: { body: 'p-4', edge: 'px-4 py-3' },
  lg: { body: 'p-6', edge: 'px-6 py-4' },
};

export default function Card({
  children, header, footer, padded = true, padding, headingLevel, headerActions,
  'aria-label': ariaLabel, className = '', bodyClassName = '', style,
}: CardProps) {
  const p = PADDING[padding ?? (padded ? 'md' : 'none')];
  // Called unconditionally — it is a hook — and only used when the heading is.
  const headingId = useId();

  const titled = headingLevel != null && header != null;
  const Heading = (`h${headingLevel}` as 'h2');
  // A <section> is only a landmark once it has a name. Rendering one for every
  // card would turn a dashboard of twelve into twelve unnamed regions, which
  // is worse than none — so the element follows the name, not the other way.
  const named = titled || (ariaLabel != null && ariaLabel !== '');
  const Root = (named ? 'section' : 'div') as 'div';

  const surface = `rounded-lg border border-gray-200 bg-white shadow-sm ${className}`.trim();
  const headerCls = `border-b border-gray-100 ${p.edge} text-sm font-semibold text-gray-900`;

  return (
    <Root
      className={surface}
      style={style}
      {...(titled
        ? { 'aria-labelledby': headingId }
        : named
          ? { 'aria-label': ariaLabel }
          : {})}
    >
      {header != null && (
        headerActions != null ? (
          // With actions the row has to be a flex container, so the heading is
          // nested rather than being the row itself — and only the title is
          // inside it.
          <div className={`${headerCls} flex items-center justify-between gap-3`}>
            {titled ? <Heading id={headingId}>{header}</Heading> : <span>{header}</span>}
            {headerActions}
          </div>
        ) : titled ? (
          // Without them the heading carries the row's own styling rather than
          // nesting a second element, so the title is not two boxes deep.
          <Heading id={headingId} className={headerCls}>{header}</Heading>
        ) : (
          <div className={headerCls}>{header}</div>
        )
      )}
      <div className={[p.body, bodyClassName].filter(Boolean).join(' ')}>{children}</div>
      {footer && <div className={`border-t border-gray-100 ${p.edge}`}>{footer}</div>}
    </Root>
  );
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** Trend pill, e.g. `{ value: '12%', direction: 'up' }`. */
  delta?: { value: ReactNode; direction: 'up' | 'down' | 'flat' };
  className?: string;
}

export function StatCard({ label, value, icon, delta, className = '' }: StatCardProps) {
  const deltaColor =
    delta?.direction === 'up' ? 'text-green-600'
    : delta?.direction === 'down' ? 'text-red-600'
    : 'text-gray-500';
  const arrow = delta?.direction === 'up' ? '▲' : delta?.direction === 'down' ? '▼' : '→';
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
        {delta && <span className={`text-xs font-medium ${deltaColor}`}>{arrow} {delta.value}</span>}
      </div>
    </div>
  );
}
