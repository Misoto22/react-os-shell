import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `styles.css` was one 500-line file until 4.16.0. It is now an umbrella over
 * `ui.css` (the kit) and `shell.css` (window, taskbar, desktop, sticky notes),
 * so a consumer taking `react-os-shell/ui` can load the half it renders.
 *
 * Splitting a stylesheet is a silent operation to get wrong. A rule dropped
 * from both halves, or landing in the wrong one, produces no error — just an
 * un-remapped colour that nobody sees until they switch to dark mode in
 * production. These specs pin the invariants that make the split safe.
 *
 * The important one is the third. The two halves were INTERLEAVED in the
 * original (glass at 36, dark remaps at 114, sticky notes at 240, taskbar vars
 * at 286), so no ordering of two files can reproduce the original sequence
 * exactly. That is fine only because no selector declares the same property in
 * both halves: with the pairs disjoint, no cascade outcome depends on which
 * file comes first. If someone later adds a rule to shell.css for a property a
 * ui.css rule already sets on a selector that can match the same element, the
 * cascade quietly starts depending on import order — this catches it.
 *
 * The splitting rule, for anyone adding a rule: SELECTOR SCOPE decides, not the
 * comment above it. A rule belongs in shell.css only if its selector is scoped
 * to DOM the shell alone produces ([data-sticky-id], .glass-input-bg,
 * .docs-editor) or it declares a --window-* / --taskbar-* property. A rule
 * naming a bare utility class belongs in ui.css even when the comment says
 * "taskbar" — .text-gray-600 applies to every button in every app, and one such
 * rule (the taskbar text brightening) really was the winning declaration for
 * that class package-wide.
 */

const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
const read = (f: string) => readFileSync(join(ROOT, 'src', f), 'utf-8');

const styles = read('styles.css');
const ui = read('ui.css');
const shell = read('shell.css');

/**
 * At-rule assertions are LINE-ANCHORED against the raw source rather than run
 * over a comment-stripped copy, for two reasons. These files document their own
 * directives in their docblocks, so an unanchored regex matches the prose
 * describing a rule instead of the rule. And a comment stripper cannot be used
 * to fix that here: `@source "./**\/*.js"` itself contains `/*` and `*\/`, so
 * the naive strip eats the middle of the directive and the assertion then fails
 * against a mangled string. Docblock lines begin with ` * `, so anchoring to
 * the start of a line distinguishes them without parsing anything.
 */
const atRules = (src: string, kind: string) =>
  [...src.matchAll(new RegExp(`^\\s*@${kind}\\s+"([^"]+)"`, 'gm'))].map(m => m[1]);

/** (selector, property) pairs a stylesheet declares, comments and at-rules removed. */
function declarations(src: string): Set<string> {
  // At-rule lines go FIRST: `@source "./**\/*.js"` contains `/*` and `*\/`, so
  // stripping comments before it would chew the middle out of the directive and
  // leave a fragment behind for the rule parser to trip over.
  const clean = src
    .replace(/^\s*@(import|source|charset)[^;]*;\s*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set<string>();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if (!sel || sel.startsWith('@')) continue;
    for (const d of m[2].split(';')) {
      const t = d.trim();
      if (t) out.add(`${sel} :: ${t.split(':')[0].trim()}`);
    }
  }
  return out;
}

test('styles.css is an umbrella: tailwind, then the kit, then the shell', () => {
  const order = atRules(styles, 'import');
  assert.deepEqual(
    order,
    ['tailwindcss', './ui.css', './shell.css'],
    'styles.css must import exactly these three, in this order — the kit remaps ' +
      "override Tailwind's utilities, so they have to come after it.",
  );
});

test('ui.css does not import tailwindcss — the consumer controls preflight', () => {
  assert.deepEqual(
    atRules(ui, 'import'),
    ['./themes.css'],
    'ui.css must import themes.css and NOTHING else — in particular not ' +
      'tailwindcss. A consumer mid-migration off another component library needs ' +
      'the theme and utilities layers WITHOUT preflight, whose bare element ' +
      "selectors out-specify that library's :where()-wrapped reset and would " +
      'silently restyle it. They import Tailwind themselves — which every ' +
      'existing portal already does.',
  );
  assert.deepEqual(
    atRules(ui, 'source'),
    ['./**/*.js'],
    'Without @source, Tailwind never sees the class strings inside the package ' +
      'and every utility the kit uses silently disappears from the build.',
  );
});

test('no selector declares the same property in both halves', () => {
  const inBoth = [...declarations(ui)].filter(d => declarations(shell).has(d)).sort();
  assert.deepEqual(
    inBoth,
    [],
    'These (selector, property) pairs are declared in BOTH ui.css and shell.css: ' +
      `${inBoth.join(' | ')}. While the pairs are disjoint, the cascade cannot ` +
      'depend on which file is imported first. Once they overlap, it does — and ' +
      'the two halves were interleaved in the original, so no import order ' +
      'reproduces the old sequence. Move the rule so it lives in exactly one half.',
  );
});

test('neither half is empty and both carry real rules', () => {
  assert.ok(declarations(ui).size > 200, `ui.css declares only ${declarations(ui).size}`);
  assert.ok(declarations(shell).size > 40, `shell.css declares only ${declarations(shell).size}`);
});

test('no stylesheet ends with an unterminated comment', () => {
  // styles.css shipped one for months. It changed nothing until something was
  // appended after it, at which point that rule would have vanished silently.
  for (const [name, src] of [['styles.css', styles], ['ui.css', ui], ['shell.css', shell], ['themes.css', read('themes.css')]] as const) {
    let i = 0, open = 0, close = 0;
    while (i < src.length) {
      if (src.startsWith('/*', i)) {
        open++;
        const end = src.indexOf('*/', i + 2);
        assert.ok(end !== -1, `${name} has a comment opened at index ${i} and never closed`);
        close++;
        i = end + 2;
      } else i++;
    }
    assert.equal(open, close, `${name}: ${open} comment openers, ${close} closers`);
  }
});
