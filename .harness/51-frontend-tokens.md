# FRONTEND TOKENS — react-os-shell is the design SSOT

- FT-1 — Color, radius, type scale, spacing resolve to react-os-shell.
  A portal's `index.css` declares none of them. No raw hex in `.tsx`.
  **Enforced:** shop's R3 check; org-wide ratchet lands P3.
- FT-2 — Behaviour-heavy primitives (focus traps, keyboard nav, ARIA,
  dropdown placement, sort state) come from the kit — a local copy is how
  five portals drift apart. Deliberate local exceptions are LISTED in the
  repo's AGENTS.md with a reason (dealer keeps 8; pos imports
  `react-os-shell/ui` only — allow-list test guards it).
- FT-3 — One component library. Ant Design was removed (dealer 0.31.0);
  never reintroduce a second one.
- FT-4 — Touch surfaces (pos): 44×44 min targets, no hover-only
  affordances. **Enforced:** `touchTargets.test.tsx` (pos).
- FT-5 — Kit changes ride the dealer `kit-local`/`kit-npm` loop for local
  trial; a `file:` pin never lands in a lockfile commit. **Review-only.**
