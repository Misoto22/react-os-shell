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

test('brand.css imports the kit instead of restating it', () => {
  const css = read('brand.css');

  assert.match(css, /@import "\.\/styles\.css";/);
  // Anything hand-copied from the kit is drift waiting to happen.
  assert.doesNotMatch(css, /^\s*\.[a-z]/m, 'brand.css must declare no classes');
  for (const role of RAMP) {
    assert.doesNotMatch(
      css,
      new RegExp(`\\${role}:`),
      `${role} belongs to the kit, not brand.css`,
    );
  }
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
