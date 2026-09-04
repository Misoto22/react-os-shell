---
bump: minor
title: Publish brand.css, and the accessibility fixes proving it exposed
---

- **New `react-os-shell/brand.css`.** A surface rendered outside a portal
  window — a report, a published artifact, a proposal, an HTML email, a printed
  invoice — has no React and no build step, so "resolve the value to
  react-os-shell" has nothing to resolve to. This publishes what those surfaces
  link: `@import "./styles.css"` plus the tokens a page without utility classes
  cannot express (accent scale, status hues, radius, type). Never a hand-copied
  rule, so a class the kit adds tomorrow reaches a brand surface without a
  second edit. `@tailwindcss/cli` compiles it after the copy step, so the
  published export is never the uncompiled entry.

- **New `ef-*` report primitives, in `@layer components`.** A brand surface had
  a vocabulary of utility classes and nothing above it, so every report composed
  its layout from scratch — and the recurring defects (a table at reading width,
  metric boxes that do not share a baseline, bars that do not share a scale)
  were all layout the author had to get right by hand. The primitives take that
  decision away: `.ef-table-wrap` owns the full width of its section,
  `.ef-bar-list` owns one shared label, plot and value lane, `.ef-stat-strip`
  owns the peer grid and its baseline.

  Fifty-three names in seven groups — shell, opening and structure, type roles,
  figures, evidence tables, status, bars and charts, controls. The list is the
  API: harness `52-brand-surface.md` BRAND-2 enumerates the same names, and the
  brand checker reports an `ef-` class outside the list as a defect, so an
  invented `ef-stat-note` renders as nothing exactly like a spacing step the kit
  never compiles. `tests/brandStylesheet.test.ts` pins the list, pins that
  nothing but `ef-*` is declared here, and pins the three layout guarantees.

  Render-neutral for every portal: no portal loads `brand.css`.

- **A page with no `data-theme` follows the OS.** Dark was keyed only to
  `[data-theme="dark"]`, which a portal stamps from the user's own choice. A
  standalone report has no such switch, so every one of those pages rendered
  light to a dark-preferring reader. `brand.css` now carries the kit's dark
  values under `@media (prefers-color-scheme: dark)`, guarded on
  `:root:not([data-theme])` so any explicit stamp still wins. Render-neutral for
  the portals, which always stamp; the test pins the block's values equal to
  `ui.css` so the two cannot drift.

- **New `--accent-text` and `--on-accent`.** `--accent-600` is 5.17:1 on white
  and **3.17:1** on the dark surface, so it is a fill and never an ink, and
  there was no accent counterpart to `--danger-text`. A link on a dark page had
  no AA-safe colour. `--accent-text` is `#1d4ed8` light (6.70:1) and `#60a5fa`
  dark (6.45:1); `--on-accent` is the ink that sits on an accent fill, `#ffffff`
  in both themes, and `.ef-button` reads it instead of a literal.

- **Dark `--ink-faint` clears AA.** It was `#7f849c`, which measures 4.44:1
  against the dark surface — 0.06 under the 4.5:1 bar for normal text. That step
  is what `.text-gray-500` renders as in a dark theme, so it carries real text
  on every portal and has been marginally failing all along. Now `#848aa2` at
  4.79:1. The light value is unchanged at 4.83:1. This is a small visual change
  in dark mode: text using `.text-gray-500` lightens slightly, which is the fix
  rather than a side effect.

- **`.ef-skip-link` clears the 44px target**, where it computed to about 42px —
  the only control on a typical report missing the floor the contract sets for
  every other control. **`.ef-flow` is declared before `.ef-section`**: both are
  specificity (0,1,0), so source order decided whether a section inside a flow
  kept its own 2rem or collapsed to the flow's 1rem. It keeps its own now,
  deliberately and testably.

- **A class named in prose is no longer compiled into the stylesheet.** Tailwind
  scans every text file it can reach, so mentioning a utility in the README or
  the CHANGELOG put it in the bundle as if a component used it. `h-[440px]` and
  `bg-[#abc]` — the two values `.design-sync/conventions.md` cites as examples
  of things that render as **nothing** — were both real classes in the shipped
  stylesheet, and the bundle is what the brand contract treats as the published
  vocabulary. `ui.css` now excludes the documentation from the scan: 21 classes
  dropped, none of which the kit's code uses, and none added. Render-neutral.
