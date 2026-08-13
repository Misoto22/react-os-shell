import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Shape and type had no token here at all, so "inherit the kit's radius"
 * resolved to "inherit Tailwind's default" — the kit had no opinion to
 * inherit, and a consuming portal that wanted one declared its own `@theme`
 * and stopped taking anything from this package.
 *
 * The block added here equals Tailwind's defaults exactly. That is the point:
 * nothing renders differently, and what changes is WHERE the value comes from.
 * One edit here moves every portal that has not overridden it.
 */

const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
const CSS = readFileSync(join(ROOT, 'src', 'ui.css'), 'utf-8');

function theme(): Record<string, string> {
  const block = /@theme\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const [, k, v] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
  return out;
}

/** Tailwind v4's own values — what every consumer renders today. */
const TAILWIND = {
  '--radius-sm': '0.25rem',
  '--radius-md': '0.375rem',
  '--radius-lg': '0.5rem',
  '--radius-xl': '0.75rem',
  '--radius-2xl': '1rem',
};

test('the radius rungs are declared', () => {
  const t = theme();
  for (const k of Object.keys(TAILWIND)) assert.ok(t[k], `${k} missing`);
});

test('every value equals Tailwind\'s default, so nothing moves', () => {
  // The compatibility claim. A rung that differs is a silent restyle of every
  // consumer that has not overridden it — the kind of change that ships as
  // "added tokens" and lands as "why is everything rounder".
  const t = theme();
  for (const [k, v] of Object.entries(TAILWIND)) {
    assert.equal(t[k], v, `${k} would change what consumers render`);
  }
});

test('the type tokens are the system stacks', () => {
  // The token is here; the TYPEFACE is not. Shipping a face means hosting and
  // licensing it. Until that is decided, a portal that sets nothing gets what
  // it got before this block existed.
  const t = theme();
  assert.match(t['--font-sans'] ?? '', /^ui-sans-serif, system-ui/);
  assert.match(t['--font-mono'] ?? '', /^ui-monospace, SFMono-Regular/);
});

test('the block is a plain @theme, not @theme inline', () => {
  // `inline` resolves the values at build time, which would stop a consumer
  // overriding them through a variable — the opposite of the point.
  assert.match(CSS, /@theme\s*\{/);
  assert.doesNotMatch(CSS, /@theme\s+inline/);
});
