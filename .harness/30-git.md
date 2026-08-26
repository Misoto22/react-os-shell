# GIT — commits, branches, PRs, cross-repo references

Codifies the conventions already live in the repos (verified against
origin/main history 2026-08-26).

## GIT-1 — Commit subjects
English, imperative, ≤72 chars. `type(scope): subject` where it helps
(`feat(purchase-orders): …`, `fix(checkout): …`, `chore: pin react-os-shell
4.79.2`); a bare card-number prefix (`031: …`, `11020: …`) is the accepted
alternative already in use. `release: X.Y.Z` is bot-only — never hand-write one.
**Enforced:** Review-only.

## GIT-2 — One logical change per commit; feature branches only
Never commit to main/master directly; never force-push main.
**Enforced:** branch protection (org).

## GIT-3 — Release fragments, not version bumps
One `.changes/<branch-slug>.md` per PR (`bump:` + `title:` frontmatter).
Bot-owned files (version.ts / changelog.json / CHANGELOG.md / pyproject
version) are never touched on a PR branch. Infra-only PRs: `no-version-bump`
label instead — added AT CREATE TIME on repos where the check won't re-run
on label events (efficient-pos).
**Enforced:** `Release fragment present and valid` check (admin, dealer, pos,
shop, backend, customer, supplier).

## GIT-4 — Cross-repo issue references
Same-repo: `#123`. Cross-repo, use the short slug prefixes already in commit
history: `be#1663` (backend), `ad#1676` (admin-portal), `sh#771` (shop),
`ap#1575` (admin-portal, legacy) — or the full `owner/repo#123`.
**Enforced:** Review-only.

## GIT-5 — No squash-merge for hotfixes
A squash-merge once downgraded prod: rebase/cherry-pick instead.
**Enforced:** Review-only.

## GIT-6 — Lint before committing
Rust `cargo clippy` · Python `ruff check` (efficient-backend: NEVER
`ruff format`) · TS `just lint`.
**Enforced:** CI lint jobs; backend ruff gate lints added lines only.
