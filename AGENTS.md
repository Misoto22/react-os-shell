# react-os-shell

Shared desktop-shell + UI-kit component library, published to npm and
consumed by the EFFICIENT frontends (admin, customer, supplier; dealer and
pos take the `react-os-shell/ui` subpath only). This repo lives outside
the Efficient org (public, `victorymau/react-os-shell`).

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
- **Publishing is a GitHub Release, not a merge.** Merging to `main` ships
  nothing to npm — deliberately. Two PRs regularly claim the same version
  before one rebases, and `package.json`/`CHANGELOG.md` are hand-edited
  here, so publishing on merge would turn every collision into an
  irreversible registry entry. To release: merge, then cut a Release whose
  tag is `v<version>` matching `package.json`.
  `.github/workflows/release.yml` re-runs typecheck + test + build +
  `verify-dist`, refuses a tag that disagrees with `package.json` or a
  version the registry already has, and publishes with provenance. Then bump
  the `^x.y.z` pin in each consuming portal and refresh its lockfile.
- **Before cutting the Release, dry-run locally:** `npm run build` →
  `npm publish --dry-run`. **After the build, never before** — `files` is
  `["dist"]`, so on an unbuilt tree it reports 3 files instead of the ~80 a
  real release ships.
- **Rebuild the local demo container after every publish:**
  `docker compose up --build -d` (http://localhost:4173).
