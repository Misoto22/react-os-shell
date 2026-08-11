import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * `react-os-shell/ui` promises the UI kit WITHOUT the window manager, and the
 * only thing making that true is that nothing reachable from `src/ui/index.ts`
 * imports an optional peer.
 *
 * It is a one-line promise to break. Before 4.16.0, `forms/Select` imported one
 * function from `shell/Modal` — and that single edge pulled react-router-dom,
 * @tanstack/react-query, axios, @headlessui/react and @heroicons/react into any
 * bundle containing a dropdown. The next such import will look just as harmless
 * in review, which is why this is a test and not a convention.
 *
 * It matters most for the consumers with the thinnest dependency lists: the
 * till has no @heroicons/react installed at all, and heroicons is declared an
 * OPTIONAL peer, so pnpm will not install it on their behalf. A stray icon
 * import here is an unresolvable module in their build, not a degraded style.
 *
 * This walks the source graph. `scripts/verify-dist.mjs` makes the same
 * assertion against the built output, which is the half that catches leakage
 * arriving through a shared chunk — no source-level test can see that.
 */

const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..');
const ENTRY = join(ROOT, 'src/ui/kit.ts');

/** The only bare specifiers a peer-free module may import. */
const ALLOWED_BARE = new Set(['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server']);

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function resolveRelative(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec);
  for (const ext of ['', ...EXTENSIONS]) {
    const candidate = base + ext;
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        if (readFileSync(candidate)) return candidate;
      } catch { /* a directory — fall through to the index probe */ }
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = join(base, `index${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every module specifier in an import/export-from position, plus dynamic imports. */
function specifiersOf(src: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:^|\n)\s*import\s+[^;'"]*from\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s+[^;'"]*from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) out.push(m[1]);
  }
  return out;
}

test('nothing reachable from src/ui/index.ts imports an optional peer', () => {
  const seen = new Set<string>();
  const offences: string[] = [];
  const queue = [ENTRY];

  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const src = readFileSync(file, 'utf-8');
    for (const spec of specifiersOf(src)) {
      if (spec.startsWith('.')) {
        const target = resolveRelative(file, spec);
        if (target) queue.push(target);
        else offences.push(`${file.slice(ROOT.length + 1)} imports '${spec}', which does not resolve`);
        continue;
      }
      if (ALLOWED_BARE.has(spec)) continue;
      offences.push(`${file.slice(ROOT.length + 1)} imports '${spec}'`);
    }
  }

  assert.deepEqual(
    offences,
    [],
    'react-os-shell/ui must import nothing but react and react-dom. Offending imports:\n  ' +
      offences.join('\n  ') +
      '\nEither keep the component out of src/ui/index.ts, or split the thing it ' +
      'needs into a leaf module both sides can import (see src/shell/escapeInterceptors.ts).',
  );

  // A graph that collapsed to nothing would pass vacuously.
  assert.ok(seen.size > 50, `expected the kit to reach many modules, walked only ${seen.size}`);
});
