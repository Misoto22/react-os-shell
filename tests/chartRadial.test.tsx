/**
 * The radial, hierarchical and flow families.
 *
 * Radius is square-rooted wherever a radial mark encodes a quantity: area is
 * what the eye reads, so scaling the radius linearly overstates a large value
 * by its square.
 */
import { render, act } from './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import RadarChart, { RADAR_SERIES_CAP } from '../src/charts/RadarChart';
import PieChart from '../src/charts/PieChart';
import RadialBarChart from '../src/charts/RadialBarChart';
import FunnelChart from '../src/charts/FunnelChart';
import TreemapChart from '../src/charts/TreemapChart';
import SunburstChart from '../src/charts/SunburstChart';
import SankeyChart from '../src/charts/SankeyChart';
import ChordChart from '../src/charts/ChordChart';
import ChartFrame from '../src/charts/ChartFrame';
import { bumpPath, polygonPoints, arcPath } from '../src/charts/curve';
import { radiusScale, angleScale } from '../src/charts/scale';
import { squarify } from '../src/charts/treemapLayout';
import { autoHighlightIndex, highlightOpacity } from '../src/charts/highlight';
import type { SunburstNode } from '../src/charts/types';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr'];
const SHARE = [
  { key: 'a', label: 'Direct', value: 520 },
  { key: 'b', label: 'Search', value: 300 },
  { key: 'c', label: 'Social', value: 120 },
  { key: 'd', label: 'Email', value: 48 },
  { key: 'e', label: 'Referral', value: 8 },
  { key: 'f', label: 'Affiliate', value: 4 },
];

// ── cartesian family ────────────────────────────────────────────────────────

test('six radar axes draw a hexagonal grid', () => {
  const axes = Array.from({ length: 6 }, (_, i) => ({ key: `a${i}`, label: `Axis ${i}` }));
  const markup = html(
    <RadarChart axes={axes} rings={1} series={[{ key: 's', label: 'S', values: [1, 2, 3, 4, 5, 6] }]} />,
  );
  const grid = /<path d="(M[^"]*Z)" fill="none" stroke="var\(--viz-grid\)"/.exec(markup)?.[1] ?? '';
  assert.equal([...grid.matchAll(/[ML]/g)].length, 6, 'six vertices, so a hexagon');
});

test('a circular radar grid is available for sampled continua', () => {
  const axes = Array.from({ length: 6 }, (_, i) => ({ key: `a${i}`, label: `A${i}` }));
  const markup = html(
    <RadarChart axes={axes} grid="circle" series={[{ key: 's', label: 'S', values: [1, 1, 1, 1, 1, 1] }]} />,
  );
  assert.match(markup, /<circle[^>]*stroke="var\(--viz-grid\)"/);
});

test('each radar axis is normalised on its own maximum', () => {
  // Without per-axis maxima a metric in thousands flattens one in tens.
  const axes = [{ key: 'a', label: 'Requests' }, { key: 'b', label: 'Errors' }, { key: 'c', label: 'P95' }];
  const markup = html(
    <RadarChart axes={axes} size={200} series={[{ key: 's', label: 'S', values: [5000, 3, 250] }]} />,
  );
  // All three sit at their own maximum, so all three land on the outer ring.
  const dots = [...markup.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="3.5"/g)];
  assert.equal(dots.length, 3);
  const radii = dots.map(d => Math.hypot(Number(d[1]) - 100, Number(d[2]) - 100));
  assert.ok(Math.max(...radii) - Math.min(...radii) < 0.01, 'all three reach the same ring');
  assert.equal(RADAR_SERIES_CAP, 3);
});

test('a pie folds its tail into Other rather than growing a seventh hue', () => {
  const segments = Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: 10 - i }));
  const markup = html(<PieChart segments={segments} maxSegments={6} />);
  assert.match(markup, />Other</);
  assert.equal((markup.match(/<path/g) ?? []).length, 7, 'six kept plus one Other');
});

test('the rose varies radius, the pie varies angle', () => {
  const segments = [
    { key: 'a', label: 'A', value: 90 },
    { key: 'b', label: 'B', value: 10 },
  ];
  const rose = html(<PieChart segments={segments} variant="rose" size={200} />);
  // Equal angles: both wedges sweep a half turn, so both arcs share a radius
  // command shape but differ in the radius value itself.
  const radii = [...rose.matchAll(/A([\d.]+),\1 /g)].map(m => Number(m[1]));
  assert.ok(new Set(radii).size > 1, 'the rose encodes value as radius');
});

test('radial tracks stop short of a full turn so the ends never touch', () => {
  const markup = html(
    <RadialBarChart size={200} rows={[{ key: 'a', label: 'A', value: 100 }]} max={100} />,
  );
  // 300°, not 360°: a full ring's start and end coincide, so there is no
  // readable beginning and a 99% track looks identical to a 100% one.
  const start = /M([\d.]+),([\d.]+) A/.exec(markup);
  const end = /A[\d.]+,[\d.]+ 0 \d 1 ([\d.]+),([\d.]+) L/.exec(markup);
  assert.ok(start && end, 'the filled track drew an arc');
  const gap = Math.hypot(Number(start![1]) - Number(end![1]), Number(start![2]) - Number(end![2]));
  assert.ok(gap > 20, `the ends should stay apart, they were ${gap.toFixed(1)}px`);
});

// ── hierarchy and flow ──────────────────────────────────────────────────────

test('a funnel states the drop-off, not just the widths', () => {
  const markup = html(
    <FunnelChart
      width={520}
      stages={[
        { key: 'a', label: 'Viewed', value: 1000 },
        { key: 'b', label: 'Carted', value: 400 },
        { key: 'c', label: 'Paid', value: 120 },
      ]}
    />,
  );
  assert.match(markup, /−60.0%/, 'the loss from the stage above is written out');
  assert.match(markup, /−70.0%/);
});

test('a cone tapers to the next stage; a funnel does not', () => {
  const stages = [
    { key: 'a', label: 'A', value: 100 },
    { key: 'b', label: 'B', value: 20 },
  ];
  const funnel = html(<FunnelChart width={400} stages={stages} shape="funnel" />);
  const cone = html(<FunnelChart width={400} stages={stages} shape="cone" />);
  assert.notEqual(funnel, cone, 'the shapes differ in geometry, not only in name');
});

test('a treemap only labels a tile the label actually fits in', () => {
  const markup = html(
    <TreemapChart
      width={400} height={200}
      items={[
        { key: 'big', label: 'Alloy wheels', value: 900 },
        { key: 'tiny', label: 'A very long category name indeed', value: 1 },
      ]}
    />,
  );
  const svg = markup.slice(0, markup.indexOf('</svg>'));
  assert.match(svg, />Alloy wheels</);
  assert.doesNotMatch(svg, />A very long category name indeed</, 'no clipped label in the plot');
  // A dropped label is not dropped DATA: the hidden table still carries it.
  assert.match(markup, /A very long category name indeed/);
});

test('a sunburst keeps a branch one hue, stepped lighter with depth', () => {
  const markup = html(
    <SunburstChart
      size={220}
      nodes={[{
        key: 'au', label: 'AU', children: [
          { key: 'au-wheels', label: 'Wheels', value: 60 },
          { key: 'au-tyres', label: 'Tyres', value: 40 },
        ],
      }]}
    />,
  );
  const fills = [...markup.matchAll(/fill="(color-mix[^"]*)"/g)].map(m => m[1]);
  assert.ok(fills.length >= 3);
  for (const fill of fills) assert.match(fill, /var\(--viz-series-1\)/, 'one branch, one hue');
});

test('sankey ribbon width is the flow, and both ends stack in link order', () => {
  const markup = html(
    <SankeyChart
      width={520} height={200}
      nodes={[
        { key: 'in', label: 'Requests', depth: 0 },
        { key: 'ok', label: '2xx', depth: 1 },
        { key: 'err', label: '4xx', depth: 1 },
      ]}
      links={[
        { from: 'in', to: 'ok', value: 300 },
        { from: 'in', to: 'err', value: 100 },
      ]}
    />,
  );
  const widths = [...markup.matchAll(/<path[^>]*stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(widths.length, 2);
  assert.ok(Math.abs(widths[0] / widths[1] - 3) < 0.05, `expected 3:1, got ${widths[0] / widths[1]}`);
});

test('a chord drops the tail past maxNodes instead of tangling', () => {
  const labels = Array.from({ length: 14 }, (_, i) => `T${i}`);
  const matrix = labels.map((_, r) => labels.map((__, c) => (r === c ? 0 : Math.max(0, 14 - r - c))));
  const markup = html(<ChordChart labels={labels} matrix={matrix} maxNodes={6} />);
  const arcs = [...markup.matchAll(/<path[^>]*fill="var\(--viz-series-\d\)"/g)];
  assert.equal(arcs.length, 6);
});

// ── the combination form ────────────────────────────────────────────────────

test('wedges sweep in, staggered, so a pie assembles rather than appears', () => {
  const markup = html(
    <PieChart segments={[
      { key: 'a', label: 'A', value: 3 },
      { key: 'b', label: 'B', value: 2 },
    ]} />,
  );
  assert.equal((markup.match(/rosh-viz-sweep/g) ?? []).length, 2);
  assert.match(markup, /animation-delay:55ms/, 'the second wedge waits for the first');
});

// ── the hover layer ─────────────────────────────────────────────────────────

test('outside labels are off by default — the legend already names the slices', () => {
  const bare = html(<PieChart segments={SHARE} size={260} />);
  assert.doesNotMatch(bare, /<polyline/, 'no leader lines unless asked for');
});

test('a leader line runs from the wedge to a label beyond the circle', () => {
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" />);
  assert.match(markup, /<polyline/);
  // Three points: wedge edge, elbow, then horizontal to the text.
  const points = /<polyline\s+points="([^"]+)"/.exec(markup)?.[1] ?? '';
  assert.equal(points.trim().split(/\s+/).length, 3);
});

test('slivers go unlabelled — a fan of lines at nothing beats no fan at all', () => {
  // Referral (0.8%) and Affiliate (0.4%) are below the floor. A dozen leader
  // lines converging on slivers is less readable than the legend below, not
  // more.
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" labelMinShare={0.05} />);
  assert.doesNotMatch(markup, /<text[^>]*>Referral<\/text>/);
  assert.doesNotMatch(markup, /<text[^>]*>Affiliate<\/text>/);
  // They are still in the legend, which is the point of the floor.
  assert.match(markup, /Referral/);
  assert.match(markup, /Affiliate/);
});

test('labels on one side are pushed apart, never allowed to collide', () => {
  // A collided pair is two labels neither of which can be read.
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" labelMinShare={0} />);
  const rows = [...markup.matchAll(/<polyline\s+points="[^"]*\s(-?[\d.]+),(-?[\d.]+)\s/g)]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
  for (const side of [true, false]) {
    const column = rows.filter(r => (r.x > 130) === side).map(r => r.y).sort((a, b) => a - b);
    for (let i = 1; i < column.length; i += 1) {
      assert.ok(column[i] - column[i - 1] >= 14.9, `labels overlap at ${column[i - 1]} / ${column[i]}`);
    }
  }
});

test('each label carries its share, in tabular figures', () => {
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" />);
  assert.match(markup, />52\.0%</);
  assert.match(markup, /font-variant-numeric:tabular-nums/);
});

// ── the wider texture set ───────────────────────────────────────────────────

test('the sankey ribbon and the line family draw the same bump', () => {
  // One formula, one place: the ribbon used to inline its own copy.
  const markup = html(
    <SankeyChart
      width={400} height={200}
      nodes={[{ key: 'a', label: 'A', depth: 0 }, { key: 'b', label: 'B', depth: 1 }]}
      links={[{ from: 'a', to: 'b', value: 10 }]}
    />,
  );
  const ribbon = /<path[^>]*d="(M[^"]*)"/.exec(markup)?.[1] ?? '';
  const [, x0, y0, , cy1, , cy2, , y1] = /M([\d.]+),([\d.]+) C([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/.exec(ribbon)!.map(Number);
  assert.equal(cy1, y0, 'flat where it leaves the node');
  assert.equal(cy2, y1, 'flat where it arrives');
  void x0;
});

// ── monotone ────────────────────────────────────────────────────────────────

/** Sample a cubic Bézier segment, so overshoot can be measured not assumed. */
const sampleCubic = (d: string): number[] => {
  const nums = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  const out: number[] = [];
  for (let seg = 0; seg + 3 < nums.length; seg += 3) {
    const [p0, c1, c2, p1] = [nums[seg], nums[seg + 1], nums[seg + 2], nums[seg + 3]];
    for (let t = 0; t <= 1; t += 0.02) {
      const u = 1 - t;
      out.push(u ** 3 * p0[1] + 3 * u ** 2 * t * c1[1] + 3 * u * t ** 2 * c2[1] + t ** 3 * p1[1]);
    }
  }
  return out;
};

/** How many times a sampled curve moves DOWN. */
const descents = (ys: number[]) => {
  let n = 0;
  for (let i = 1; i < ys.length; i += 1) if (ys[i] < ys[i - 1] - 1e-9) n += 1;
  return n;
};

// ── review follow-ups: the degenerate ends of the radial forms ──────────────

test('a deep sunburst never mixes a negative colour share', () => {
  // 100 - depth*24 crosses zero at depth five, and a negative percentage is
  // an invalid color-mix() — the deepest rings painted BLACK.
  type N = { key: string; label: string; value: number; children?: N[] };
  let node: N = { key: 'leaf', label: 'leaf', value: 1 };
  for (let i = 0; i < 6; i++) node = { key: `n${i}`, label: `n${i}`, value: 1, children: [node] };
  const markup = html(<SunburstChart nodes={[node]} />);
  assert.doesNotMatch(markup, /oklab[^)]*-\d+%/, 'every mix share stays non-negative');
});

test('a chord defaults to the palette, not past it', () => {
  // Ten arcs on eight palette slots painted two participants (and all their
  // ribbons) the same de-emphasis ink — indistinguishable by construction.
  const labels = Array.from({ length: 14 }, (_, i) => `T${i}`);
  const matrix = labels.map((_, r) => labels.map((__, c) => (r === c ? 0 : 14 - Math.abs(r - c))));
  const markup = html(<ChordChart labels={labels} matrix={matrix} />);
  const arcs = [...markup.matchAll(/<path[^>]*fill="var\(--viz-series-\d\)"/g)];
  assert.equal(arcs.length, 8, 'the default cut is the slot count');
});

test('a ragged chord matrix degrades to zeros instead of throwing', () => {
  const markup = html(<ChordChart labels={['a', 'b', 'c']} matrix={[[0, 2], [1]]} />);
  assert.doesNotMatch(markup, /NaN/, 'no NaN geometry');
});

test('radial tracks stop at what fits rather than walking past the centre', () => {
  // Once the band width hits its floor, extra rows drove the radii negative —
  // garbage arcs over the middle of the chart.
  const rows = Array.from({ length: 30 }, (_, i) => ({ key: `r${i}`, label: `R${i}`, value: i + 1 }));
  const markup = html(<RadialBarChart size={300} rows={rows} />);
  const title = markup.match(/<title[^>]*>(\d+) categories/);
  assert.ok(title, 'the accessible title reports the drawn count');
  assert.ok(Number(title![1]) < 30, `capped below 30, got ${title![1]}`);
  assert.doesNotMatch(markup, /A ?-/, 'no negative arc radius in any path');
});

// ── audit follow-ups (#191): identity, budgets, text equivalents ────────────

test('a cyclic sunburst renders instead of overflowing the stack', () => {
  // `children` is caller data; a cycle in it used to recurse without limit.
  const loop: SunburstNode = { key: 'loop', label: 'Loop', value: 10 };
  loop.children = [loop];
  const markup = html(<SunburstChart size={220} nodes={[loop]} />);
  // The depth cap turns the cycle into a finite column of rings.
  assert.ok((markup.match(/<path/g) ?? []).length <= 8, 'depth is capped');
});

test('the same key in two sunburst branches is two wedges, not one', () => {
  // Wedge identity is the PATH from the root. Keyed on `key` alone, hovering
  // AU's "wheels" also lit NZ's — and React reconciled two branches as one.
  const view = render(
    <SunburstChart size={220} nodes={[
      { key: 'au', label: 'AU', children: [{ key: 'wheels', label: 'Wheels', value: 60 }] },
      { key: 'nz', label: 'NZ', children: [{ key: 'wheels', label: 'Wheels', value: 40 }] },
    ]} />,
  );
  try {
    const paths = [...view.container.querySelectorAll('svg path')];
    assert.equal(paths.length, 4);
    // Depth-first flatten: [au, au/wheels, nz, nz/wheels].
    act(() => {
      paths[1].dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    });
    const dimmed = [...view.container.querySelectorAll('svg path')]
      .filter(p => p.getAttribute('fill-opacity') === '0.45');
    assert.equal(dimmed.length, 3, 'every wedge but the hovered one recedes — including the twin key');
  } finally {
    view.unmount();
  }
});

test('a sankey column of near-zero nodes stays inside the height budget', () => {
  // Each node has a 2px floor the scale never budgeted for: enough tiny nodes
  // used to walk the column straight off the bottom of the svg.
  const tinies = Array.from({ length: 12 }, (_, i) => ({ key: `t${i}`, label: `T${i}`, depth: 1 }));
  const markup = html(
    <SankeyChart
      width={520} height={300}
      nodes={[{ key: 'src', label: 'Source', depth: 0 }, { key: 'main', label: 'Main', depth: 1 }, ...tinies]}
      links={[
        { from: 'src', to: 'main', value: 100 },
        ...tinies.map(t => ({ from: 'src', to: t.key, value: 0.01 })),
      ]}
    />,
  );
  const nodes = [...markup.matchAll(/<rect[^>]*\by="([\d.]+)"[^>]*\bheight="([\d.]+)" rx="2"/g)]
    .map(m => Number(m[1]) + Number(m[2]));
  assert.equal(nodes.length, 14, 'every node draws');
  assert.ok(Math.max(...nodes) <= 290.5, `no node overflows the column: deepest ends at ${Math.max(...nodes)}`);
});

test('in-tile text switches to ink where the ramp nears the surface', () => {
  // Surface-coloured text on a tile that is nearly the surface is text on
  // itself. The pale end of the ramp takes the label ink instead.
  const treemap = html(
    <TreemapChart width={800} height={400} items={[
      { key: 'big', label: 'Big', value: 1000 },
      { key: 'small', label: 'Small', value: 100 },
    ]} />,
  );
  assert.match(treemap, /font-weight="600" fill="var\(--viz-surface\)"/, 'the dark tile keeps surface text');
  assert.match(treemap, /font-weight="600" fill="var\(--viz-label\)"/, 'the pale tile takes the ink');

  const funnel = html(
    <FunnelChart stages={[
      { key: 'seen', label: 'Seen', value: 1000 },
      { key: 'bought', label: 'Bought', value: 900 },
    ]} />,
  );
  assert.match(funnel, /font-weight="600" fill="var\(--viz-label\)"/, 'the first, palest band takes the ink');
  assert.match(funnel, /font-weight="600" fill="var\(--viz-surface\)"/, 'the darkest band keeps surface text');
});

test('a radar names its series outside the plot — colour is never the only channel', () => {
  const markup = html(
    <RadarChart
      size={240}
      axes={[{ key: 'x', label: 'X' }, { key: 'y', label: 'Y' }, { key: 'z', label: 'Z' }]}
      series={[
        { key: 'a', label: 'Alpha', values: [1, 2, 3] },
        { key: 'b', label: 'Beta', values: [3, 2, 1] },
      ]}
    />,
  );
  const legend = markup.slice(markup.indexOf('</svg>'));
  assert.match(legend, /<ul/, 'a swatch list follows the plot');
  assert.match(legend, /Alpha/);
  assert.match(legend, /Beta/);
});

test('the opaque charts carry their data as a hidden table', () => {
  // role="img" makes the svg one node to assistive tech: per-mark <title> was
  // never exposed. Each of these now renders the same data as an sr-only table.
  const sunburst = html(
    <SunburstChart size={220} nodes={[{ key: 'au', label: 'AU', children: [{ key: 'w', label: 'Wheels', value: 60 }] }]} />,
  );
  const treemap = html(
    <TreemapChart width={400} height={200} items={[{ key: 'a', label: 'Alloy wheels', value: 900 }]} />,
  );
  const sankey = html(
    <SankeyChart width={520} nodes={[{ key: 's', label: 'S', depth: 0 }, { key: 't', label: 'T', depth: 1 }]}
      links={[{ from: 's', to: 't', value: 5 }]} />,
  );
  const chord = html(
    <ChordChart labels={['AU', 'NZ']} matrix={[[0, 5], [3, 0]]} size={240} />,
  );
  const radar = html(
    <RadarChart size={240}
      axes={[{ key: 'x', label: 'X' }, { key: 'y', label: 'Y' }, { key: 'z', label: 'Z' }]}
      series={[{ key: 'a', label: 'Alpha', values: [1, 2, 3] }]} />,
  );
  for (const [name, markup] of Object.entries({ sunburst, treemap, sankey, chord, radar })) {
    assert.match(markup, /<table class="sr-only">/, `${name} carries a hidden table`);
    assert.match(markup, /<caption>/, `${name}'s table is captioned`);
  }
  assert.match(sunburst, /<td>Wheels<\/td>/);
  assert.match(sankey, /<td>5<\/td>/);
  assert.match(chord, /<td>AU<\/td>/);
});

test('the frame legend recedes a radial chart, same as a cartesian one', () => {
  // `useHighlight` linkage: pointing at a legend entry must dim the pie's
  // other slices — the context used to stop at the cartesian family.
  const view = render(
    <ChartFrame
      title="Mix"
      legend={[{ key: 'a', label: 'Direct' }, { key: 'b', label: 'Search' }]}
    >
      <PieChart animate={false} size={200} segments={[
        { key: 'a', label: 'Direct', value: 60 },
        { key: 'b', label: 'Search', value: 40 },
      ]} />
    </ChartFrame>,
  );
  try {
    const entry = [...view.container.querySelectorAll('button')]
      .find(b => b.textContent?.includes('Direct'))!;
    act(() => {
      entry.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true }));
    });
    const slices = [...view.container.querySelectorAll('svg path')];
    assert.equal(slices.length, 2);
    assert.equal(slices[0].getAttribute('fill-opacity'), '1', 'the named slice holds');
    assert.equal(slices[1].getAttribute('fill-opacity'), '0.4', 'the other slice recedes');
  } finally {
    view.unmount();
  }
});
