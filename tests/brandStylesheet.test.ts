import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `brand.css` serves the surfaces this package cannot reach: a report, a
 * published artifact, a proposal, an HTML email, a shop page. They have no
 * React and no build step, so harness FT-1 ("resolve to react-os-shell") has
 * nothing to resolve to; harness 52-brand-surface.md governs them instead and
 * names this file as the vocabulary.
 *
 * Two invariants make that safe, and both fail silently if broken.
 *
 * The neutral ramp is the first. The dark block has named these twelve roles
 * since 4.16; light named none of them, so `var(--ink)` resolved to nothing
 * outside a dark theme — invisible in the portals, which read the utility
 * classes rather than the roles, and fatal on a standalone page that reads
 * only the roles. Light now declares the same twelve. Both blocks are
 * specificity (0,1,0), so LIGHT MUST COME FIRST or the dark theme stops
 * winning and nobody notices until a dark page renders white.
 *
 * The second is that `brand.css` stays a superset of the kit. It imports
 * styles.css rather than restating anything, so a class the kit adds tomorrow
 * reaches a brand surface without a second edit. A hand-copied rule here would
 * be the drift the harness exists to end.
 */

// The runner transpiles specs into node_modules/.cache, so import.meta.dirname
// is not tests/. REPO_ROOT is how the other CSS spec resolves the real tree.
const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
const read = (name: string) => readFileSync(join(ROOT, 'src', name), 'utf-8');

const RAMP = [
  '--surface',
  '--surface-sunken',
  '--surface-raised',
  '--line-subtle',
  '--line',
  '--line-strong',
  '--ink-faintest',
  '--ink-faint',
  '--ink-muted',
  '--ink',
  '--ink-strong',
  '--ink-strongest',
];

/**
 * ui.css declares `:root` and `[data-theme="dark"]` more than once — the menu
 * opacity, the neutral ramp, the chart palette. Selecting the first match
 * would silently assert against the wrong block, so the caller names a
 * property that identifies the one it means.
 */
function block(css: string, selector: string, marker: string): string {
  const opener = `${selector} {`;
  for (let at = css.indexOf(opener); at !== -1; at = css.indexOf(opener, at + 1)) {
    const end = css.indexOf('\n}', at);
    if (end === -1) continue;
    const body = css.slice(at, end);
    if (body.includes(marker)) return body;
  }
  assert.fail(`no ${selector} block declaring ${marker}`);
}

const block2 = block;

test('the neutral ramp names the same twelve roles in light and dark', () => {
  const css = read('ui.css');
  const light = block(css, ':root', '--surface: #ffffff');
  const dark = block(css, '[data-theme="dark"]', '--surface: #1e1e2e');

  for (const role of RAMP) {
    assert.match(light, new RegExp(`\\${role}:\\s*#`), `light is missing ${role}`);
    assert.match(dark, new RegExp(`\\${role}:\\s*#`), `dark is missing ${role}`);
  }
});

test('light declares the ramp before dark, so dark still wins', () => {
  const css = read('ui.css');

  // Both selectors are specificity (0,1,0): source order is the only thing
  // deciding the cascade between them.
  const light = css.indexOf('--surface: #ffffff');
  const dark = css.indexOf('--surface: #1e1e2e');

  assert.notEqual(light, -1, 'light ramp is missing');
  assert.notEqual(dark, -1, 'dark ramp is missing');
  assert.ok(light < dark, 'light ramp must precede the dark block');
});

/** The one block in brand.css allowed to restate the ramp: the OS-preference
 * fallback for a page that stamps no data-theme. Everything outside it is
 * held to the no-restating rule. */
function osDarkBlock(raw: string): { block: string; rest: string } {
  // Comments mention the media query by name, so match the RULE, not the prose.
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const start = css.search(/@media \(prefers-color-scheme: dark\)\s*\{/);
  assert.notEqual(start, -1, 'the prefers-color-scheme block is missing');
  let depth = 0;
  let end = start;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  return { block: css.slice(start, end), rest: css.slice(0, start) + css.slice(end) };
}

function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/(--[a-z-]+):\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

test('brand.css imports the kit instead of restating it', () => {
  const css = read('brand.css');

  assert.match(css, /@import "\.\/styles\.css";/);
  // Anything hand-copied from the kit is drift waiting to happen. The only
  // classes this file may declare are the ef-* report primitives, which
  // exist nowhere in the kit.
  assert.doesNotMatch(
    css,
    /^\s*\.(?!ef-)[a-z]/m,
    'brand.css declares only the ef-* report primitives',
  );
  const { rest } = osDarkBlock(css);
  for (const role of RAMP) {
    assert.doesNotMatch(
      rest,
      new RegExp(`\\${role}:`),
      `${role} belongs to the kit, not brand.css`,
    );
  }
});

test('a page with no data-theme follows the OS, with the kit\'s own dark values', () => {
  const css = read('brand.css');
  const { block } = osDarkBlock(css);

  // Any explicit stamp wins; only the unstamped page follows the OS.
  assert.match(block, /:root:not\(\[data-theme\]\)\s*\{/);
  assert.match(block, /color-scheme:\s*dark/);

  const kitDark = declarations(block2(read('ui.css'), '[data-theme="dark"]', '--surface: #1e1e2e'));
  const ours = declarations(block);
  for (const role of RAMP) {
    assert.equal(ours.get(role), kitDark.get(role), `${role} drifted from the kit's dark value`);
  }
  const brandDark = declarations(block2(css, ':root[data-theme="dark"]', '--danger-text'));
  for (const token of ['--danger-text', '--warning-text', '--success-text', '--accent-text']) {
    assert.equal(ours.get(token), brandDark.get(token), `${token} drifted from the explicit dark block`);
  }
});

test('the accent has a text variant per theme and an ink for its fill', () => {
  const css = read('brand.css');
  const light = declarations(block2(css, ':root', '--accent-600'));
  const dark = declarations(block2(css, ':root[data-theme="dark"]', '--danger-text'));

  // --accent-600 is 3.17:1 on the dark surface: a fill, never an ink.
  assert.equal(light.get('--accent-text'), '#1d4ed8');
  assert.equal(dark.get('--accent-text'), '#60a5fa');
  assert.equal(light.get('--on-accent'), '#ffffff');
  assert.match(css, /\.ef-button \{[^}]*color: var\(--on-accent\)/);
  assert.doesNotMatch(css, /\.ef-[a-z-]+[^{]*\{[^}]*#[0-9a-f]{3,8}/i, 'a primitive declares a literal colour');
});

test('every control clears the 44px target, and a flow yields to a section', () => {
  const css = read('brand.css');

  assert.match(css, /\.ef-skip-link \{[^}]*min-height: 2\.75rem/);
  assert.match(css, /\.ef-button \{[^}]*min-height: 2\.75rem/);
  // Same specificity; source order is the only thing that lets .ef-section
  // keep its own margin inside a .ef-flow.
  assert.ok(css.indexOf('.ef-flow > * + *') < css.indexOf('.ef-section {'), 'declare .ef-flow before .ef-section');
});

test('brand.css supplies what a page without utility classes cannot express', () => {
  const css = read('brand.css');

  for (const token of [
    '--accent-600',
    '--danger',
    '--warning',
    '--success',
    '--radius',
    '--font',
    '--font-mono',
  ]) {
    assert.match(css, new RegExp(`\\${token}:`), `brand.css is missing ${token}`);
  }
});

test('status text clears AA in the theme it is read against', () => {
  const css = read('brand.css');

  // The fill hues are literal in both themes on purpose. As TEXT they are not
  // safe: amber on white measures 2.15:1, below AA and below even the
  // large-text bar. A surface that reads --warning for a label looks correct
  // to its author and is unreadable to its reader, with nothing to catch it.
  for (const token of ['--danger-text', '--warning-text', '--success-text']) {
    assert.match(css, new RegExp(`\\${token}:`), `brand.css is missing ${token}`);
  }

  const light = block(css, ':root', '--accent-600');
  const dark = block(css, ':root[data-theme="dark"]', '--danger-text');

  // Same hue, moved until it clears the surface behind it.
  assert.match(light, /--warning-text:\s*#b45309/);
  assert.match(dark, /--warning-text:\s*#f59e0b/);
  assert.notEqual(
    /--danger-text:\s*(#\w+)/.exec(light)?.[1],
    /--danger-text:\s*(#\w+)/.exec(dark)?.[1],
    'a text variant that survives a theme swap unchanged has not been checked',
  );
});

/**
 * The generator-facing API of a brand surface. Harness BRAND-2 lists exactly
 * these names; an `ef-` class that is not here renders as nothing, and the
 * brand checker reports it as a defect rather than a near miss. Adding a
 * primitive means adding it in three places — here, in the CSS, and in the
 * contract — which is the point: the list is the contract.
 */
const REPORT_API = [
  'ef-report', 'ef-shell', 'ef-skip-link', 'ef-masthead', 'ef-identity',
  'ef-logo-light', 'ef-logo-dark', 'ef-document-meta', 'ef-footer',
  'ef-opening', 'ef-opening-claim', 'ef-opening-proof',
  'ef-section', 'ef-section-title', 'ef-flow', 'ef-reading', 'ef-peers',
  'ef-label', 'ef-caption', 'ef-mono', 'ef-numeric', 'ef-visually-hidden',
  'ef-sources',
  'ef-stat-strip', 'ef-stat', 'ef-stat-label', 'ef-stat-value', 'ef-stat-unit',
  'ef-stat-detail', 'ef-unavailable',
  'ef-table-wrap', 'ef-status',
  'ef-bar-list', 'ef-bar-label', 'ef-bar-track', 'ef-bar-fill', 'ef-bar-value',
  'ef-chart', 'ef-series-1', 'ef-series-2', 'ef-series-3', 'ef-series-4',
  'ef-series-5', 'ef-series-6', 'ef-series-stroke', 'ef-series-fill',
  'ef-chart-axis', 'ef-chart-gridline', 'ef-chart-label',
  'ef-field', 'ef-helper', 'ef-error', 'ef-button',
];

test('every published report primitive is declared, and nothing else is', () => {
  const css = read('brand.css');

  for (const name of REPORT_API) {
    assert.match(
      css,
      new RegExp(`\\.${name}(?![a-z0-9-])`),
      `${name} is in the API and not in the stylesheet`,
    );
  }
  const declared = new Set(css.match(/\.ef-[a-z0-9-]+/g) ?? []);
  const unlisted = [...declared].filter((c) => !REPORT_API.includes(c.slice(1)));
  assert.deepEqual(unlisted, [], 'a declared ef-* class is missing from the API list');
});

test('the primitives yield to utilities and make the layout defects unexpressible', () => {
  const css = read('brand.css');

  // In @layer components so a utility on the same element still wins.
  assert.match(css, /@layer components \{/);
  // BRAND-4.1: an evidence table owns the full width of its section.
  assert.match(css, /\.ef-table-wrap table \{[^}]*width: 100%/);
  // A wide table scrolls inside its wrap; the page body never does (BRAND-8).
  assert.match(css, /\.ef-table-wrap \{[^}]*overflow-x: auto/);
  // Peer bars share one label lane, one plot lane, one value lane.
  assert.match(
    css,
    /\.ef-bar-list \{[^}]*grid-template-columns: minmax\(8rem, max-content\) minmax\(0, 1fr\) max-content/,
  );
  // The prose measure is the one place reading width is legitimate.
  assert.match(css, /\.ef-reading \{ max-width: 42rem; \}/);
});

test('status text reads the -text variants, never a fill hue', () => {
  const css = read('brand.css');
  const status = css.match(/\.ef-status[^{]*\{[^}]*\}/g) ?? [];

  assert.ok(status.length >= 4, 'the status rules are missing');
  for (const rule of status) {
    assert.doesNotMatch(
      rule,
      /var\(--(danger|warning|success)\)/,
      `a fill hue is used as status text: ${rule}`,
    );
  }
});
