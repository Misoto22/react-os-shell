---
bump: minor
title: ScatterChart takes an axis domain and a log scale
---

- **`ScatterChart` takes an axis domain, instead of always deriving one.** The
  derived domain rounds its top up to a readable number, which is right when
  the reader compares against a round target and wasteful when they do not: a
  maximum of 33,000 becomes an axis to 50,000 and spends a third of the plot
  on range the data never reaches. `xDomain` / `yDomain` say "the data's own
  extent is the interesting range" and get the whole width for it.

- **`ScatterChart` can put either axis on a log scale.** `xScale="log"` /
  `yScale="log"` for a long tail — per-route request counts where most points
  sit near the origin and two or three run orders of magnitude past them. On a
  linear axis the many collapse into one clump against the axis and the chart
  only answers about the outliers. A value at or below the floor draws AT it:
  visible, and not claimed to be distinguishable from its neighbours.

- **New `logScale` export**, alongside `linearScale`. It ticks in powers of
  ten rather than in even slices — evenly spaced values on a log axis land at
  absurd positions, a tick at 25,000 almost touching one at 50,000 while
  everything below 10,000 goes unlabelled. A domain too narrow to contain a
  power of ten still labels its own ends, so the axis is never blank.

- **A log axis derives its floor from the data, not from the constant 1.** The
  floor was a hard `Math.max(1, …)` applied to BOTH ends of the domain, which
  is right for counts and silently wrong for everything else: a domain of
  seconds like `[0.02, 0.9]` came back as `[1, 1]`, so every point drew on one
  pixel column beneath an axis labelled `1`, and no caller could opt out.
  Fractional data is exactly what a log axis is for. The floor is now the
  domain's own low end whenever that is positive; only a domain reaching zero
  or below borrows one, three decades under its top — which for counts still
  lands on the 1 the constant hard-coded. `ScatterChart` derives a log domain
  from the smallest POSITIVE value rather than `Math.min(0, …)`, and a domain
  with nothing positive in it degenerates rather than emitting NaN geometry.

- **A log axis stops labelling an end that sits on top of a power of ten.** The
  domain's ends were appended unconditionally, so `[1, 1200]` printed both
  1,000 and 1,200 — a twelfth of a decade apart, sixteen pixels on a 400px
  plot, two thirty-pixel labels over each other. An end now earns its tick only
  when no power of ten is within a sixth of a decade of it.

- **A point outside a supplied domain is dropped, and the drop is announced.**
  The scales extrapolate rather than clamp, and the plot's clip is padded by a
  bubble radius so an edge bubble is not sliced in half — so a point just
  outside the domain painted over the y-axis tick labels, and one further out
  vanished entirely while still taking a stop in the keyboard walk and a
  tooltip. A domain is a window on the data: what falls outside it is not
  drawn, and the count reaches the chart's accessible label instead of nothing
  reaching anywhere.
