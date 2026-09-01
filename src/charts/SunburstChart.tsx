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
import type { SunburstChartProps, SunburstNode } from './types';

interface Wedge {
  key: string;
  label: string;
  value: number;
  depth: number;
  start: number;
  end: number;
  branch: number;
}

/** Flatten the tree into wedges, assigning each its angular span. */
function toWedges(nodes: SunburstNode[], start: number, sweep: number, depth: number, branch: number, out: Wedge[]): void {
  const total = nodes.reduce((n, node) => n + nodeValue(node), 0);
  if (total <= 0) return;
  let cursor = start;
  nodes.forEach((node, i) => {
    const value = nodeValue(node);
    const span = (value / total) * sweep;
    out.push({
      key: node.key, label: node.label, value, depth,
      start: cursor, end: cursor + span,
      branch: depth === 0 ? i : branch,
    });
    if (node.children?.length) toWedges(node.children, cursor, span, depth + 1, depth === 0 ? i : branch, out);
    cursor += span;
  });
}

function nodeValue(node: SunburstNode): number {
  if (node.children?.length) return node.children.reduce((n, c) => n + nodeValue(c), 0);
  return Math.max(0, node.value ?? 0);
}

export default function SunburstChart({
  nodes, size = 320, innerRadius = 44, ringGap = 2,
  formatValue = v => String(v), centerLabel, className,
  emptyLabel = 'Nothing to break down.',
}: SunburstChartProps) {
  const [hover, setHover] = useState<string | null>(null);

  const wedges: Wedge[] = [];
  toWedges(nodes, -Math.PI / 2, Math.PI * 2, 0, 0, wedges);
  if (wedges.length === 0) return <p className={`text-sm text-gray-500 ${className ?? ''}`}>{emptyLabel}</p>;

  const depth = Math.max(...wedges.map(w => w.depth)) + 1;
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 8;
  const ring = (outer - innerRadius) / depth;
  const total = wedges.filter(w => w.depth === 0).reduce((n, w) => n + w.value, 0);

  const shade = (w: Wedge) =>
    `color-mix(in oklab, ${resolveSeriesColor(w.branch)} ${(100 - w.depth * 24).toFixed(0)}%, ${CHART_INK.surface})`;

  return (
    <div className={className}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Hierarchy of ${formatValue(total)} across ${depth} levels`}
        onMouseLeave={() => setHover(null)}>
        {wedges.map(w => (
          <path
            key={`${w.key}-${w.depth}`}
            d={arcPath(cx, cy, innerRadius + w.depth * ring + ringGap / 2, innerRadius + (w.depth + 1) * ring - ringGap / 2, w.start, w.end)}
            fill={shade(w)} fillOpacity={hover && hover !== w.key ? 0.45 : 1}
            stroke={CHART_INK.surface} strokeWidth={1}
            onMouseEnter={() => setHover(w.key)}
          >
            <title>{`${w.label}: ${formatValue(w.value)} (${((w.value / total) * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        {centerLabel && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={600} fill={CHART_INK.label}>
            {centerLabel}
          </text>
        )}
      </svg>
    </div>
  );
}
