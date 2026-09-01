import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Reading `ui.css`'s dark-mode remaps, for specs that need to know whether a
 * colour a component uses survives the theme.
 *
 * Dark mode in this package is not a Tailwind variant: `ui.css` REMAPS the
 * utility classes under `[data-theme="dark"]`. That gives a component two ways
 * to be wrong that no diff shows — using a class with no remap (it stays
 * light-on-light), or using one whose remap lands on the same token as the
 * surface behind it (it goes invisible). Both have shipped.
 */

export const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');

const UI_CSS = readFileSync(join(ROOT, 'src/ui.css'), 'utf-8');

/** A dark-mode selector, with any pseudo-class suffix dropped. */
const DARK_SELECTOR = /^\[data-theme="dark"\]\s+\.([A-Za-z0-9\\/_.-]+?)(?::[a-z-]+)?$/;

/**
 * `bg-gray-100` → `background-color: var(--surface) !important`, for every
 * class remapped in dark mode.
 *
 * Line-oriented rather than a regex over the whole file, because selectors come
 * in comma-separated GROUPS that span lines:
 *
 *     [data-theme="dark"] .border-blue-300,
 *     [data-theme="dark"] .hover\:border-blue-300:hover { … }
 *
 * Matching `.class {` directly silently drops the first half of every such
 * group — which reads as "this class has no dark mode" and would fail a build
 * over a class that is remapped perfectly well.
 */
export function darkRemaps(): Map<string, string> {
  const out = new Map<string, string>();
  let group: string[] = [];

  for (const raw of UI_CSS.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('/*') || line.startsWith('*')) continue;

    const open = line.indexOf('{');
    if (open === -1) {
      if (line.endsWith(',')) group.push(line.slice(0, -1));
      continue;
    }
    group.push(line.slice(0, open).replace(/,$/, ''));

    const close = line.lastIndexOf('}');
    const decl = close > open ? line.slice(open + 1, close).trim() : '';
    for (const selector of group) {
      const hit = DARK_SELECTOR.exec(selector.trim());
      if (hit && decl) out.set(hit[1].replace(/\\/g, ''), decl);
    }
    group = [];
  }
  return out;
}

/**
 * A COLOUR utility ends in a shade or a named constant. Without that anchor the
 * match takes `border-b`, `border-collapse`, `border-l-4` and `border-dashed`
 * too — none of which has, or wants, a remap.
 */
const COLOUR_CLASS = /^(bg|text|border|divide)-([a-z]+-\d{2,3}|white|black|transparent|current)(\/\d+)?$/;

/**
 * Drop whole-line comments and block comments.
 *
 * Necessary because the very thing this check exists to prevent gets WRITTEN
 * DOWN next to the code that avoids it — "use bg-gray-200, never bg-gray-100"
 * is the most useful comment in the renderer and it names a class the scan
 * would otherwise treat as one the component paints.
 *
 * Line-oriented rather than a regex over the file: stripping `/…/` and `//`
 * with a regex eats the `//` in every URL literal.
 */
function stripComments(source: string): string {
  const out: string[] = [];
  let inBlock = false;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line.startsWith('//')) continue;
    if (line.startsWith('/*') || line.startsWith('{/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    out.push(raw);
  }
  return out.join('\n');
}

/** Every colour utility named in a className string in a source file. */
export function colourClassesIn(relPath: string): string[] {
  const source = stripComments(readFileSync(join(ROOT, relPath), 'utf-8'));
  const found = new Set<string>();
  for (const [, literal] of source.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\}|'([^']+)')/g)) {
    for (const cls of (literal ?? '').split(/\s+/)) {
      const bare = cls.replace(/^(hover|focus|even|marker|first|dark):/, '');
      if (COLOUR_CLASS.test(bare)) found.add(bare);
    }
  }
  // Class lists built by concatenation (`` `${extra} … border-gray-200 …` ``)
  // are not in a className= position at all. Sweep any string literal for the
  // same shapes so a renderer that assembles its classes is covered too.
  for (const [, literal] of source.matchAll(/['"`]([^'"`\n]*(?:bg|text|border|divide)-[a-z]+-\d{2,3}[^'"`\n]*)['"`]/g)) {
    for (const cls of literal.split(/\s+/)) {
      const bare = cls.replace(/^(hover|focus|even|marker|first|dark):/, '');
      if (COLOUR_CLASS.test(bare)) found.add(bare);
    }
  }
  return [...found].sort();
}

/**
 * The classes a component paints that would be invisible on the panel behind
 * them: hosts draw on `bg-white`, and any `bg-` class remapping to the same
 * token is styled, present, and unreadable in dark mode.
 */
export function collapsedSurfaces(classes: string[]): string[] {
  const remaps = darkRemaps();
  const panel = remaps.get('bg-white');
  if (!panel) throw new Error('ui.css no longer remaps bg-white — this check needs rewriting');
  return classes.filter(c => c.startsWith('bg-') && remaps.get(c) === panel);
}
