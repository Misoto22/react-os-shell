# SEARCH-FIRST — before writing anything new

## SF-1 — The search ladder (run it, in order)
Before writing a new component, function, endpoint, or script:
1. This repo — same concept under another name? (`just find <term>`)
2. Sibling repos — another portal already built it? (esp. admin-portal, the
   richest; check `git show origin/main:<path>` — a checkout may sit on a
   stale branch, which has produced wrong platform-wide conclusions twice)
3. react-os-shell exports — the kit probably has the primitive.
4. The backend — an endpoint/action may already exist (check the OpenAPI
   schema / efficient-cli's snapshot).
5. Open source — a maintained library beats writing it; judge by stars,
   recency, license, and whether it is ALREADY a transitive dependency.
**Enforced:** `just find` recipe (P2); otherwise review.

## SF-2 — Upstream before local
A fix that belongs in the kit goes to react-os-shell first (dealer's
`just kit-local` / `kit-npm` loop is the model — restore `kit-npm` before
committing). A local copy of a kit export is drift by definition.
**Review-only.**

## SF-3 — Skeleton approach
New module = copy the structure of the closest working module in the same
repo; do not invent new patterns where proven ones exist.
**Review-only.**
