# CICD — release fragments, checks, promote

## CI-1 — Release metadata is a fragment, not a version bump
Every feature PR adds `.changes/<branch-slug>.md` (`bump:` major|minor|patch
+ `title:`); merge-time CI assigns the version on main, serialized. Bot-owned
files are never edited on a branch. Racing PRs batch: highest bump wins.
**Enforced:** `Release fragment present and valid` on 7 repos.

## CI-2 — One verify entry point per repo
`just verify` runs the same sequence CI runs (lint → typecheck → test →
build, per stack). Repos converge on this name in P2 (today: pos `verify`,
shop `check`, others ad-hoc).
**Enforced:** harness-check asserts the recipe exists (P3).

## CI-3 — Version bump semantics
Backend: API surface only. Portals: user-facing surface only. Kit
(react-os-shell): semver on the exported API. Versions are independent
between repos; the portals stamp the shell version they ship with.
**Review-only.**

## CI-4 — Deploy pipeline
build → deploy-preview (auto) → promote.yml (manual). Backend promotes by
`migrate_schemas` THEN container flip — hence the expand/contract migration
rule (backend CLAUDE.md; the two-release column-drop discipline).
Reference: efficient-ops `docs/DEPLOY.md`.
**Enforced:** Migration safety workflow (backend).

## CI-5 — Shared CI logic is a reusable workflow, never a copied script
The 4-way divergence of `assemble-release.mjs` is the counterexample.
Convergence target (P3): `workflow_call` workflows in THIS repo; per-repo
ci.yml keeps only stack-specific jobs.
**Enforced:** by construction once P3 lands.
