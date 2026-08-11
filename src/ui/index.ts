/**
 * `react-os-shell/ui` — the build entry. The surface itself is in `./kit`.
 *
 * Two files rather than one, for a build reason worth knowing: esbuild does NOT
 * expand `export * from` when the target module is ALSO an entry point. With
 * the list living in this file, `src/index.ts`'s `export * from './ui'` silently
 * produced a root barrel missing all 91 kit exports — the package's entire
 * public surface, gone, with a clean typecheck and a green test run.
 *
 * So the list lives in `./kit`, which is NOT an entry: this file re-exports it
 * for the subpath, and `src/index.ts` re-exports the same module for the root.
 * Both stars point at a plain module, both expand, and there is still exactly
 * one list. `scripts/verify-dist.mjs` checks the built artifact, because that
 * failure is invisible at source level.
 */
export * from './kit';
