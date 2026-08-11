import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `src/index.ts` re-exports the kit with `export * from './ui'`, so the root
 * entry is a superset of `react-os-shell/ui` and there is ONE list to maintain.
 *
 * The hazard is silent: TypeScript resolves an EXPLICIT local export ahead of a
 * star export, with no error and no warning. Adding
 * `export { default as Card } from './shell/Card'` back into the root barrel
 * would shadow the kit's `Card`, and from then on the two entries could drift
 * apart — different components under one name — while both still compiled and
 * every other test passed.
 *
 * This reads the two files rather than importing them, deliberately. Importing
 * the root barrel means importing the window manager, and through it Headless
 * UI's CJS build — which is exactly the weight `./ui` exists to let a consumer
 * decline, and which needs the repo's focused esbuild double to load in a spec
 * at all. The hazard is textual (a duplicate export site), so proving it
 * textually is both cheaper and stricter: it fails on the re-declaration
 * itself, not on a symptom that only shows once the two bindings differ.
 *
 * Single module identity across the two entries is guaranteed separately, by
 * `tsup.config.ts` shipping both from ONE build with `splitting: true` — a
 * second config with its own outdir would duplicate the toast container and the
 * interceptor Set for anyone importing from both entries.
 */

const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');

/** Names bound by `export {...} from` / `export type {...} from` statements. */
function exportedNames(src: string): Set<string> {
  const out = new Set<string>();
  const re = /export\s+(?:type\s+)?\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    for (let part of m[1].split(',')) {
      part = part.trim().replace(/^type\s+/, '');
      if (!part) continue;
      const as = part.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      out.add(as ? as[1] : part);
    }
  }
  return out;
}

const rootSrc = readFileSync(join(ROOT, 'src/index.ts'), 'utf-8');
const uiSrc = readFileSync(join(ROOT, 'src/ui/index.ts'), 'utf-8');

test('the root barrel re-exports ./ui with a star, not by hand', () => {
  assert.match(
    rootSrc,
    /export\s+\*\s+from\s+'\.\/ui'/,
    "src/index.ts must carry `export * from './ui'` — that is what makes the " +
      'root entry a superset of the kit without a second copy of the list.',
  );
});

test('no name is exported explicitly from both barrels', () => {
  const shadowed = [...exportedNames(uiSrc)].filter(n => exportedNames(rootSrc).has(n)).sort();

  assert.deepEqual(
    shadowed,
    [],
    'These names are exported explicitly from src/index.ts AND from ' +
      `src/ui/index.ts: ${shadowed.join(', ')}. The explicit export in the root ` +
      'silently wins over the star export, so the two entries can drift apart ' +
      'under one name with nothing failing. Delete the root declaration — ' +
      './ui owns the kit surface.',
  );
});

test('the kit surface is non-trivial (a vacuous pass would be worse than a failure)', () => {
  assert.ok(exportedNames(uiSrc).size > 80, `only ${exportedNames(uiSrc).size} names on ./ui`);
});
