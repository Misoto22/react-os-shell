/**
 * Text, Title, Paragraph — the typographic primitives.
 *
 * They exist so a page can say what a piece of text IS rather than which gray
 * it happens to be. That matters here more than it usually does: dark mode in
 * this package works by remapping utility CLASS NAMES, so text styled through a
 * token object or an inline colour is correct in light mode and permanently
 * wrong in dark. Every tone below resolves to a class the dark remaps know.
 *
 * `tone` is semantic, not decorative. `secondary` and `tertiary` are the two
 * steps of de-emphasis; `danger`/`success`/`warning` state what the text means,
 * never merely what colour it should be.
 */
import { type ElementType, type ReactNode } from 'react';

export type TextTone =
  | 'default' | 'secondary' | 'tertiary' | 'disabled'
  | 'danger' | 'success' | 'warning' | 'link' | 'inherit';
export type TextSize = 'xs' | 'sm' | 'md' | 'lg';
export type TextWeight = 'normal' | 'medium' | 'semibold';

const TONE: Record<TextTone, string> = {
  default: 'text-gray-900',
  secondary: 'text-gray-500',
  tertiary: 'text-gray-400',
  disabled: 'text-gray-300',
  danger: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-amber-600',
  link: 'text-blue-600',
  // For text that must take the colour of whatever it sits inside — a solid
  // Banner, a coloured badge. Without this the only escape is a className,
  // which the dark remaps then fight.
  inherit: '',
};

const SIZE: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const WEIGHT: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
};

export interface TextProps {
  children?: ReactNode;
  tone?: TextTone;
  size?: TextSize;
  weight?: TextWeight;
  /** Single-line ellipsis. Sets `title` so the full string stays readable. */
  truncate?: boolean;
  /** Render as something other than a span — `label`, `div`, `p`. */
  as?: ElementType;
  className?: string;
  htmlFor?: string;
  title?: string;
}

export function Text({
  children, tone = 'default', size = 'sm', weight = 'normal', truncate = false,
  as: Tag = 'span', className = '', ...rest
}: TextProps) {
  return (
    <Tag
      className={[TONE[tone], SIZE[size], WEIGHT[weight], truncate ? 'block truncate' : '', className]
        .filter(Boolean).join(' ')}
      // A truncated string is unreadable without this, and it is the one place
      // a title attribute is the right answer rather than a hidden affordance:
      // it restores text the layout removed, it does not hide anything new.
      title={rest.title ?? (truncate && typeof children === 'string' ? children : undefined)}
      htmlFor={rest.htmlFor}
    >
      {children}
    </Tag>
  );
}

export type TitleLevel = 1 | 2 | 3 | 4 | 5;

const TITLE: Record<TitleLevel, string> = {
  1: 'text-2xl font-semibold',
  2: 'text-xl font-semibold',
  3: 'text-lg font-semibold',
  4: 'text-base font-semibold',
  5: 'text-sm font-semibold',
};

export interface TitleProps {
  children?: ReactNode;
  /** Heading level — drives BOTH the tag and the size, so the document
   *  outline and the visual hierarchy cannot drift apart. */
  level?: TitleLevel;
  tone?: TextTone;
  className?: string;
}

export function Title({ children, level = 2, tone = 'default', className = '' }: TitleProps) {
  const Tag = `h${level}` as ElementType;
  return (
    <Tag className={[TITLE[level], TONE[tone], className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}

export interface ParagraphProps {
  children?: ReactNode;
  tone?: TextTone;
  size?: TextSize;
  className?: string;
}

/** Body copy. Carries its own bottom margin so stacked paragraphs breathe;
 *  the last one's margin is removed rather than left to collapse. */
export function Paragraph({ children, tone = 'secondary', size = 'sm', className = '' }: ParagraphProps) {
  return (
    <p className={[TONE[tone], SIZE[size], 'mb-2 last:mb-0', className].filter(Boolean).join(' ')}>
      {children}
    </p>
  );
}
