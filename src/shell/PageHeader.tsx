import type { ReactNode } from 'react';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  /** Muted line under the title. (`subtitle` is an accepted alias.) */
  description?: string;
  /** @deprecated alias for `description`. */
  subtitle?: string;
  /** Right-aligned actions. (`children` is also accepted.) */
  actions?: ReactNode;
  children?: ReactNode;
  /**
   * Icon beside the title — a marker for the page, not a second headline.
   * Rendered muted and at the title's own size, so it labels the words rather
   * than competing with them.
   */
  icon?: ReactNode;
  /**
   * Trail above the title, root → current, rendered with the kit's own
   * `Breadcrumbs`. Not a second implementation: the collapsing behaviour, the
   * `aria-current="page"` on the last crumb and the separator all come from
   * that component, so a trail in a header and a trail anywhere else stay the
   * same thing.
   */
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * PageHeader — a page/section title with an optional muted description and a
 * right-aligned actions slot. Accepts both the `description`/`actions` and the
 * `subtitle`/`children` prop shapes the portals previously used locally.
 */
export default function PageHeader({
  title, description, subtitle, actions, children, icon, breadcrumbs,
}: PageHeaderProps) {
  const desc = description ?? subtitle;
  const right = actions ?? children;
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
            {title}
          </h1>
          {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}
