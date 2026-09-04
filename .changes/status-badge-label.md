---
bump: minor
title: StatusBadge takes an optional label
---

- **`StatusBadge` takes an optional `label`.** It derived its text from the raw
  status — underscores to spaces, title case — with no way to override it. That
  is right for a status the system named itself and wrong for one that arrived
  from somewhere else: Stripe's `trialing` reads as "Trialing" rather than
  "Trial", and its `canceled` puts an American spelling in front of a
  British-English tenant.

  A consumer needing one word changed had to abandon the badge and hand-roll
  the whole pill — and took the colours with it, which is exactly the drift
  this component exists to prevent. In admin-portal that is five files, each
  carrying its own status→colour literals.

  The tone still comes from `status`, so the group mapping stays the single
  source of truth for colour whatever is written on the pill. An empty string
  is honoured rather than falling back, for an icon-only pill.
