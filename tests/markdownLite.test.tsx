import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from '../src/shell/Markdown';
import { colourClassesIn, collapsedSurfaces, darkRemaps } from './darkRemaps';

/**
 * The dependency-free renderer behind `react-os-shell/ui`.
 *
 * It had no spec at all, which is how both of the bugs below survived: one of
 * them mangles every code block it is given, and the other paints a chip the
 * exact colour of the surface behind it. Neither is visible in a diff and
 * neither throws.
 */

const html = (source: string) => renderToStaticMarkup(<Markdown>{source}</Markdown>);

/** The text inside the first <pre>…</pre>, with entities decoded. */
function fenceText(markup: string): string | null {
  const m = /<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/.exec(markup);
  if (!m) return null;
  return m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ── Fenced code blocks ─────────────────────────────────────────────────────

test('a fenced block keeps its lines, its blank lines and its indentation', () => {
  // Every one of these was lost: the block was split on its blank line, each
  // half fell to the paragraph branch, and that branch joins lines with a
  // space. What reached the reader was one long line with two bare backticks
  // in it.
  const source = [
    'The change:',
    '',
    '```yaml',
    'env:',
    '  REVIEWER_PW: ${{ secrets.APP_REVIEW_PASSWORD }}',
    '',
    'steps:',
    '  - name: Require the reviewer secret',
    '```',
    '',
    'Risk class: security-sensitive.',
  ].join('\n');

  const markup = html(source);
  assert.equal(
    fenceText(markup),
    [
      'env:',
      '  REVIEWER_PW: ${{ secrets.APP_REVIEW_PASSWORD }}',
      '',
      'steps:',
      '  - name: Require the reviewer secret',
    ].join('\n'),
  );
  // The fence delimiters themselves must not reach the reader, and the prose
  // on either side must still be its own paragraph.
  assert.ok(!markup.includes('`'), 'a backtick escaped into the output');
  assert.match(markup, /<p>The change:<\/p>/);
  assert.match(markup, /Risk class/);
});

test('the info string is carried as data, not drawn', () => {
  const markup = html('```yaml\nkey: value\n```');
  assert.match(markup, /<pre[^>]*data-language="yaml"/);
  assert.equal(fenceText(markup), 'key: value');

  // No info string, no attribute — rather than an empty one.
  assert.ok(!html('```\nplain\n```').includes('data-language'));
});

test('a fence is not read as a list, a table or a heading', () => {
  // Each of these first lines matches an earlier branch of the block
  // dispatcher. Inside a fence none of them may fire.
  const markup = html('```\n- name: x\n| a | b |\n# not a heading\n```');
  assert.ok(!markup.includes('<ul'), 'fence content became a list');
  assert.ok(!markup.includes('<table'), 'fence content became a table');
  assert.ok(!markup.includes('<h1'), 'fence content became a heading');
  assert.equal(fenceText(markup), '- name: x\n| a | b |\n# not a heading');
});

test('tildes fence too, and a longer closer still closes', () => {
  assert.equal(fenceText(html('~~~\nx\n~~~')), 'x');
  assert.equal(fenceText(html('```\nx\n`````')), 'x');
});

test('a closer of the other character, or one carrying an info string, is content', () => {
  // Both are ordinary lines by CommonMark's rules, and reading either as a
  // closer would end the block early and spill the rest into a paragraph.
  assert.equal(fenceText(html('```\n~~~\nstill code\n```')), '~~~\nstill code');
  assert.equal(fenceText(html('```\n```js\nstill code\n```')), '```js\nstill code');
});

test('an unclosed fence runs to the end of the document', () => {
  // CommonMark's rule, and the kind one for a live preview: a half-typed
  // fence shows the rest as code instead of reflowing the page as the author
  // types the third backtick.
  assert.equal(fenceText(html('```\nline one\nline two')), 'line one\nline two');
});

test('inline code still works, and is not confused with a fence', () => {
  const markup = html('Set `REVIEWER_PW` before the run.');
  assert.match(markup, /<code[^>]*>REVIEWER_PW<\/code>/);
  assert.ok(!markup.includes('<pre'), 'an inline span became a block');
});

// ── Dark mode ──────────────────────────────────────────────────────────────

const SOURCE = 'src/shell/Markdown.tsx';

test('the dark-mode allowlist parses', () => {
  // A parse that quietly returned nothing would make both checks below pass
  // vacuously — the failure mode that matters most for a test whose whole job
  // is to notice an absence.
  const remaps = darkRemaps();
  assert.ok(remaps.size > 150, `parsed only ${remaps.size} dark remaps from ui.css`);
  assert.match(remaps.get('bg-white') ?? '', /background-color/);
  assert.match(remaps.get('bg-gray-200') ?? '', /background-color/);
});

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
  // This is the check that would have caught the inline-code chip: it used
  // `bg-gray-100`, which remaps to `--surface` — and so does `bg-white`, which
  // is what every host panel drawing this component uses.
  const collapsed = collapsedSurfaces(colourClassesIn(SOURCE));
  assert.deepEqual(
    collapsed,
    [],
    'these remap to the same token as bg-white, so they vanish on a white ' +
      'panel in dark mode:\n  ' + collapsed.join('\n  '),
  );
});
