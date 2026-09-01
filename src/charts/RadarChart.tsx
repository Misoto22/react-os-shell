/**
 * RadarChart — several measures on their own axes, radiating from a centre.
 *
 * This is the hexagon. The grid is a regular polygon with one vertex per axis,
 * so six metrics draw a hexagon, five a pentagon, eight an octagon — the shape
 * is a consequence of how many things you are comparing, not a style. A circular
 * grid is available via `grid="circle"` for the case where the axes are samples
 * of something continuous (a direction, a time of day) rather than distinct
 * measures.
 *
 * Radar is the form most often reached for wrongly, so the constraints are
 * worth stating. It compares PROFILES — the shape of one thing against the
 * shape of another — and it is poor at reading individual values, because the
 * eye judges the area of an irregular polygon badly and area grows with the
 * square of the radius. Three consequences, all enforced here:
 *
 *   - every axis is normalised to a shared 0–max, or given its own `max`, so a
 *     metric measured in thousands cannot flatten one measured in tens;
 *   - the fill stays light and the outline carries the shape, because two
 *     opaque overlapping polygons hide each other;
 *   - the series cap is three, the same all-pairs limit the scatter form has —
 *     past it the polygons cannot be told apart by colour under CVD.
 */
import { useId, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { polygonPoints } from './curve';
import { ChartDefs, maskId } from './effects';
import { useHighlight } from './highlight';
import { angleScale } from './scale';
import AccessibleTable from './AccessibleTable';
import ChartTooltip from './ChartTooltip';
import type { RadarChartProps } from './types';

/** All-pairs colour separation holds for three slots, not eight. */
export const RADAR_SERIES_CAP = 3;

const ring = (points: [number, number][]) =>
  `${points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ')} Z`;

export default function RadarChart({
  axes, series, size = 300, mode = 'area', grid = 'polygon', rings = 4,
  formatValue = v => String(v), animate = true, className, emptyLabel = 'Nothing to compare.',
}: RadarChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { highlighted } = useHighlight();

  const drawn = series.slice(0, RADAR_SERIES_CAP);
  if (axes.length < 3 || drawn.length === 0) {
    return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46;
  const angle = angleScale(axes.length);

  // Per-axis maxima, so a metric in thousands cannot flatten one in tens.
  // An explicit max must still be a usable divisor: `max: 0` or NaN would put
  // 0/0 through the clamp — NaN survives Math.min/max — and silently erase
  // the whole polygon.
  const maxima = axes.map((axis, i) =>
    axis.max != null && Number.isFinite(axis.max) && axis.max > 0
      ? axis.max
      : Math.max(1, ...drawn.map(s => s.values[i] ?? 0).filter(Number.isFinite)));

  const at = (axisIndex: number, value: number): [number, number] => {
    const t = Math.max(0, Math.min(1, value / maxima[axisIndex]));
    const a = angle.center(axisIndex) - angle.step / 2;
    return [cx + radius * t * Math.cos(a), cy + radius * t * Math.sin(a)];
  };

  // Local hover names a series by index; the frame's legend highlight names it
  // by key. Either one recedes the others.
  const dimmed = (si: number, key: string) => {
    if (hover !== null) return hover !== si;
    if (highlighted !== null) return highlighted !== key;
    return false;
  };
  const hoveredSeries = hover !== null ? drawn[hover] : undefined;

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={titleId}
        onMouseLeave={() => setHover(null)}>
        <title id={titleId}>
          {`${drawn.map(s => s.label).join(', ')} across ${axes.length} measures`}
        </title>

        {Array.from({ length: rings }, (_, r) => {
          const rr = (radius * (r + 1)) / rings;
          return grid === 'circle'
            ? <circle key={r} cx={cx} cy={cy} r={rr} fill="none" stroke={CHART_INK.grid} strokeWidth={1} />
            : <path key={r} d={ring(polygonPoints(cx, cy, rr, axes.length))} fill="none" stroke={CHART_INK.grid} strokeWidth={1} />;
        })}

        {axes.map((axis, i) => {
          const [ax, ay] = at(i, maxima[i]);
          return (
            <g key={axis.key}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={CHART_INK.grid} strokeWidth={1} />
              <text
                x={cx + (radius + 18) * Math.cos(angle.center(i) - angle.step / 2)}
                y={cy + (radius + 18) * Math.sin(angle.center(i) - angle.step / 2) + 4}
                textAnchor="middle" fontSize={11} fill={CHART_INK.label}
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        <ChartDefs id={titleId} reveal={animate ? 'center-out' : false} />
        {drawn.map((s, si) => {
          const colour = resolveSeriesColor(si, s.color, s.tone);
          const points = axes.map((_, i) => at(i, s.values[i] ?? 0));
          return (
            <g
              key={s.key} opacity={dimmed(si, s.key) ? 0.3 : 1} onMouseEnter={() => setHover(si)}
              mask={animate ? `url(#${maskId(titleId)})` : undefined}
            >
              {mode === 'area' && <path d={ring(points)} fill={colour} fillOpacity={0.18} stroke="none" />}
              <path d={ring(points)} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
              {points.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={3.5} fill={colour} stroke={CHART_INK.surface} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}
      </svg>

      {hoveredSeries && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hoveredSeries.label}
            rows={axes.map((axis, i) => ({
              key: axis.key,
              label: axis.label,
              color: resolveSeriesColor(hover!, hoveredSeries.color, hoveredSeries.tone),
              value: formatValue(hoveredSeries.values[i] ?? 0),
            }))}
          />
        </div>
      )}

      {/* Identity was carried by colour alone — the one channel a chart may
          never rely on. The same swatch list the pie draws. */}
      <ul className="m-0 mt-3 grid gap-1 p-0" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
        {drawn.map((s, si) => (
          <li key={s.key} className="flex list-none items-center gap-2 text-xs text-gray-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: resolveSeriesColor(si, s.color, s.tone) }} />
            <span className="flex-1 truncate">{s.label}</span>
          </li>
        ))}
      </ul>

      <AccessibleTable
        caption={`${drawn.map(s => s.label).join(', ')} across ${axes.length} measures`}
        head={['Series', ...axes.map(axis => axis.label)]}
        rows={drawn.map(s => [s.label, ...axes.map((_, i) => formatValue(s.values[i] ?? 0))])}
      />
    </div>
  );
}
