/**
 * SankeyChart — where a quantity went, with the width of each ribbon carrying
 * how much went that way.
 *
 * The form for a flow that splits and rejoins: stock moving between warehouses,
 * an order pipeline where things branch into fulfilled, cancelled and returned,
 * traffic arriving at surfaces and ending in status classes. A stacked bar can
 * show the ends of that but not the paths between them.
 *
 * The layout is deliberately simple and deliberately declared: nodes are placed
 * in the column their `depth` says, stacked in the order given, and ribbons run
 * between them as cubic curves. Crossing-minimisation — the iterative relaxation
 * a full Sankey implementation does — is NOT here. It would be several hundred
 * lines that mostly matter above about thirty nodes, and a caller who orders its
 * nodes sensibly gets a clean diagram without it. Ordering is therefore part of
 * the contract rather than something the component quietly rearranges.
 */
import { useRef, useState } from 'react';

import { CHART_INK, resolveSeriesColor } from './palette';
import { bumpPath } from './curve';
import { useHighlight } from './highlight';
import { usePlotWidth } from './usePlotWidth';
import AccessibleTable from './AccessibleTable';
import ChartTooltip from './ChartTooltip';
import type { SankeyChartProps } from './types';

type Hover = { kind: 'node'; key: string } | { kind: 'link'; index: number } | null;

export default function SankeyChart({
  nodes, links, height = 320, width: widthProp, nodeWidth = 14, nodePadding = 12,
  formatValue = v => String(v), className, emptyLabel = 'No flows to chart.',
}: SankeyChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const measured = usePlotWidth(host);
  const width = widthProp ?? measured;
  const [hover, setHover] = useState<Hover>(null);
  const { highlighted } = useHighlight();

  if (nodes.length === 0 || links.length === 0) {
    return <div className={className} ref={host}><p className="py-8 text-center text-sm text-gray-500">{emptyLabel}</p></div>;
  }

  const depths = [...new Set(nodes.map(n => n.depth))].sort((a, b) => a - b);
  const columnX = (depth: number) =>
    depths.length <= 1 ? 0 : (depths.indexOf(depth) / (depths.length - 1)) * (width - nodeWidth - 140) + 70;

  // A node's height is the larger of what flows in and what flows out, so a
  // source that emits more than it receives is not drawn too thin.
  const throughput = new Map(nodes.map(n => {
    const out = links.filter(l => l.from === n.key).reduce((s, l) => s + l.value, 0);
    const into = links.filter(l => l.to === n.key).reduce((s, l) => s + l.value, 0);
    return [n.key, Math.max(out, into, n.value ?? 0)];
  }));

  const byDepth = new Map<number, typeof nodes>();
  for (const node of nodes) byDepth.set(node.depth, [...(byDepth.get(node.depth) ?? []), node]);

  const tallestColumn = Math.max(...[...byDepth.values()].map(column =>
    column.reduce((s, n) => s + (throughput.get(n.key) ?? 0), 0)));
  const usable = height - 20;
  const scale = tallestColumn > 0 ? (usable - nodePadding * (Math.max(...[...byDepth.values()].map(c => c.length)) - 1)) / tallestColumn : 0;

  const placed = new Map<string, { x: number; y: number; h: number; index: number }>();
  for (const [depth, column] of byDepth) {
    const raw = column.map(node => Math.max(2, (throughput.get(node.key) ?? 0) * scale));
    // The 2px floor is height the budget above never counted: a column of many
    // near-zero nodes inflates past `usable`. The un-floored spans give back
    // exactly the overflow, proportionally; the floors themselves never shrink.
    const need = raw.reduce((s, h) => s + h, 0) + nodePadding * (column.length - 1);
    const give = raw.reduce((s, h) => s + Math.max(0, h - 2), 0);
    const k = need > usable && give > 0 ? Math.max(0, 1 - (need - usable) / give) : 1;
    let cursor = 10;
    column.forEach((node, index) => {
      const h = 2 + Math.max(0, raw[index] - 2) * k;
      placed.set(node.key, { x: columnX(depth), y: cursor, h, index });
      cursor += h + nodePadding;
    });
  }

  // Ribbons leave a source and enter a target stacked in link order, so two
  // flows out of one node do not overlap.
  const outCursor = new Map<string, number>();
  const inCursor = new Map<string, number>();
  // Keyed by route, so reordering the links does not remount every ribbon;
  // parallel duplicates of one route get a per-route ordinal.
  const routeSeen = new Map<string, number>();

  const touches = (link: { from: string; to: string }, key: string) =>
    link.from === key || link.to === key;
  const linkLit = (link: { from: string; to: string }, index: number) => {
    if (hover) return hover.kind === 'link' ? hover.index === index : touches(link, hover.key);
    if (highlighted !== null) return touches(link, highlighted);
    return null;
  };
  const nodeLit = (key: string) => {
    if (hover) return hover.kind === 'node' ? hover.key === key : touches(links[hover.index], key);
    if (highlighted !== null) return highlighted === key;
    return null;
  };

  const hoveredLink = hover?.kind === 'link' ? links[hover.index] : undefined;
  const hoveredNode = hover?.kind === 'node' ? nodes.find(n => n.key === hover.key) : undefined;

  return (
    <div className={`relative ${className ?? ''}`} ref={host}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img"
        aria-label={`Flow between ${nodes.length} nodes over ${links.length} links`}
        onMouseLeave={() => setHover(null)}>
        {links.map((link, i) => {
          const a = placed.get(link.from);
          const b = placed.get(link.to);
          if (!a || !b) return null;
          const thickness = Math.max(1, link.value * scale);
          const ay = a.y + (outCursor.get(link.from) ?? 0) + thickness / 2;
          const by = b.y + (inCursor.get(link.to) ?? 0) + thickness / 2;
          outCursor.set(link.from, (outCursor.get(link.from) ?? 0) + thickness);
          inCursor.set(link.to, (inCursor.get(link.to) ?? 0) + thickness);
          const x1 = a.x + nodeWidth;
          const x2 = b.x;
          const colour = resolveSeriesColor(a.index, link.color);
          const route = `${link.from}→${link.to}`;
          const ordinal = routeSeen.get(route) ?? 0;
          routeSeen.set(route, ordinal + 1);
          const lit = linkLit(link, i);
          return (
            <path
              // The same bump the line family uses: flat where it leaves a
              // node, flat where it arrives, all the movement in between.
              key={ordinal ? `${route}#${ordinal}` : route}
              d={bumpPath([[x1, ay], [x2, by]])}
              fill="none" stroke={colour} strokeWidth={thickness}
              strokeOpacity={lit === null || lit ? 0.42 : 0.12}
              onMouseEnter={() => setHover({ kind: 'link', index: i })}
            />
          );
        })}

        {nodes.map(node => {
          const p = placed.get(node.key);
          if (!p) return null;
          const last = p.x > width / 2;
          const lit = nodeLit(node.key);
          return (
            <g key={node.key} opacity={lit === null || lit ? 1 : 0.45} onMouseEnter={() => setHover({ kind: 'node', key: node.key })}>
              <rect x={p.x} y={p.y} width={nodeWidth} height={p.h} rx={2} fill={resolveSeriesColor(p.index, node.color, node.tone)} />
              <text
                x={last ? p.x - 8 : p.x + nodeWidth + 8} y={p.y + p.h / 2 + 4}
                textAnchor={last ? 'end' : 'start'} fontSize={11} fill={CHART_INK.label}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredLink && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={`${hoveredLink.from} → ${hoveredLink.to}`}
            rows={[{ key: 'value', label: 'Flow', color: resolveSeriesColor(placed.get(hoveredLink.from)?.index ?? 0, hoveredLink.color), value: formatValue(hoveredLink.value) }]}
          />
        </div>
      )}
      {hoveredNode && (
        <div className="absolute top-2 left-2 z-10">
          <ChartTooltip
            title={hoveredNode.label}
            rows={[{ key: 'value', label: 'Throughput', color: resolveSeriesColor(placed.get(hoveredNode.key)?.index ?? 0, hoveredNode.color, hoveredNode.tone), value: formatValue(throughput.get(hoveredNode.key) ?? 0) }]}
          />
        </div>
      )}

      <AccessibleTable
        caption={`Flow between ${nodes.length} nodes over ${links.length} links`}
        head={['From', 'To', 'Value']}
        rows={links.map(link => [link.from, link.to, formatValue(link.value)])}
      />
    </div>
  );
}
