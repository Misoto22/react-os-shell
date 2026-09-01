/**
 * Meter — one ratio against one target, on one track.
 *
 * Carbon ships this as `meter` and `bullet`, Grafana as a bar gauge; the shape
 * everyone converges on is a filled track with the objective marked ON it, so
 * "are we over the line" is a spatial question rather than an arithmetic one.
 *
 * It exists here because the alternative keeps getting reached for and is
 * always worse. An attainment figure drawn as a time series is a flat line
 * pinned at the top of a plot, and it has to borrow a second y-axis to get
 * there — which is how the EFFICIENT Observability console ended up with a
 * percentage scale glued to the right of a millisecond chart. A ratio is not a
 * trend; give it the form that has somewhere to put the target.
 *
 * Tone is derived, not passed: at or above the objective is `good`, below it is
 * `critical`, and the caller can override when the domain disagrees. Status
 * colour never travels alone here — the value and the objective are both
 * written out, so the meaning survives greyscale, CVD and forced-colors.
 */
import { STATUS_VARS, type StatusTone } from './palette';
import type { MeterProps } from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Meter({
  value,
  objective,
  label,
  detail,
  formatValue = v => `${(v * 100).toFixed(1)}%`,
  tone,
  className,
  unavailableLabel = 'Not enough eligible requests to judge.',
}: MeterProps) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <div className={className}>
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        <p className="mt-1 text-sm text-gray-500">{unavailableLabel}</p>
      </div>
    );
  }

  const filled = clamp01(value);
  const met = objective == null || value >= objective;
  const colour = STATUS_VARS[tone ?? (met ? 'good' : 'critical')];

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: colour }}>
          {formatValue(value)}
        </span>
      </div>
      <div
        className="relative w-full rounded-full bg-gray-100"
        style={{ height: 12 }}
        role="meter"
        aria-valuenow={Number((value * 100).toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${(filled * 100).toFixed(2)}%`, backgroundColor: colour }}
        />
        {objective != null && (
          <span
            className="absolute top-[-4px] w-0.5 rounded-full bg-gray-600"
            style={{ left: `${(clamp01(objective) * 100).toFixed(2)}%`, height: 20 }}
            aria-hidden="true"
          />
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {detail}
        {objective != null && (
          <>
            {detail ? ' · ' : ''}
            objective {formatValue(objective)}
            {met ? ' met' : ' missed'}
          </>
        )}
      </p>
    </div>
  );
}

export type { StatusTone };
