import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Dark mode is 221 `!important` rules remapping Tailwind utility names, and
 * every neutral in them used to be a literal. A consumer wanting a different
 * dark — warmer, higher contrast, its own brand — had to fork the file.
 *
 * The neutral ramp is now twelve variables the rules read. The status hues
 * (red for danger, amber for warning) stay literal on purpose: they mean the
 * same thing in every product, and redefining "danger" is a different
 * conversation from restyling greys.
 *
 * What these specs protect is the promise that made the change safe to ship:
 * with the defaults in place, every rule resolves to exactly the value it
 * resolved to before. A tokenisation that quietly shifts one grey is the kind
 * of thing nobody sees until they are in dark mode in production.
 */

// REPO_ROOT the way cssSplit.test.ts does it: the runner transpiles specs into
// node_modules/.cache, so import.meta.dirname points at the cache rather than
// at the repo, and a bare relative path finds nothing.
const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
const CSS = readFileSync(join(ROOT, 'src', 'ui.css'), 'utf-8');

/** The declaration block at the top of the dark theme. */
function ramp(): Record<string, string> {
  const block = /\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(CSS)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-f]{6});/g)) out[name] = value;
  return out;
}

/**
 * Every dark utility rule as a whole BLOCK, not as a line: a selector list
 * spans several lines, so a line-based match counts its continuations as rules
 * of their own and then trips over one that has no declaration on it.
 */
function darkRules(): string[] {
  return [...CSS.matchAll(/\[data-theme="dark"\] \.[^{]*\{[^}]*\}/g)].map(m => m[0]);
}

/** The same blocks with the ramp variables substituted back to literals. */
function resolvedRules(): string[] {
  const vars = ramp();
  return darkRules().map(rule => {
    let out = rule;
    for (const [name, value] of Object.entries(vars)) out = out.replaceAll(`var(${name})`, value);
    return out;
  });
}

test('the ramp is declared where the rules can see it', () => {
  const vars = ramp();
  assert.equal(Object.keys(vars).length, 12, 'twelve steps: surface x3, line x3, ink x6');
  for (const name of ['--surface', '--surface-sunken', '--surface-raised', '--line-subtle', '--line', '--line-strong']) {
    assert.ok(vars[name], `${name} missing`);
  }
});

test('no rule resolves to nothing', () => {
  // A `var(--typo)` renders as an empty value, which drops the declaration and
  // leaves the LIGHT colour showing in dark mode — invisible in review.
  const declared = new Set(Object.keys(ramp()));
  for (const [, name] of CSS.matchAll(/var\((--[a-z-]+)\)/g)) {
    if (name.startsWith('--surface') || name.startsWith('--line') || name.startsWith('--ink')) {
      assert.ok(declared.has(name), `${name} is used but never declared`);
    }
  }
});

test('every neutral rule reads the ramp rather than a literal', () => {
  // The point of the change. A literal left behind is a value a consumer
  // cannot reach, and it will be the one that looks wrong in their theme.
  const NEUTRALS = ['#1e1e2e', '#181825', '#313244', '#2a2a3c', '#45475a', '#6c7086', '#7f849c', '#9399b2', '#a6adc8', '#bac2de', '#cdd6f4'];
  for (const rule of darkRules()) {
    for (const hex of NEUTRALS) {
      assert.ok(!rule.includes(hex), `a neutral literal survived: ${rule.trim()}`);
    }
  }
});

test('the status hues are deliberately still literal', () => {
  // Guards the scope. If someone later tokenises these too it should be a
  // decision, not a side effect of touching this file.
  assert.ok(darkRules().some(r => /#f(ca5a5|87171|de68a)/.test(r)), 'the red/amber tints should still be literals');
});

test('resolving the defaults reproduces the rules exactly', () => {
  // The compatibility claim, asserted rather than assumed: with the shipped
  // defaults, dark mode renders what it rendered before this change.
  const rules = resolvedRules();
  assert.ok(rules.length > 150, `expected the full dark block, got ${rules.length} rules`);
  for (const rule of rules) {
    assert.doesNotMatch(rule, /var\(/, `unresolved after substitution: ${rule.trim()}`);
    assert.match(rule, /!important;?\s*\}$/, `malformed rule: ${rule.trim()}`);
  }
});
