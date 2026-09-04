---
bump: minor
title: A version that actually carries the four fixes main already lists
---

- **No code change. A number the registry has not taken.** `4.93.0` was
  published to npm at 04:41 UTC on 2026-09-04, two hours before #204, #207 and
  #208 merged and shortly before #203. The assembler then stamped `4.93.0` on
  `main` — a number the registry already held — so the repository and the
  tarball have since disagreed: `main`'s `## 4.93.0` section credits four
  changes that `react-os-shell@4.93.0` does not contain. Verified against the
  published tarball: `reconcileColumns`, `col.width}px` and `aria-describedby`
  each appear **zero** times in it.

  npm does not allow republishing a version, so the four reach a consumer only
  under a new one. `efficient-admin-portal` pins `^4.93.0` and has been
  installing the build without them.

  Marked **minor** rather than patch on purpose. Nothing changed since `main`'s
  own 4.93.0, so measured against the repository this is a no-op — but measured
  against **what is actually on the registry**, which is what a consumer
  upgrades from, it adds `StatusBadge`'s `label` prop. The bump describes the
  jump the consumer makes, not the one the git history makes.

  This is also the last occurrence of the race that `.changes/` removes: #206
  and #209 landed at 06:43 and 06:44, minutes after the version was consumed
  for the final time.
