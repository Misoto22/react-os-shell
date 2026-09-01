import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from '../src/markdown';
import { ROOT, colourClassesIn, collapsedSurfaces, darkRemaps } from './darkRemaps';

/**
 * `react-os-shell/markdown` — the full renderer, behind an optional peer.
 *
 * Two things are being pinned here. The first is the DIALECT: four constructs
 * are disabled because bodies that predate markdown would otherwise render
 * surprisingly, and each of those disables is one word in a config object that
 * nothing else would miss. The second is the SAFETY of the arrangement — no raw
 * HTML, no `javascript:` URLs — which is the argument for not adding a
 * sanitiser, and so has to be a test rather than a claim in a comment.
 */

const html = (source: string, props = {}) =>
  renderToStaticMarkup(<Markdown {...props}>{source}</Markdown>);

// ── The dialect ────────────────────────────────────────────────────────────

test('fenced code survives whole', () => {
  const markup = html('```yaml\nenv:\n\n  KEY: value\n```');
  assert.match(markup, /<pre[^>]*>/);
  assert.ok(markup.includes('env:'), 'the fence content is missing');
  assert.ok(markup.includes('KEY: value'), 'the blank line split the block');
});

test('a four-space indent is NOT a code block', () => {
  // A quoted email pasted into a note arrives indented. Reading it as code
  // turns a reply into a monospace slab.
  const markup = html('Reply below:\n\n    > earlier message\n    > second line');
  assert.ok(!markup.includes('<pre'), 'an indented paste became a code block');
});

test('raw HTML renders as the text it is, and is not dropped', () => {
  // react-markdown DROPS raw-HTML nodes silently rather than escaping them, so
  // without the dialect a customer named <John> loses their name from the
  // message entirely — a data-loss bug wearing a rendering bug's clothes.
  const markup = html('Hello <John>, see <script>alert(1)</script>');
  assert.ok(markup.includes('&lt;John&gt;'), 'the angle-bracketed name vanished');
  assert.ok(!/<script/i.test(markup), 'a script tag reached the output');
  assert.ok(markup.includes('alert(1)'), 'the script text was dropped rather than escaped');
});

test('a setext underline stays a rule under a paragraph', () => {
  const markup = html('Not a heading\n---');
  assert.ok(!/<h[12]/.test(markup), 'the line became a setext heading');
});

test('GFM is on: tables, strikethrough, autolinks', () => {
  const markup = html('| a | b |\n| - | - |\n| 1 | 2 |\n\n~~gone~~ https://example.com');
  assert.match(markup, /<table/);
  assert.match(markup, /<del>gone<\/del>/);
  assert.match(markup, /<a[^>]+href="https:\/\/example\.com"/);
});

test('note honours a single newline; article treats it as a soft wrap', () => {
  // A note is typed into a box, where Return means a line break. An article is
  // authored markdown hard-wrapped at ~78 columns, where honouring the wrap
  // would shred every paragraph.
  assert.match(html('one\ntwo'), /<br\s*\/?>/);
  assert.ok(!/<br/.test(html('one\ntwo', { variant: 'article' })), 'article broke a soft wrap');
});

// ── Safety ─────────────────────────────────────────────────────────────────

test('a javascript: URL is neutralised', () => {
  const markup = html('[click](javascript:alert(1))');
  assert.ok(!markup.includes('javascript:'), 'a javascript: URL reached an href');
});

test('links open safely', () => {
  const markup = html('[docs](https://example.com)');
  assert.match(markup, /rel="noopener noreferrer"/);
  assert.match(markup, /target="_blank"/);
});

// ── Host hooks ─────────────────────────────────────────────────────────────

test('clamp adds its classes only when asked', () => {
  assert.ok(!html('x').includes('rosmd-clamp'));
  assert.match(html('x', { clamp: true }), /rosmd-clamp/);
});

test('resolveImageSrc rewrites an article image', () => {
  const markup = html('![screenshot: the panel](images/a.png)', {
    variant: 'article',
    resolveImageSrc: (src: string) => `/media/help/${src}`,
  });
  assert.match(markup, /src="\/media\/help\/images\/a\.png"/);
});

test('components overrides win over the variant set', () => {
  const markup = html('**bold**', {
    components: { strong: (p: Record<string, unknown>) => <b data-mine="1" {...p} /> },
  });
  assert.match(markup, /<b data-mine="1"/);
});

// ── The optional-peer arrangement ──────────────────────────────────────────

test('the entry reaches its parser and nothing else in the package', () => {
  // The peers are optional because this module is the only thing that needs
  // them. An import of anything else from here — a shared util, an icon —
  // would drag the package's own graph in behind it and make the whole
  // arrangement a fiction. `scripts/verify-dist.mjs` asserts the same over the
  // built output, where a shared chunk can do it without a source change.
  const source = readFileSync(join(ROOT, 'src/markdown/index.tsx'), 'utf-8');
  const bare = [...source.matchAll(/^import\s+[^;'"]*from\s*['"]([^.'"][^'"]*)['"]/gm)].map(m => m[1]);
  assert.deepEqual(
    [...new Set(bare)].sort(),
    ['react', 'react-markdown', 'remark-breaks', 'remark-gfm'],
  );
});

// ── Dark mode ──────────────────────────────────────────────────────────────

const SOURCE = 'src/markdown/index.tsx';

test('every colour the renderer uses has a dark-mode remap', () => {
  const remaps = darkRemaps();
  const classes = colourClassesIn(SOURCE);
  assert.ok(classes.length > 8, `expected to find the colour classes, found ${classes.length}`);

  const orphans = classes.filter(c => !remaps.has(c));
  assert.deepEqual(
    orphans,
    [],
    'these classes stay light in dark mode because ui.css does not remap them:\n  ' +
      orphans.join('\n  '),
  );
});

test('no surface the renderer paints collapses into the panel behind it', () => {
  const collapsed = collapsedSurfaces(colourClassesIn(SOURCE));
  assert.deepEqual(
    collapsed,
    [],
    'these remap to the same token as bg-white, so they vanish on a white ' +
      'panel in dark mode:\n  ' + collapsed.join('\n  '),
  );
});

test('ui.css carries the clamp rules the component names', () => {
  // The class is written in the component and the rule lives in the
  // stylesheet; nothing but this connects them, and a clamp with no rule is a
  // prop that silently does nothing.
  const css = readFileSync(join(ROOT, 'src/ui.css'), 'utf-8');
  assert.match(css, /\.rosmd-clamp\s*\{/);
  assert.match(css, /\.rosmd-fade\s*\{/);
});
