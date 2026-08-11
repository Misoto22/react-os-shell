/**
 * Stack, Inline, Grid — layout without a class string at every call site.
 *
 * These replace the row/column/spacer components a page otherwise reaches for.
 * The whole value is in the `gap` prop being a CLOSED union mapped to literal
 * classes: Tailwind reads source text, so `gap-${n}` produces no style at all
 * and fails silently — everything simply sits flush and looks like a CSS bug.
 * A union means an unsupported gap is a compile error instead.
 *
 * Nothing here is a grid system. There are no 12ths and no `span` arithmetic;
 * `Grid` takes a column count and children occupy one cell each. A layout that
 * needs more than that should say so in its own classes rather than push this
 * toward a framework.
 */
import { type ReactNode } from 'react';

export type Gap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

const GAP: Record<Gap, string> = {
  0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8',
};

export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
const ALIGN: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

export type Justify = 'start' | 'center' | 'end' | 'between' | 'around';
const JUSTIFY: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export interface StackProps {
  children?: ReactNode;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  className?: string;
}

/** Vertical flow. */
export function Stack({ children, gap = 4, align, justify, className = '' }: StackProps) {
  return (
    <div className={['flex flex-col', GAP[gap], align ? ALIGN[align] : '', justify ? JUSTIFY[justify] : '', className]
      .filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export interface InlineProps extends StackProps {
  /** Wrap onto a second line rather than overflowing. Default true — an
   *  unwrapped row is how a toolbar quietly breaks a narrow screen. */
  wrap?: boolean;
}

/** Horizontal flow. Defaults to vertically centred, which is what a row of
 *  mixed-height controls almost always wants. */
export function Inline({ children, gap = 2, align = 'center', justify, wrap = true, className = '' }: InlineProps) {
  return (
    <div className={['flex', wrap ? 'flex-wrap' : '', GAP[gap], ALIGN[align], justify ? JUSTIFY[justify] : '', className]
      .filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export type GridCols = 1 | 2 | 3 | 4 | 6 | 12;

// Written out rather than interpolated. See the module docstring.
const COLS: Record<GridCols, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
  4: 'grid-cols-4', 6: 'grid-cols-6', 12: 'grid-cols-12',
};

// Responsive steps, also literal. `sm:` is the 640px breakpoint, `lg:` 1024px.
const SM_COLS: Record<GridCols, string> = {
  1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4', 6: 'sm:grid-cols-6', 12: 'sm:grid-cols-12',
};
const LG_COLS: Record<GridCols, string> = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4', 6: 'lg:grid-cols-6', 12: 'lg:grid-cols-12',
};

export interface GridProps {
  children?: ReactNode;
  /** Columns at the narrowest width, and optionally from `sm`/`lg` up. */
  cols?: GridCols;
  smCols?: GridCols;
  lgCols?: GridCols;
  gap?: Gap;
  className?: string;
}

export function Grid({ children, cols = 1, smCols, lgCols, gap = 4, className = '' }: GridProps) {
  return (
    <div className={['grid', COLS[cols], smCols ? SM_COLS[smCols] : '', lgCols ? LG_COLS[lgCols] : '', GAP[gap], className]
      .filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
