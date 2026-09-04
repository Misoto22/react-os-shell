---
bump: patch
title: Release fragments replace hand-bumped versions
---

- **The version number is no longer chosen on a branch.** A pull request adds
  one `.changes/<slug>.md` fragment and the merge-time job on `main` assigns
  the number, writes the `## X.Y.Z` section, and deletes the fragment —
  several merges that race batch into one release.

  Nothing a consumer imports changes. The entry you are reading was assembled
  by that job.
