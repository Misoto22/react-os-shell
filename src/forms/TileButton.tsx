/**
 * TileButton — a large, self-labelling tile for a grid of choices: a product in
 * a catalogue, a payment method, a register.
 *
 * Distinct from `Button` rather than a size of it, because the content model
 * differs: a Button holds one label on one line, a tile holds a title and a
 * subtitle stacked and left-aligned, and stays a fixed height so a grid of them
 * lines up whether or not each has a subtitle.
 *
 * Text is left-aligned, not centred: in a grid the eye scans down the left edge
 * looking for a name, and centring makes every row start somewhere different.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type TileSize = 'md' | 'lg';

export interface TileButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'title'> {
  /** Primary line — the thing being chosen. */
  title: ReactNode;
  /** Secondary line: a price, a count, a reason it is unavailable. */
  subtitle?: ReactNode;
  size?: TileSize;
  /** Draw as chosen. Uses a ring rather than a fill so the label stays legible. */
  selected?: boolean;
  className?: string;
}

const SIZES: Record<TileSize, string> = {
  md: 'h-24 p-3',
  lg: 'h-32 p-4',
};

const TileButton = forwardRef<HTMLButtonElement, TileButtonProps>(function TileButton(
  { title, subtitle, size = 'lg', selected = false, disabled, type = 'button', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-pressed={selected || undefined}
      className={[
        'flex w-full flex-col justify-between rounded-xl border text-left transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-400/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-400/40' : 'border-gray-200 bg-white hover:bg-gray-50',
        SIZES[size],
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className="line-clamp-2 font-medium text-gray-900">{title}</span>
      {subtitle != null && <span className="text-sm text-gray-500">{subtitle}</span>}
    </button>
  );
});

export default TileButton;
