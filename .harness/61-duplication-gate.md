# DUPLICATION GATE — the jscpd ratchet

> Canonical org-wide copy (migrated 2026-08-26 from efficient-shop
> `doc/duplication-gate.md`, now a pointer here). **Enforced** in shop
> (`just dup` in `just check`); rollout order P3: dealer → admin → pos →
> the rest. DUP-1..3 summarise; the full text follows.

- DUP-1 — CI fails when copy-paste duplication INCREASES (jscpd tokens vs
  a committed baseline); existing duplication is grandfathered and burned
  down by card. **Enforced** in shop.
- DUP-2 — The gate is textual-only; semantic duplication is measured by
  survey, never gated — a gate you cannot pass is a gate someone deletes.
- DUP-3 — No waiver lists on geometry gates (glyph single-home): an
  exception list goes green on the tenth copy.

---

"No duplicated code / single source of truth" is the project's first rule. This
gate makes the mechanical half of it enforceable: **CI fails when copy-paste
duplication increases.** It does not require the codebase to be duplication-free
today — it draws a line under what exists and stops the line from moving up.

## What it can and cannot see

`jscpd` is a **textual** copy-paste detector. It finds blocks of near-identical
source. It **cannot** see *semantic* duplication — two functions that compute the
same result in different words pass straight through. This gate is the
**mechanical maximum** of the SSoT rule, not a complete SSoT check. Semantic
duplication is still a human-review concern; don't read a green gate as "no
duplication," only as "no new *copy-paste*."

### How big that blind spot is — measured, card 66082

Not a caveat, a number. Card 66078 deleted two hand-written copies of the
two-button segmented control; `just dup` read **the same duplicated-token total
before and after**. Card 66082 re-ran the two implementations in isolation:
61 lines, 365 tokens between them, and **at `--min-tokens 3` jscpd finds zero
clones** — the two files do not share a single three-token run. No setting of
this gate would have caught it.

The eye icon, drawn identically in four files, is the same story from the other
side: two of those copies share exactly **32 tokens**, so `min-tokens` would have
to fall from 70 to ≤32 — where the tree reports **316 clones instead of 65** — and
even then jscpd pairs them with a third copy rather than each other.

`just dup-concepts` (`scripts/survey-duplicate-concepts.mjs`) measures that
second shape directly and **never fails** — it is a survey, not a gate. Full
method and counts: `QUESTIONS-66082.md`.

### Half of it is now a gate — card 66058

The survey's first signal (*the same drawing in two files*) **is** in `just
check`, as `scripts/test-glyph-single-home.mjs`:

> No glyph geometry appears in more than one file.

It was red on **9 drawings across 21 places** when 66082 measured it, and one of
the nine had already drifted — the magnifier existed as two different pictures.
Card 66058 gave each drawing one home (`components/UiIcon.tsx`,
`components/DimensionArrowMarkers.tsx`), which is what earned the promotion:
**a gate you cannot pass is a gate someone deletes.** It carries **no waiver
list** — an exception list goes green the day a tenth copy is drawn, which is
exactly how the eye sat unread in this baseline for months.

The gate and the survey share one fingerprint (`scripts/glyph-geometry.mjs`), so
they cannot disagree about what "the same drawing" means.

What it still cannot see: a concept **redrawn** rather than copied. Two different
fingerprints do not match, so `components/SectionEditorShell.tsx`'s third,
hand-drawn trash can passes. Identical-geometry drift is the half that
mechanises; the rest is `doc/editor-ui.md` E2 and human review.

The survey's **second** signal stays a survey — the `.sf-*` layer is a shared
house vocabulary and most re-use of it is correct.

## How the ratchet works

- The scanner config is [`.jscpd.json`](../.jscpd.json): it scans `app/`,
  `components/`, `lib/`, and `proxy.ts`, at **`minTokens: 70`**.
- The committed baseline is [`.jscpd.baseline.json`](../.jscpd.baseline.json). Its
  `baseline` field is jscpd's total **duplicated-token** count on `main` at the
  time it was generated. Existing duplication is *grandfathered* by that number.
  What that number is grandfathering is triaged clone-by-clone in
  `QUESTIONS-66085.md` §3 — 46 of the 65 are duplication we intend to remove,
  each its own card; 6 are accepted with a stated reason; 13 are data, artwork or
  sample content rather than code.
- On every PR, [`scripts/check-duplication.mjs`](../scripts/check-duplication.mjs)
  (wired into `just check`, so it runs in both the `contract` and
  `scripts-and-tasks` CI workflows) re-scans and **fails only if the current
  duplicated-token count exceeds the baseline.**

We ratchet on an **absolute token count**, deliberately, not a percentage:

- A **percentage** threshold is brittle — it silently loosens as the codebase
  grows (the same copied block is a smaller share of a bigger tree) and reddens
  on unrelated *deletions*. It would trip honest work and get switched off.
- **Duplicated tokens** rises only when real copy-paste is added, so the gate
  fails on exactly the thing we care about. Tokens rather than the clone *count*,
  because inserting a unique line into a copied block *splits* one clone into
  two — that is *less* duplication (good) but would spuriously raise a count.

When the gate fails it prints the **new or changed block(s)** by `file:line`,
identified by a content hash diffed against the baseline — so a red gate always
points at what to fix, never a bare number.

## Why `min-tokens: 70`

At jscpd's default of 50, roughly fifty legitimate 5–7-line repeats (a
`label`+`input` pair, a route-handler guard clause, near-identical JSX) get
flagged — and a gate that reddens on honest work gets disabled, which enforces
nothing. **70** is the conservative setting that *sticks*: it keeps the
substantial copied blocks and drops the small idiomatic ones.

The baseline mechanism makes tightening cheap: once the gate is trusted we can
ratchet `minTokens` **down** to 50–60 — lower the value in `.jscpd.json`, run
`just dup-accept`, and commit the new baseline. Tune up if it ever proves noisy.

## What is out of scope

- **`scripts/`** (the `test-*.ts` guard suite) is **excluded**. Those guards
  share deliberate harness boilerplate and the suite grows by design; gating
  them would fight the grain. There is zero product↔scripts overlap, so nothing
  product-side is hidden by the exclusion.
- **Generated code** — `lib/api/types.ts` (openapi-typescript output) — is
  ignored. `node_modules/`, `.next/`, and other git-ignored paths are skipped.

## Everyday use

```bash
just dup          # show every copy-paste block jscpd finds (no gate)
just check        # runs the gate as part of the full check (what CI runs)
just dup-accept   # regenerate .jscpd.baseline.json from the current tree
```

Run `just dup-accept` when you **intentionally remove** duplication (ratchet the
ceiling down) or when a duplication is **genuinely unavoidable and reviewed**
(accept it). Either way, commit the updated `.jscpd.baseline.json` and call the
change out in the PR so a reviewer sees the ceiling move on purpose.

## Keeping the baseline honest

The baseline was written once, on 2026-08-05, and never re-read. By 2026-08-12 it
had accumulated **552 tokens of headroom** (ceiling 8371, measured 7819) — a
whole file could be copied verbatim and the gate still said ✓ — and **12 of the
65 clones on `main` matched no fingerprint in it at all**, including two blocks in
files created *after* it was written. Card 66085 triaged all 65 (verdicts and
method: `QUESTIONS-66085.md`) and ratcheted the ceiling to the measured figure.

These rules exist so that cannot recur. They are written to survive the same
neglect that produced the problem.

- **B1 — the ceiling is a measurement, never a budget.** `baseline` must equal
  the duplicated-token count on `main`. Headroom is a defect, not spare capacity:
  it is an unreviewed allowance for exactly the thing the gate exists to stop.
  If you lower duplication, regenerate — the ratchet is only a ratchet if it
  moves down.
- **B2 — every baseline move is called out in the PR**, with both numbers, the
  direction, and a one-line reason. A silent `.jscpd.baseline.json` diff is a
  review stop.
- **B3 — a baseline *rise* names the clone and its reason in the PR body**, per
  block. "Accepted wholesale" is what produced 65 untriaged entries in the first
  place; it is not an available answer.
- **B4 — the list must be readable to be reviewable.** The file currently stores
  bare sha1 digests, so a reviewer cannot tell from a diff *what* was accepted,
  only that hashes changed. That unreadability is the mechanical reason the list
  went untriaged for a week. Until the baseline writer records `file:line` and
  token count per entry, `QUESTIONS-66085.md` §3 is the readable list.

Note that `fingerprints` is read **only** in the failure branch, to label what is
new. On a pass it is not consulted, so a clone that is absent from the list still
passes as long as the aggregate fits under the ceiling. Keeping B1 true is what
makes that safe.

## Known limitation

Because the decision is a single aggregate token count, a PR that removes one
duplicated block and adds a different one of the same size in the same change
nets flat and passes. This is a rare, adversarial case; ordinary review still
covers it, and the per-block diff in the failure message covers the common case
of duplication simply going up.
