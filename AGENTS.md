# react-os-shell

Shared desktop-shell + UI-kit component library, published to npm and
consumed by every EFFICIENT frontend (admin, customer, supplier, dealer,
pos — pos takes the `react-os-shell/ui` subpath only). This repo lives
outside the Efficient org (public, `victorymau/react-os-shell`) but is the
platform's design SSOT, so the harness applies here too.

## Shared conventions — the harness

Org-wide rules live in the sibling checkout
`../efficient-harness/harness/` (from a worktree under `.worktrees/`,
three levels up; canonical repo `Efficient-Pty-Ltd/efficient-harness` —
if the checkout is missing, clone it or run `just clone-missing` in
efficient-ops). Read its `00-INDEX.md` first; edit rules THERE, never
locally. (`51-frontend-tokens.md` especially — this package IS that SSOT.)
Precedence: user instructions > this file > the harness > agent defaults.

## Release checklist (every PR)

This package is published and consumed downstream, so version + changelog
discipline is load-bearing:

- **Bump the version** in `package.json` — the only place. `src/version.ts`
  is NOT hand-edited: it reads `__PKG_VERSION__`, injected by tsup from
  `package.json` at build time (the `define` block in `tsup.config.ts`).
  Consumed without a build (e.g. tests) it stays an empty string, by design.
- **Add a changelog entry** in `CHANGELOG.md` — the only place.
  `src/changelog.ts` is a deliberate empty stub: the package ships no
  built-in changelog; consumers wire their own through
  `DesktopHostConfig.productChangelog`. Leave it alone.
- **Bump the app version** in `BUILTIN_APP_INFO` (`src/apps/_about.tsx`)
  when changing a bundled document/web app (Spreadsheets, Notepad,
  Documents, Preview, Files, Browser) — each carries its own version.
- **Update the help docs** for any added or changed behaviour.
- **Verify before the PR** — the same sequence CI runs:

  ```bash
  npm run typecheck && npm test && npm run build
  ```

  `npm test` is the repo's own runner (`scripts/test.mjs`: esbuild
  transpiles the specs, `node:test` runs them — **no test framework, on
  purpose**); specs live in `tests/`. esbuild strips types without checking
  them, which is why `npm run typecheck` also runs
  `tsc -p tsconfig.test.json`. CI finishes by asserting `dist/` artifacts
  exist.
- **Publish in order:** bump → `npm run build` → `npm publish --dry-run` →
  `npm publish`, then bump the `react-os-shell` `^x.y.z` pin in each
  consuming portal. **Run the dry run after the build, never before** —
  `files` is `["dist"]`, so on an unbuilt tree it reports 3 files instead
  of the ~80 a real release ships. A forgotten bump fails loudly with
  `You cannot publish over the previously published versions`.
- **Rebuild the local demo container after every publish:**
  `docker compose up --build -d` (http://localhost:4173).
