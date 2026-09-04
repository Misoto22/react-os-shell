/**
 * FormField — label + control + hint/error wrapper. The standard row for every
 * form in the kit: pass a control as `children`, a `label` (wired to it via
 * `htmlFor`), and either a `hint` (greyed helper) or an `error` (red, takes
 * precedence). Promotes the `Field` helper the demos used inline.
 *
 * The hint and the error are POINTED AT by the control, not merely rendered
 * near it: a single element child is cloned with `aria-describedby`. Without
 * that the ids this component generates reference nothing, and a screen-reader
 * user who focuses a field that failed validation hears the label and
 * "invalid" and never the reason. `role="alert"` announces the message the
 * moment it appears; `aria-describedby` is what re-reads it on focus, and only
 * the second survives tabbing back to fix the field.
 *
 * The same clone carries `aria-invalid` while `error` is set. Every input in
 * the kit takes an `invalid` prop, so a caller had to pass the error here and
 * `invalid` there and keep the two in step by hand — and a field that missed
 * one is announced as valid while a red message sits under it. `error` is
 * already the statement that the field failed; nothing is learnt by being told
 * twice. A control that sets its own `aria-invalid` keeps it, so
 * `Input invalid` and the rest stay authoritative over their own attribute.
 *
 * `MediaUploadField` and `MediaUploadGrid` already wire exactly this by hand,
 * which is where the id shape comes from.
 */
import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

export interface FormFieldProps {
  label?: ReactNode;
  /** id of the control, for label-for wiring. */
  htmlFor?: string;
  /** id for the `<label>` element itself, so a non-labelable control (e.g. a
   *  `role="group"` wrapper) can name itself via `aria-labelledby`. */
  labelId?: string;
  /** Greyed helper text below the control. */
  hint?: ReactNode;
  /** Red error text below the control — overrides `hint` when present. */
  error?: ReactNode;
  /** Append a red asterisk to the label. */
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label, htmlFor, labelId, hint, error, required, className = '', children,
}: FormFieldProps) {
  const describedBy = htmlFor
    ? (error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined)
    : undefined;

  // Only a single element child can be pointed at, and an existing
  // `aria-describedby` is kept and appended to rather than replaced — a
  // control may already describe itself with something this component knows
  // nothing about. Anything else (a fragment, a string, several controls in a
  // group) is left exactly as it was, and the caller wires it by hand as the
  // media fields do.
  type Described = { 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' };
  const child = Children.count(children) === 1 ? Children.only(children) : null;
  const element = isValidElement<Described>(child) ? child : null;
  const patch: Described = {};
  if (element) {
    if (describedBy) {
      patch['aria-describedby'] = [element.props['aria-describedby'], describedBy]
        .filter(Boolean).join(' ');
    }
    // Only ADD it. A control that states its own — `Input invalid={false}` on a
    // field the caller means to show an error under without marking invalid —
    // is the authority on its own attribute.
    if (error && element.props['aria-invalid'] === undefined) patch['aria-invalid'] = true;
  }
  const described = element && Object.keys(patch).length > 0
    ? cloneElement(element, patch)
    : children;

  return (
    <div className={className}>
      {label && (
        <label id={labelId} htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-gray-600">
          {label}
          {/* Decoration. `required` on the control is what assistive
              technology reads; exposed here it becomes part of the label —
              "Company name star" — on every required field of every form. */}
          {required && <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {described}
      {error ? (
        // A validation message appears after the user submits, without focus
        // moving to it. Without a live region it reaches nobody — and this is
        // the one status message a form cannot afford to lose.
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1 text-[11px] text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-[11px] text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}
