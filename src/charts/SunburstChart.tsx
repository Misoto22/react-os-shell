/**
 * SunburstChart — a hierarchy where depth is a ring and share is an angle.
 *
 * The treemap's radial sibling, and the choice between them is about what the
 * reader must do. A treemap compares SIZES across the whole set, because area
 * side by side is easy to judge. A sunburst shows STRUCTURE — how a total
 * decomposes, level by level, with each child nested inside the sweep of its
 * parent. Ask "which is biggest" and reach for the treemap; ask "what is this
 * made of" and reach for this.
 *
 * Colour follows the top level and every descendant inherits it, stepped
 * lighter with depth. Giving each leaf its own categorical hue would break the
 * only thing a sunburst reads well: that a wedge and the wedges above it are
 * the same branch.
 */
import { useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { arcPath } from './curve';
import { useHighlight } from './highlight';
import AccessibleTable from './AccessibleTable';
import ChartTooltip from './ChartTooltip';
import type { SunburstChartProps, SunburstNode } from './types';

interface Wedge {
  /**
   * The path from the root, not the node's own key: the same key reused in two
   * branches is two wedges, and identity — React's and the hover's — must say
   * so.
   */
  id: string;
  label: string;
  value: number;
  depth: number;
  start: number;
  end: number;
  branch: number;
  /** Top-level ancestor's key — the identity a ChartFrame legend entry names. */
  branchKey: string;
}

/**
 * Rings past this depth are unreadable slivers — and, without the cap, a
 * cyclic `children` graph recurses to a stack overflow instead of rendering.
 */
const MAX_DEPTH = 8;

/** Flatten the tree into wedges, assigning each its angular span. */
function toWedges(
  nodes: SunburstNode[], start: number, sweep: number,
  depth: number, branch: number, branchKey: string, parentId: string,
  out: Wedge[],
): void {
  if (depth >= MAX_DEPTH) return;
  const total = nodes.reduce((n, node) => n + nodeValue(node, MAX_DEPTH - depth), 0);
  if (total <= 0) return;
  let cursor = start;
  nodes.forEach((node, i) => {
    const value = nodeValue(node, MAX_DEPTH - depth);
    const span = (value / total) * sweep;
    const id = `${parentId}/${node.key}`;
    const ownBranch = depth === 0 ? i : branch;
    const ownBranchKey = depth === 0 ? node.key : branchKey;
    out.push({
      id, label: node.label, value, depth,
      start: cursor, end: cursor + span,
      branch: ownBranch, branchKey: ownBranchKey,
    });
    if (node.children?.length) toWedges(node.children, cursor, span, depth + 1, ownBranch, ownBranchKey, id, out);
    cursor += span;
  });
}

/** A node's value is its subtree's, summed no deeper than the drawn rings. */
function nodeValue(node: SunburstNode, budget: number): number {
  if (budget > 0 && node.children?.length) return node.children.reduce((n, c) => n + nodeValue(c, budget - 1), 0);
  return Math.max(0, node.value ?? 0);
}

export default function SunburstChart({
  nodes, size = 320, innerRadius = 44, ringGap = 2,
  formatValue = v => String(v), centerLabel, className,
  emptyLabel = 'Nothing to break down.',
}: SunburstChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const { highlighted } = useHighlight();

  const wedges: Wedge[] = [];
  toWedges(nodes, -Math.PI / 2, Math.PI * 2, 0, 0, '', '', wedges);
  if (wedges.length === 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  const depth = Math.max(...wedges.map(w => w.depth)) + 1;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 8;
  const ring = (outer - innerRadius) / depth;
  const total = wedges.filter(w => w.depth === 0).reduce((n, w) => n + w.value, 0);

  // Floored: past depth four the unclamped ramp crosses zero, and a negative
  // percentage is an invalid color-mix() — the deepest rings painted BLACK.
  const shade = (w: Wedge) =>
    `color-mix(in oklab, ${resolveSeriesColor(w.branch)} ${Math.max(16, 100 - w.depth * 24).toFixed(0)}%, ${CHART_INK.surface})`;

  // Local hover names ONE wedge; the frame's legend highlight names a top-level
  // branch and lights the whole branch, because that is what its entry means.
  const lit = (w: Wedge) => {
    if (hover !== null) return w.id === hover;
    if (highlighted !== null) return w.branchKey === highlighted;
    return true;
  };
  const hovered = hover ? wedges.find(w => w.id === hover) : undefined;
  const share = (w: Wedge) => `${((w.value / total) * 100).toFixed(1)}%`;

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Hierarchy of ${formatValue(total)} across ${depth} levels`}
        onMouseLeave={() => setHover(null)}>
        {wedges.map(w => (
          <path
            key={w.id}
            d={arcPath(cx, cy, innerRadius + w.depth * ring + ringGap / 2, innerRadius + (w.depth + 1) * ring - ringGap / 2, w.start, w.end)}
            fill={shade(w)} fillOpacity={lit(w) ? 1 : 0.45}
            stroke={CHART_INK.surface} strokeWidth={1}
            onMouseEnter={() => setHover(w.id)}
          />
        ))}
        {centerLabel && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={600} fill={CHART_INK.label}>
            {centerLabel}
          </text>
        )}
      </svg>

      {hovered && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hovered.label}
            rows={[
              { key: 'value', label: 'Value', color: shade(hovered), value: formatValue(hovered.value) },
              { key: 'share', label: 'Share', color: CHART_INK.muted, value: share(hovered) },
            ]}
          />
        </div>
      )}

      <AccessibleTable
        caption={`Hierarchy of ${formatValue(total)} across ${depth} levels`}
        head={['Level', 'Item', 'Value', 'Share']}
        rows={wedges.map(w => [w.depth + 1, w.label, formatValue(w.value), share(w)])}
      />
    </div>
  );
}
