/**
 * Tabs — a controlled in-content tab strip. The consumer owns the active id
 * (`value` + `onChange`) and renders the body for the active tab itself; this
 * component is just the strip. For app-level navigation use TopNav instead.
 *
 * `underline` (default) is the classic bordered tab row; `pill` is a segmented
 * control whose active segment fills with the accent (dark-mode safe).
 *
 * Keyboard: the strip is one tab stop, and the arrow keys move between tabs
 * inside it (Home / End jump to the ends, disabled tabs are skipped, and the
 * ends wrap). This is the roving-tabindex pattern ARIA specifies for a
 * tablist, and it is not optional — `tabIndex={-1}` on the inactive tabs is
 * what keeps the strip to a single stop, so without the arrow keys those tabs
 * cannot be reached by keyboard at all.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

const LIST_CLASS: Record<'underline' | 'pill', string> = {
  underline: 'flex items-center gap-1 border-b border-gray-200',
  pill: 'inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1',
};

function tabClass(variant: 'underline' | 'pill', active: boolean): string {
  if (variant === 'pill') {
    return `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`;
  }
  return `-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    active
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
  }`;
}

export default function Tabs({ items, value, onChange, variant = 'underline', className = '' }: TabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Walks in `step` direction from `from`, wrapping, until it finds a tab that
  // can take focus. Bounded by the item count so an all-disabled strip — which
  // is a legitimate empty state — returns rather than spinning.
  const step = (from: number, direction: 1 | -1): number | null => {
    for (let i = 1; i <= items.length; i += 1) {
      const at = (((from + direction * i) % items.length) + items.length) % items.length;
      if (!items[at]?.disabled) return at;
    }
    return null;
  };

  const edge = (direction: 1 | -1): number | null => {
    const order = direction === 1 ? items.map((_, i) => i) : items.map((_, i) => items.length - 1 - i);
    for (const i of order) if (!items[i]?.disabled) return i;
    return null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = items.findIndex(t => t.id === value);
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = step(current, 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = step(current, -1);
    else if (event.key === 'Home') next = edge(1);
    else if (event.key === 'End') next = edge(-1);
    else return;

    event.preventDefault();
    if (next === null || next === current) return;
    onChange(items[next].id);
    // Selection follows focus, which is the automatic-activation form of the
    // pattern — right here, where switching a tab is cheap and the panel is
    // already rendered by the consumer.
    buttons.current[next]?.focus();
  };

  return (
    <div role="tablist" onKeyDown={onKeyDown} className={`${LIST_CLASS[variant]} ${className}`.trim()}>
      {items.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={el => { buttons.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={tabClass(variant, active)}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
