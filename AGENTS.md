# react-os-shell

Shared desktop-shell + UI-kit component library, published to npm and
consumed by the EFFICIENT frontends (admin, customer, supplier; dealer and
pos take the `react-os-shell/ui` subpath only). This repo lives outside
the Efficient org (public, `victorymau/react-os-shell`).

## Release checklist (every PR)

This package is published and consumed downstream, so version + changelog
discipline is load-bearing:

- **Add a release fragment** — `.changes/<branch-slug>.md`, with `bump:` +
  `title:` frontmatter and the changelog prose below it. See
  `.changes/README.md`. **Do NOT touch the version in `package.json` or
  `package-lock.json`, and do NOT edit `CHANGELOG.md`** — those three are
  bot-owned. The merge-time job on `main`
  (`.github/workflows/release-assemble.yml`) assigns the number, writes the
  section, and deletes the fragment; several merges that race batch into one
  release. The `Release fragment present and valid` check fails a PR that
  bumps a version by hand, and a PR that ships no release carries the
  `no-version-bump` label instead.

  This replaced the hand-bump convention on 2026-09-04, when four open PRs
  had all claimed 4.93.0 and all 28 pairs among the nine open branches
  conflicted — on `CHANGELOG.md`, `package.json` and `package-lock.json` and
  on nothing else. Two branches rewriting the same 200-line hook merged
  clean.
- `src/version.ts` is NOT hand-edited either: it reads `__PKG_VERSION__`,
  injected by tsup from `package.json` at build time (the `define` block in
  `tsup.config.ts`). Consumed without a build (e.g. tests) it stays an empty
  string, by design. `src/changelog.ts` is a deliberate empty stub: the
  package ships no built-in changelog; consumers wire their own through
  `DesktopHostConfig.productChangelog`. Leave both alone.
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
- **Merging assigns a number; publishing is a separate act.** The release
  commit lands on `main` with the new version. npm receives it when a
  release is cut for that version — then bump the `react-os-shell` `^x.y.z`
  pin in each consuming portal. Dry-run locally first: `npm run build` →
  `npm publish --dry-run`, **after the build, never before** — `files` is
  `["dist"]`, so on an unbuilt tree it reports 3 files instead of the ~80 a
  real release ships.
- **Rebuild the local demo container after every publish:**
  `docker compose up --build -d` (http://localhost:4173).
