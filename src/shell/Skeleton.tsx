/**
 * Skeleton — a placeholder shaped like the content that is loading.
 *
 * Worth preferring over a spinner wherever the shape is known: it reserves the
 * space, so the page does not jump when data lands, and it tells the user what
 * is coming rather than only that something is.
 *
 * Sizes go through inline `style`, not classes. A skeleton's dimensions are
 * arbitrary by definition — they match whatever they stand in for — and
 * arbitrary Tailwind values (`w-[213px]`) produce NO style in the compiled
 * stylesheet the design-sync previews use. This is the escape hatch
 * `.design-sync/conventions.md` documents, and the same one `Avatar` uses.
 */
import { type CSSProperties } from 'react';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** CSS length. Defaults to full width for text/rect, and to `height` for a circle. */
  width?: number | string;
  height?: number | string;
  /** For `text`: how many lines. The last is short, the way real prose ends. */
  lines?: number;
  className?: string;
}

const SHAPE: Record<SkeletonVariant, string> = {
  text: 'rounded',
  rect: 'rounded-md',
  circle: 'rounded-full',
};

const len = (v: number | string | undefined): string | undefined =>
  typeof v === 'number' ? `${v}px` : v;

export default function Skeleton({ variant = 'text', width, height, lines = 1, className = '' }: SkeletonProps) {
  const base = `animate-pulse bg-gray-200 ${SHAPE[variant]} ${className}`.trim();

  if (variant === 'circle') {
    const d = len(height ?? width) ?? '2.5rem';
    return <span className={`inline-block ${base}`} style={{ width: d, height: d }} aria-hidden="true" />;
  }

  const style: CSSProperties = {
    width: len(width) ?? '100%',
    height: len(height) ?? (variant === 'text' ? '1rem' : '4rem'),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <span className="flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={`block ${base}`}
            // A block of identical full-width bars reads as a table, not prose.
            style={{ ...style, width: i === lines - 1 ? '60%' : style.width }}
          />
        ))}
      </span>
    );
  }

  return <span className={`block ${base}`} style={style} aria-hidden="true" />;
}
