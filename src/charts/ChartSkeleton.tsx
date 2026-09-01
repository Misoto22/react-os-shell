/**
 * ChartSkeleton — what a chart shows before it has ever had data.
 *
 * EvilCharts ships a loading state on every one of its charts; this family had
 * none, so a slow endpoint left an empty box that reads as "broken" rather than
 * "coming". The shimmer is the same idea: a soft band sweeping across a
 * plausible chart-shaped placeholder.
 *
 * The distinction this component exists to enforce is between two states that
 * are usually collapsed into one `loading` flag, and must not be:
 *
 *   **First load** — there is no data yet, so there is nothing to hold. Show
 *   the skeleton, at the chart's real height, so the arriving chart does not
 *   shove the page.
 *
 *   **Refetch** — data is already on screen. Showing a skeleton here throws
 *   away a correct render to display a fake one, and on a polling dashboard it
 *   strobes. `ChartFrame`'s `busy` holds the previous render at reduced opacity
 *   instead. A chart that flashes its skeleton on every poll is the canonical
 *   version of this mistake.
 *
 * The placeholder's shape is deliberately generic — a grid and a soft mound,
 * not a fake series. A skeleton that mimics real data teaches the reader a
 * shape that is about to be replaced by a different one, and for a beat they
 * believe it.
 */
import { useId } from 'react';

import { CHART_INK } from './palette';
import type { ChartSkeletonProps } from './types';

export default function ChartSkeleton({
  height = 220,
  width = 720,
  variant = 'area',
  bars = 9,
  label = 'Loading chart data',
  className,
}: ChartSkeletonProps) {
  const id = useId();
  const shimmerId = `${id}-shimmer`;
  const left = 48;
  const right = width - 16;
  const top = 12;
  const bottom = height - 26;
  const rows = 4;

  return (
    <div className={className}>
      <svg
        width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
        role="img" aria-label={label} aria-busy="true"
      >
        <defs>
          {/* A band, not a hard edge: the sweep feathers in and out so it reads
              as light moving across a surface rather than a rectangle sliding. */}
          <linearGradient id={shimmerId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_INK.surface} stopOpacity="0" />
            <stop offset="45%" stopColor={CHART_INK.surface} stopOpacity="0.55" />
            <stop offset="55%" stopColor={CHART_INK.surface} stopOpacity="0.55" />
            <stop offset="100%" stopColor={CHART_INK.surface} stopOpacity="0" />
          </linearGradient>
        </defs>

        {Array.from({ length: rows + 1 }, (_, i) => {
          const y = top + ((bottom - top) * i) / rows;
          return (
            <line
              key={i} x1={left} y1={y} x2={right} y2={y}
              stroke={CHART_INK.grid} strokeWidth={1} shapeRendering="crispEdges"
            />
          );
        })}

        {/* Axis-tick placeholders, so the plot does not shift left when real
            labels arrive and claim the gutter. */}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <rect
            key={`t${i}`} x={left - 30} y={top + ((bottom - top) * i) / rows - 4}
            width={22} height={8} rx={4} fill={CHART_INK.grid}
          />
        ))}

        {variant === 'bars' ? (
          Array.from({ length: bars }, (_, i) => {
            const slot = (right - left) / bars;
            // A fixed, unremarkable profile rather than a random one: a
            // skeleton that changes between renders reads as data.
            const share = 0.35 + 0.4 * Math.abs(Math.sin((i + 1) * 1.1));
            const barHeight = (bottom - top) * share;
            return (
              <rect
                key={i} x={left + i * slot + slot * 0.18} y={bottom - barHeight}
                width={slot * 0.64} height={barHeight} rx={3} fill={CHART_INK.grid}
              />
            );
          })
        ) : (
          <path
            d={`M${left},${bottom} C${left + (right - left) * 0.25},${top + (bottom - top) * 0.35} ${left + (right - left) * 0.55},${top + (bottom - top) * 0.15} ${right},${top + (bottom - top) * 0.55} L${right},${bottom} Z`}
            fill={CHART_INK.grid}
          />
        )}

        {/* The sweep. Twice the plot width and translated across it, so the
            band is fully off-screen at both ends of the cycle. */}
        <rect
          className="rosh-viz-shimmer"
          x={-width} y={0} width={width} height={height}
          fill={`url(#${shimmerId})`}
        />
      </svg>
    </div>
  );
}
