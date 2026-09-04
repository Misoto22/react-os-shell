---
bump: patch
title: A table follows a column list that changes while it is open
---

- **A table now follows a column list that changes while it is open.**
  `useColumnConfig` seeded its state once, in the `useState` initialiser, and
  never looked at `defaultColumns` again. A consumer whose columns change while
  the window stays mounted — a comparison period switched on, a mode revealing
  extra measures, a permission resolving after the first paint — got nothing:
  the new definitions never entered the state, so `orderedColumns` never
  mentioned them and the table simply did not draw them. Closing the window and
  opening it again was the only way to see them, and nothing on screen
  suggested that.

  Withdrawing a column had the mirror problem: its key stayed in the state
  after its definition was gone, and `orderedColumns` spreads
  `defaultColumns.find(...)!` over each entry — a non-null assertion on
  `undefined`, leaving a column with a width and no key or label.

  The user's decisions win wherever they exist: a column that is still declared
  keeps its width, its hidden flag and its position. A new one lands beside the
  column it was DECLARED next to rather than at the far right, because a column
  that only reads next to another — a prior-period figure beside the current
  one — is useless eleven columns away. A column that is withdrawn and then
  comes back returns as the user left it, so a toggle cannot quietly undo their
  choice to hide one.

  Reconciliation is deliberately not persisted: a set that comes and goes with
  a UI toggle would otherwise PATCH the user's profile on every flip. The
  existing persist paths — resize, drag, hide, reset — still capture it as soon
  as the user decides something.
