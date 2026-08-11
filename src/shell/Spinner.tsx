import { type ReactNode } from 'react';

export interface LoadingSpinnerProps {
  /** Ring diameter: `sm` = 20px, `md` = 32px (default), `lg` = 48px. */
  size?: 'sm' | 'md' | 'lg';
  /** Wrapper padding utility (default `py-12`). Pass `''` to remove. */
  padding?: string;
  /**
   * Caption under the ring, e.g. "Signing in…". Naming what is happening beats
   * a bare ring on a full-screen wait, where there is nothing else on the page
   * to infer it from. Adds `role="status"` so it is announced.
   */
  label?: ReactNode;
  /** Extra classes on the centering wrapper. */
  className?: string;
}

/**
 * LoadingSpinner — a centered animated ring for pending/loading regions.
 * (Distinct from the shell's internal "Loading…" text used inside data grids.)
 */
export default function LoadingSpinner({ size = 'md', padding = 'py-12', label, className = '' }: LoadingSpinnerProps) {
  const dim = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  const ring = <div className={`${dim} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600`} />;
  // Without a label the markup is exactly what it has always been — including
  // no `role`, which would otherwise have changed the a11y tree for every
  // existing caller. A labelled spinner is a status; a bare ring is decoration.
  if (label == null) {
    return <div className={`flex items-center justify-center ${padding} ${className}`}>{ring}</div>;
  }
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 ${padding} ${className}`}>
      {ring}
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
