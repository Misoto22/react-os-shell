/**
 * Command line for the release assembler — run by the merge-time job in
 * `.github/workflows/release-assemble.yml`, and by hand for a dry run.
 *
 * Separate from `release-fragments.mjs` so that module has no side effect on
 * import. A `main`-guard inside it would be a trap: `tests/releaseFragments`
 * is bundled by esbuild before it runs, and inside a bundle `import.meta.url`
 * and `process.argv[1]` are the same path — so the guard passes and merely
 * importing the module releases the repository. It did, once, before this file
 * existed.
 *
 * Prints the new version — and nothing else — to stdout, so the workflow can
 * read it into the commit message.
 */
import { assemble, FragmentError } from './release-fragments.mjs';

try {
  console.log(assemble());
} catch (err) {
  if (err instanceof FragmentError) {
    console.error(`::error title=release assembly failed::${err.message}`);
    process.exit(1);
  }
  throw err;
}
