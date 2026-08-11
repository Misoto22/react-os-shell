/**
 * Statistic — one measured number with its label, for a summary strip.
 *
 * `StatCard` is the card-shaped sibling: this plus a surface, a border and an
 * optional trend pill. They are kept separate because a row of six figures
 * inside one panel should not be six bordered cards, and a dashboard tile
 * should not be a bare number floating on the page. Use this when something
 * else already provides the container.
 *
 * Figures are `tabular-nums` so a column of them aligns on the decimal point
 * and a changing value does not make the layout twitch.
 */
import { type ReactNode } from 'react';

export type StatisticSize = 'sm' | 'md' | 'lg';
export type StatisticTone = 'default' | 'success' | 'danger' | 'muted';

const VALUE_SIZE: Record<StatisticSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

const TONE: Record<StatisticTone, string> = {
  default: 'text-gray-900',
  success: 'text-green-600',
  danger: 'text-red-600',
  muted: 'text-gray-500',
};

export interface StatisticProps {
  title?: ReactNode;
  value: ReactNode;
  /** Fixed decimal places. Applied only to a numeric `value`. */
  precision?: number;
  /** Sits before/after the figure at a smaller size — a currency mark, a unit. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  tone?: StatisticTone;
  size?: StatisticSize;
  className?: string;
}

export default function Statistic({
  title, value, precision, prefix, suffix, tone = 'default', size = 'md', className = '',
}: StatisticProps) {
  const shown = typeof value === 'number' && precision != null ? value.toFixed(precision) : value;
  return (
    <div className={className}>
      {title && <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</div>}
      <div className={`mt-1 flex items-baseline gap-1 ${TONE[tone]}`}>
        {prefix && <span className="text-sm">{prefix}</span>}
        <span className={`font-semibold tabular-nums ${VALUE_SIZE[size]}`}>{shown}</span>
        {suffix && <span className="text-sm">{suffix}</span>}
      </div>
    </div>
  );
}
