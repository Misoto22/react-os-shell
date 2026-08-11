/**
 * NumericKeypad — an on-screen number pad for amount entry.
 *
 * Exists because a touch device's own keyboard is the wrong tool for money: it
 * covers the bottom half of the screen (on a till, the cart), it offers letters
 * nobody wants, and its layout moves between OS versions. A field driven by
 * this sets `inputMode="none"` so the OS keyboard never appears at all.
 *
 * Controlled, and its value is a STRING — see `./keypadInput` for why, and for
 * the press rules themselves, which live there as pure functions.
 *
 * Keys are `Button size="touch-xl"` (80px). That is not a decorative choice:
 * this is the control a cashier hits most often, usually without looking, while
 * a queue watches.
 */
import { type ReactNode } from 'react';
import Button from './Button';
import { appendKey, backspace } from './keypadInput';

export interface NumericKeypadProps {
  value: string;
  onChange: (next: string) => void;
  /** Renders a full-width Enter key below the pad when provided. */
  onEnter?: () => void;
  /** Label for that key — name the action ("Tender", "Add"), not "Enter". */
  enterLabel?: ReactNode;
  enterDisabled?: boolean;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'] as const;

export default function NumericKeypad({
  value, onChange, onEnter, enterLabel = 'Enter', enterDisabled, className = '',
}: NumericKeypadProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`.trim()}>
      {KEYS.map(key => (
        <Button
          key={key}
          size="touch-xl"
          variant="secondary"
          onClick={() => onChange(appendKey(value, key))}
        >
          {key}
        </Button>
      ))}
      <Button
        size="touch-xl"
        variant="secondary"
        aria-label="Backspace"
        onClick={() => onChange(backspace(value))}
      >
        ⌫
      </Button>
      {onEnter && (
        <Button
          size="touch-xl"
          variant="primary"
          className="col-span-3"
          disabled={enterDisabled}
          onClick={onEnter}
        >
          {enterLabel}
        </Button>
      )}
    </div>
  );
}
