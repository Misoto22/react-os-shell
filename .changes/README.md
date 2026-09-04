# Release fragments

Release metadata for a pull request lives here — **one new file per pull
request**, never an edit to `package.json`'s version, `package-lock.json`'s
version or `CHANGELOG.md`. Those are **bot-owned**: the merge-time job on
`main` (`Assemble release fragments`, `.github/workflows/release-assemble.yml`,
via `scripts/assemble-release.mjs`) assigns the next version, prepends the
`## X.Y.Z` section, deletes the consumed fragments and pushes one
`release: X.Y.Z` commit.

## Why

The version number used to be shared mutable state that every open branch
wrote to, and git auto-merged the collision **silently**: two branches both
writing `"version": "4.93.0"` merge without a conflict and both pull-request
runs stay green, because a green check proves the merge ref that existed when
it ran, not the `main` that exists at merge time.

On 2026-09-04 four open pull requests claimed 4.93.0 at once. Of the 28 pairs
among the nine open branches, **all 28 conflicted — on `CHANGELOG.md`,
`package.json` and `package-lock.json`, and on nothing else.** Two branches
that each rewrote the same 200-line hook merged cleanly. The release files were
the entire contention in the repository.

## Format

Create `.changes/<branch-slug>.md` — your branch name works, and the name only
has to be unique:

```markdown
---
bump: minor
title: StatusBadge takes an optional label
---

- **`StatusBadge` takes an optional `label`.** The derived text — underscores
  to spaces, title case — is right for a status this system named and wrong
  for one that arrived from somewhere else.

  The tone still comes from `status`, so the group mapping stays the one
  source of truth for colour whatever is written on the pill.
```

- `bump:` — `major` | `minor` | `patch`, judged on the **exported package API**
  (`12-cicd.md` CI-3): MAJOR = an export removed or its contract broken,
  MINOR = a new export, prop or behaviour, PATCH = a bug fix.
- `title:` — used in the release commit message. The changelog section takes
  its number from the assembler, so do not write one.
- Body — **the changelog section verbatim**, as prose. This changelog's entries
  argue for themselves in paragraphs and code spans, and that is what a
  consumer reads on npm; the assembler only decides which number sits above
  it. A `## ` heading in the body is rejected, because the release number is
  not yours to pick.

Several fragments merging before the job runs **batch into one release**:
highest bump wins, bodies concatenate in filename order.

## Publishing

Assembling is not publishing. The release commit lands on `main` with the new
number; npm receives it only when a **GitHub Release** tagged `v<version>` is
cut (`.github/workflows/release.yml`), which re-runs the whole gate and
refuses a tag that disagrees with `package.json`.

## No release in this pull request

A workflow, a doc, a test or a refactor that changes nothing a consumer can
observe needs no fragment — add the `no-version-bump` label and the
`Release fragment present and valid` check skips.
