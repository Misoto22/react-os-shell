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
import { CHART_INK, STATUS_VARS } from './palette';
import type { MeterProps } from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Meter({
  value,
  segments,
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
  const verdictTone = tone ?? (met ? 'good' : 'critical');
  const colour = STATUS_VARS[verdictTone];

  // One caption line, whatever it is made of. A segmented meter used to add a
  // SECOND paragraph beside this one, so a meter with segments and an
  // objective printed two stacked grey lines where every other form of this
  // control prints one.
  const caption = [
    segments?.length
      ? segments.map(seg => `${seg.label} ${formatValue(seg.value)}`).join(' · ')
      : '',
    detail ?? '',
    objective != null ? `objective ${formatValue(objective)}${met ? ' met' : ' missed'}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: colour }}>
          {formatValue(value)}
        </span>
      </div>
      {/* bg-gray-200, not bg-gray-100: ui.css remaps gray-100 to the same
          `--surface` token the host card takes in dark mode, which made the
          track invisible there. gray-200 maps to `--surface-raised`. */}
      <div
        className="relative w-full rounded-full bg-gray-200"
        style={{ height: 12 }}
        role="meter"
        aria-valuenow={Number((filled * 100).toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={formatValue(value)}
        aria-label={label}
      >
        {segments?.length ? (
          // Laid end to end in one track. The container keeps the track's
          // radius and clips to it, and the last part rounds its own trailing
          // edge, so a segmented meter ends the way the single-value fill does
          // rather than on a square cut mid-track; the joins between parts stay
          // square, so the split stays visible.
          //
          // `shrink-0` is load-bearing. Flex items shrink by default, so a set
          // of segments summing past the track was RESCALED to fit rather than
          // clipped — an 80/50 pair rendering as 61.5/38.5 — which disagrees
          // with both the written breakdown below and the objective marker,
          // silently and in the reader's favour. Held at their stated widths,
          // the excess is clipped, which is what the overflow rule is for.
          <div className="flex h-full overflow-hidden rounded-full">
            {segments.map((seg, i) => (
              <div
                key={`${seg.label}-${i}`}
                className={`h-full shrink-0${i === segments.length - 1 ? ' rounded-r-full' : ''}`}
                style={{
                  width: `${(clamp01(seg.value) * 100).toFixed(2)}%`,
                  // The first part carries the meter's own verdict, not a
                  // hard-coded `good`: a missed objective painted the readout
                  // red and the bar under it green.
                  backgroundColor: STATUS_VARS[seg.tone ?? (i === 0 ? verdictTone : 'neutral')],
                }}
              />
            ))}
          </div>
        ) : (
          <div
            className="h-full rounded-full"
            style={{ width: `${(filled * 100).toFixed(2)}%`, backgroundColor: colour }}
          />
        )}
        {/* Inline ink, not a gray class: bg-gray-600 has no dark remap in
            ui.css, so the objective marker vanished against a dark track. */}
        {objective != null && (
          <span
            className="absolute top-[-4px] w-0.5 rounded-full"
            style={{ left: `${(clamp01(objective) * 100).toFixed(2)}%`, height: 20, backgroundColor: CHART_INK.axis }}
            aria-hidden="true"
          />
        )}
      </div>
      {/* Colour never travels alone: each part is named with its share, so a
          segmented meter survives greyscale, CVD and forced-colors exactly as
          the single-value form's written-out value does. */}
      {caption && <p className="mt-1.5 text-xs text-gray-500">{caption}</p>}
    </div>
  );
}

