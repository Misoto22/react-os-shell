/**
 * ChartBrush — a range selector under a time series.
 *
 * The strip shows the WHOLE series in miniature with the selected window lit,
 * which is the part that makes a brush honest rather than merely convenient: a
 * chart that only draws the selection tells the reader nothing about what they
 * are not looking at, and a window chosen inside a spike reads as a plateau
 * when the spike is off-screen.
 *
 * Two things a brush usually gets wrong, handled here:
 *
 *   **Keyboard.** A drag-only control is unusable by anyone not holding a
 *   mouse, and range selection is exactly the interaction that gets shipped
 *   drag-only. Both handles are `role="slider"` with arrow-key movement, so the
 *   window can be set without a pointer, and `aria-valuetext` reads the LABEL
 *   rather than the index — "00:14", not "2".
 *
 *   **The y-axis moves.** Narrowing the window rescales the plot above, so the
 *   same line changes shape. That is correct — it is what zooming is for — but
 *   it means a reader who looks away and back can misread the amplitude, which
 *   is the second reason the strip keeps the full series in view.
 *
 * The handles cannot cross, and the window cannot collapse: a zero-width
 * selection has nothing to show and would leave the chart above empty with no
 * way back except a mouse.
 */
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import type { ChartBrushProps } from './types';

const HANDLE_WIDTH = 9;

export default function ChartBrush({
  labels,
  data,
  range,
  onRangeChange,
  height = 46,
  width = 720,
  color,
  className,
}: ChartBrushProps) {
  const track = useRef<SVGSVGElement>(null);
  const last = labels.length - 1;
  const [from, to] = range;
  const hue = color ?? resolveSeriesColor(0);

  const xAt = (index: number) => (last === 0 ? 0 : (index / last) * width);
  const indexAt = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width === 0) return from;
    const ratio = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    return Math.round(ratio * last);
  };

  const finite = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const peak = Math.max(...finite, 1);
  const yAt = (value: number | null) =>
    value === null ? height : height - (value / peak) * (height - 6);

  const outline = labels
    .map((_, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(data[i] ?? null).toFixed(2)}`)
    .join(' ');

  const move = (edge: 'from' | 'to', next: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    // The handles cannot cross and the window cannot collapse: a zero-width
    // selection leaves the plot above empty with no keyboard way back.
    if (edge === 'from') onRangeChange([Math.min(clamped, to - 1), to]);
    else onRangeChange([from, Math.max(clamped, from + 1)]);
  };

  const onKey = (edge: 'from' | 'to') => (event: KeyboardEvent<SVGRectElement>) => {
    const step = event.shiftKey ? 5 : 1;
    const current = edge === 'from' ? from : to;
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(edge, current - step); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(edge, current + step); }
    if (event.key === 'Home') { event.preventDefault(); move(edge, 0); }
    if (event.key === 'End') { event.preventDefault(); move(edge, last); }
  };

  // Pointer capture routes every later pointer event to the handle itself, so
  // the drag needs NO window listeners: nothing leaks on unmount mid-drag, and
  // `pointercancel` — the browser reclaiming the gesture — ends the drag the
  // same way `pointerup` does. `touch-action: none` on the handle keeps a
  // touch drag from being stolen for scrolling before it starts.
  const dragging = useRef<'from' | 'to' | null>(null);

  const onDragStart = (edge: 'from' | 'to') => (event: PointerEvent<SVGRectElement>) => {
    dragging.current = edge;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDragMove = (edge: 'from' | 'to') => (event: PointerEvent<SVGRectElement>) => {
    if (dragging.current !== edge) return;
    move(edge, indexAt(event.clientX));
  };
  const onDragEnd = (edge: 'from' | 'to') => () => {
    if (dragging.current === edge) dragging.current = null;
  };

  const handle = (edge: 'from' | 'to') => {
    const index = edge === 'from' ? from : to;
    return (
      <rect
        key={edge}
        x={xAt(index) - HANDLE_WIDTH / 2} y={0}
        width={HANDLE_WIDTH} height={height} rx={3}
        fill={hue} className="cursor-ew-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        tabIndex={0}
        role="slider"
        aria-label={edge === 'from' ? 'Window start' : 'Window end'}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        // The label, not the index — "00:14" is the thing the reader is
        // choosing; "2" is an implementation detail.
        aria-valuetext={labels[index]}
        style={{ touchAction: 'none' }}
        onKeyDown={onKey(edge)}
        onPointerDown={onDragStart(edge)}
        onPointerMove={onDragMove(edge)}
        onPointerUp={onDragEnd(edge)}
        onPointerCancel={onDragEnd(edge)}
      />
    );
  };

  return (
    <div className={className}>
      <svg
        ref={track} width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
        role="group" aria-label={`Time window — showing ${labels[from]} to ${labels[to]} of ${labels.length} intervals`}
      >
        {/* The whole series, always. A brush that hides what is outside the
            window lets a plateau look like the whole story. */}
        <path d={`${outline} L${width},${height} L0,${height} Z`} fill={CHART_INK.grid} />

        <rect x={0} y={0} width={xAt(from)} height={height} fill={CHART_INK.surface} fillOpacity={0.72} />
        <rect x={xAt(to)} y={0} width={Math.max(0, width - xAt(to))} height={height} fill={CHART_INK.surface} fillOpacity={0.72} />
        <rect
          x={xAt(from)} y={0} width={Math.max(1, xAt(to) - xAt(from))} height={height}
          fill="none" stroke={hue} strokeWidth={1}
        />
        {handle('from')}
        {handle('to')}
      </svg>
    </div>
  );
}
