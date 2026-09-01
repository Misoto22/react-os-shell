/**
 * PieChart — part-to-whole, as a pie, a ring, or a Nightingale rose.
 *
 * `DonutChart` already exists and stays: it is the decorative tile version, a
 * fixed-size ring with a centre label and no axis. This one is the analytical
 * sibling — it labels its slices, states percentages, and refuses the things a
 * pie is bad at.
 *
 * The refusals are the point:
 *
 *   - **Six segments, then "Other".** Past roughly six slices adjacent wedges
 *     stop being distinguishable and the reader is consulting the legend for
 *     every one. `maxSegments` folds the tail rather than generating a seventh
 *     and eighth hue.
 *   - **Two slices is not a chart.** A pie of 60/40 is a sentence; the caller
 *     gets a warning-free render but the form to reach for is a stat tile.
 *   - **`rose` encodes value as RADIUS, not angle.** Florence Nightingale's
 *     rose gives every category the same wedge angle and varies the radius,
 *     which is why it is the right form for cyclical categories — months,
 *     hours, compass points — where the equal angles carry the cycle. It is
 *     also the variant most often misread, because area grows with the square
 *     of the radius, so the radius is square-rooted here rather than scaled
 *     directly.
 */
import { useId, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { arcPath } from './curve';
import { MOTION, stagger } from './effects';
import { useHighlight } from './highlight';
import { angleScale } from './scale';
import ChartTooltip from './ChartTooltip';
import type { PieChartProps } from './types';

export default function PieChart({
  segments, variant = 'pie', size = 280, innerRadius, padAngle = 0.012,
  maxSegments = 6, otherLabel = 'Other', formatValue = v => String(v),
  centerLabel, animate = true, labels = 'none', labelMinShare = 0.04,
  className, emptyLabel = 'Nothing to break down.',
}: PieChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { highlighted } = useHighlight();

  const positive = segments.filter(s => s.value > 0);
  if (positive.length === 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  // Fold the tail rather than reaching for a seventh hue.
  const sorted = [...positive].sort((a, b) => b.value - a.value);
  const kept = sorted.slice(0, maxSegments);
  const tail = sorted.slice(maxSegments);
  const shown = tail.length > 0
    ? [...kept, { key: '__other__', label: otherLabel, value: tail.reduce((n, s) => n + s.value, 0) }]
    : kept;

  const total = shown.reduce((n, s) => n + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 12;
  const inner = innerRadius ?? (variant === 'ring' ? outer * 0.58 : 0);
  const angle = angleScale(shown.length, padAngle);

  // Rose: equal angles, radius carries the value — square-rooted, because the
  // wedge's AREA is what the eye reads.
  const maxValue = Math.max(...shown.map(s => s.value));
  const roseRadius = (value: number) =>
    inner + (outer - inner) * Math.sqrt(Math.max(0, value) / maxValue);

  let cursor = -Math.PI / 2;

  // Outside labels, laid out before the wedges so the geometry is one pass.
  //
  // Two rules keep the fan readable. A slice below `labelMinShare` gets no
  // label at all — a dozen leader lines converging on slivers is less readable
  // than the legend already below, not more. And labels on the same side are
  // pushed apart to a minimum gap rather than allowed to overlap: a collided
  // pair is two labels neither of which can be read.
  const LEADER = 14;
  const LINE_HEIGHT = 15;
  const outside = (() => {
    if (labels !== 'outside') return [];
    let angle = -Math.PI / 2;
    const placed = shown.map((segment, i) => {
      const sweep = variant === 'rose' ? angleScale(shown.length, padAngle).step : (segment.value / total) * Math.PI * 2;
      const mid = variant === 'rose'
        ? angleScale(shown.length, padAngle).center(i)
        : angle + sweep / 2;
      angle += sweep;
      const radius = variant === 'rose' ? roseRadius(segment.value) : outer;
      return {
        key: segment.key,
        label: segment.label,
        share: segment.value / total,
        right: Math.cos(mid) >= 0,
        anchor: [cx + radius * Math.cos(mid), cy + radius * Math.sin(mid)] as const,
        y: cy + (radius + LEADER) * Math.sin(mid),
        index: i,
      };
    }).filter(entry => entry.share >= labelMinShare);

    for (const side of [true, false]) {
      const column = placed.filter(entry => entry.right === side).sort((a, b) => a.y - b.y);
      for (let i = 1; i < column.length; i += 1) {
        if (column[i].y - column[i - 1].y < LINE_HEIGHT) column[i].y = column[i - 1].y + LINE_HEIGHT;
      }
    }
    return placed;
  })();

  // Local hover names a slice by index; the frame's legend highlight names it
  // by key. Either one recedes the others.
  const dimmed = (i: number, key: string) => {
    if (hover !== null) return hover !== i;
    if (highlighted !== null) return highlighted !== key;
    return false;
  };
  const hoveredSegment = hover !== null ? shown[hover] : undefined;

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}>
        <title id={titleId}>{`Breakdown of ${formatValue(total)} across ${shown.length} segments`}</title>
        {shown.map((segment, i) => {
          const colour = resolveSeriesColor(i, segment.color, segment.tone);
          const start = variant === 'rose' ? angle(i) : cursor;
          const sweep = variant === 'rose' ? angle.step : (segment.value / total) * Math.PI * 2 - padAngle;
          if (variant !== 'rose') cursor += (segment.value / total) * Math.PI * 2;
          const end = start + Math.max(0.001, sweep);
          const radius = variant === 'rose' ? roseRadius(segment.value) : outer;
          return (
            <path
              key={segment.key} d={arcPath(cx, cy, inner, radius, start, end)}
              fill={colour} fillOpacity={dimmed(i, segment.key) ? 0.4 : 1}
              stroke={CHART_INK.surface} strokeWidth={1}
              className={animate ? MOTION.sweep : undefined}
              style={animate ? stagger(i, 55) : undefined}
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {outside.map(entry => {
          const edge = entry.right ? size - 6 : 6;
          const elbow = entry.right ? size - 58 : 58;
          return (
            <g key={`lbl-${entry.key}`}>
              <polyline
                points={`${entry.anchor[0].toFixed(1)},${entry.anchor[1].toFixed(1)} ${elbow},${entry.y.toFixed(1)} ${edge},${entry.y.toFixed(1)}`}
                fill="none" stroke={CHART_INK.grid} strokeWidth={1}
              />
              <text
                x={edge} y={entry.y - 2} fontSize={10.5} fill={CHART_INK.label}
                textAnchor={entry.right ? 'end' : 'start'}
              >
                {entry.label}
              </text>
              <text
                x={edge} y={entry.y + 10} fontSize={10.5} fontWeight={600} fill={CHART_INK.label}
                textAnchor={entry.right ? 'end' : 'start'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {`${(entry.share * 100).toFixed(1)}%`}
              </text>
            </g>
          );
        })}
        {centerLabel && inner > 0 && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={600} fill={CHART_INK.label}>
            {centerLabel}
          </text>
        )}
      </svg>

      {hoveredSegment && hover !== null && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hoveredSegment.label}
            rows={[
              { key: 'value', label: 'Value', color: resolveSeriesColor(hover, hoveredSegment.color, hoveredSegment.tone), value: formatValue(hoveredSegment.value) },
              { key: 'share', label: 'Share', color: CHART_INK.muted, value: `${((hoveredSegment.value / total) * 100).toFixed(1)}%` },
            ]}
          />
        </div>
      )}

      <ul className="m-0 mt-3 grid gap-1 p-0" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
        {shown.map((segment, i) => (
          <li key={segment.key} className="flex list-none items-center gap-2 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: resolveSeriesColor(i, segment.color, segment.tone) }} />
            <span className="flex-1 truncate">{segment.label}</span>
            <span className="tabular-nums text-gray-800">{((segment.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
