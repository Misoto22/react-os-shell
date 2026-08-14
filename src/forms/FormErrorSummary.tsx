/**
 * FormErrorSummary — the error list at the top of a failed form.
 *
 * `FormField` announces its own error, which is right for one field and
 * useless as a map: a long form that fails validation in three places gives
 * a keyboard or screen-reader user no way to know how many problems there
 * are or where. This is the WCAG 3.3.1 pattern (as GOV.UK ships it): a
 * summary box that takes focus when the errors appear, listing each message
 * as a link that focuses the offending control.
 *
 * The links target CONTROL IDS — the same `htmlFor`/`id` the caller already
 * wires into FormField — so adopting the summary costs a list of
 * `{ fieldId, message }`, not a rewire. Renders nothing while `errors` is
 * empty, so it can sit permanently above the form.
 */
import { useEffect, useRef, type ReactNode } from 'react';

import { useShellStrings } from '../shell/strings';

export interface FormError {
  /** id of the offending control — the link focuses and scrolls to it. */
  fieldId: string;
  message: ReactNode;
}

export interface FormErrorSummaryProps {
  errors: FormError[];
  /** Heading above the list. Defaults to the catalog's "There is a problem". */
  title?: ReactNode;
  /**
   * Move focus to the box when errors appear. Default true — focus is what
   * makes the failed submit perceivable without a screen reader announcing
   * it, and what puts the keyboard where the fixing starts. Turn it off only
   * when something else owns post-submit focus.
   */
  autoFocus?: boolean;
  className?: string;
}

export default function FormErrorSummary({ errors, title, autoFocus = true, className = '' }: FormErrorSummaryProps) {
  const strings = useShellStrings();
  const boxRef = useRef<HTMLDivElement>(null);
  const hadErrors = useRef(false);

  // Focus when the summary APPEARS — not on every re-render while the user
  // works through the list, which would yank them back to the top per fix.
  useEffect(() => {
    const has = errors.length > 0;
    if (has && !hadErrors.current && autoFocus) boxRef.current?.focus();
    hadErrors.current = has;
  }, [errors.length > 0, autoFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  if (errors.length === 0) return null;

  const focusField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).focus();
  };

  return (
    <div
      ref={boxRef}
      role="alert"
      tabIndex={-1}
      className={`rounded-md border border-red-300 bg-red-50 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${className}`.trim()}
    >
      <h2 className="text-sm font-semibold text-red-800">{title ?? strings.form.errorSummaryTitle}</h2>
      <ul className="mt-1.5 space-y-1">
        {errors.map((e, i) => (
          <li key={`${e.fieldId}-${i}`}>
            <a
              href={`#${e.fieldId}`}
              onClick={event => { event.preventDefault(); focusField(e.fieldId); }}
              className="text-sm text-red-700 underline hover:text-red-900"
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
