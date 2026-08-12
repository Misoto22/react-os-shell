/**
 * Result — the full-page outcome state: a 404, a 403, a crashed boundary, a
 * completed checkout.
 *
 * `EmptyState` is the neighbour to know about. That one means "this list has
 * nothing in it yet", which is normal and usually actionable. This one means
 * something ENDED — succeeded, failed, or was refused — and it is the whole
 * page rather than a region of one. `ErrorPage` is this component wrapped in a
 * full-screen frame.
 */
import { type ReactNode } from 'react';

export type ResultStatus = 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500';

export interface ResultProps {
  status?: ResultStatus;
  title?: ReactNode;
  subTitle?: ReactNode;
  /** Actions — usually one primary route out. Always give the user one. */
  extra?: ReactNode;
  /** Replace the status glyph entirely. */
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

type Tone = 'success' | 'error' | 'warning' | 'info';

const STATUS_TONE: Record<ResultStatus, Tone> = {
  success: 'success', error: 'error', warning: 'warning', info: 'info',
  // A missing page is not an error the user made, and colouring it red says it
  // was. Refused and broken are genuinely different from not-found.
  404: 'info', 403: 'warning', 500: 'error',
};

const TONE_CLASS: Record<Tone, string> = {
  success: 'text-green-600 bg-green-100',
  error: 'text-red-600 bg-red-100',
  warning: 'text-amber-600 bg-amber-100',
  info: 'text-blue-600 bg-blue-100',
};

/** Default copy, so the common cases need only `status`. */
const DEFAULT_TITLE: Partial<Record<ResultStatus, string>> = {
  404: 'Page not found',
  403: "You don't have access to this",
  500: 'Something went wrong',
};

function StatusIcon({ tone }: { tone: Tone }) {
  const common = { className: 'h-6 w-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true } as const;
  switch (tone) {
    case 'success':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
    case 'error':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
    case 'warning':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>;
    default:
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
  }
}

export default function Result({
  status = 'info', title, subTitle, extra, icon, children, className = '',
}: ResultProps) {
  const tone = STATUS_TONE[status];
  // WCAG 4.1.3. A Result that reports a failure is a status message: it appears
  // without the user moving focus, so a screen-reader user is told nothing
  // unless it announces itself. `alert` is assertive, which is right for a
  // failure and wrong for everything else — an outcome someone asked for
  // (a completed checkout) or a neutral one (an empty cart) would interrupt
  // whatever they were reading to say something they already expected.
  const announces = tone === 'error';
  return (
    <div
      role={announces ? 'alert' : undefined}
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`.trim()}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${TONE_CLASS[tone]}`}>
        {icon ?? <StatusIcon tone={tone} />}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        {title ?? DEFAULT_TITLE[status] ?? ''}
      </h2>
      {subTitle && <p className="mt-1 max-w-md text-sm text-gray-500">{subTitle}</p>}
      {children && <div className="mt-4 w-full max-w-md text-left">{children}</div>}
      {extra && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{extra}</div>}
    </div>
  );
}
