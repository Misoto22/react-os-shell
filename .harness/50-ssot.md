# SSOT — no hard-coding

Adopted org-wide from efficient-shop `doc/no-hardcoding.md` (R1–R8, kept
verbatim there until the P1 migration lands; shop's numbering is retained).
A value is hard-coded when it is written at a use site instead of flowing
from its single source of truth.

- SSOT-1 — Env config: read once per module into a SCREAMING_SNAKE constant
  with an explicit fallback; never `process.env.X` / `os.environ[…]` deep in
  a function, never an inline origin/URL.
- SSOT-2 — Media/asset paths go through the designated resolver
  (`media()` in shop; `ServerEnvironment.mediaURL` in iOS); never a
  concatenated CDN host.
- SSOT-3 — Colors/radii/spacing come from design tokens
  (react-os-shell / CSS custom properties). No raw hex in `.tsx`.
  Details: `51-frontend-tokens.md`.
- SSOT-4 — Domain data lives in manifests/backend, never inline arrays or
  copy in components.
- SSOT-5 — Same function twice in a backend = extract; three similar lines
  beat a premature abstraction, but an identical business rule may exist
  once only.
- SSOT-6 — Secrets: 1Password (machine rule) / AWS SM (Efficient prod) — a
  credential value never appears in code, config, or docs.
  **Enforced:** review + secret scanners.
- SSOT-7 — Entity/app/model lists come from the backend at runtime, never
  duplicated in a frontend.
- SSOT-8 — Copy-paste duplication may not increase: jscpd ratchet
  (`61-duplication-gate.md`). **Enforced** in shop; rollout P3.

---

## The full R1–R8 text (org-adopted; examples reference efficient-shop,
## the reference implementation — migrated 2026-08-26 from its
## `doc/no-hardcoding.md`, now a pointer here)

---

## R1 — Environment config goes through a named module constant

Read each environment variable **once**, at the top of its module, into a
`SCREAMING_SNAKE_CASE` constant with an explicit fallback. Never call
`process.env.X` deep inside a function, and never inline an origin/URL.

✅ Established pattern (`lib/api/index.ts`, `lib/media.ts`):
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const PRODUCT_API_BASE = process.env.NEXT_PUBLIC_PRODUCT_API_URL ?? "";
const CDN = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "");
```

❌ Violation: `fetch("http://localhost:8000/api/...")`, or `process.env.X`
referenced in three different functions.

## R2 — Media paths go through `media()`

Every `<Image>`, `<video>`, `<img>`, or poster path must resolve through
`media()` in `lib/media.ts`. Never concatenate a CDN host inline, never
hardcode an S3/CloudFront origin. The CDN swap must stay a one-env-var change.

❌ Violation: `src="https://cdn.example.com/images/..."`, or
`src={"/media/" + slug + ".png"}` bypassing `media()`.

## R3 — Colors come from design tokens

Colors are defined once in `app/globals.css` as CSS custom properties
(`--bg`, `--gold`, `--fg`, `--card-bg`, …) and consumed via `var(--token)` or
the Tailwind classes mapped to them. **No raw hex in `.tsx` files.**

❌ Violation: a raw hex literal (e.g. `#f5f1e8`, `#c9a461`) in a `.tsx` file.
A forced-theme override block (e.g. a drawer painting a light palette inline)
must still assign **token values**, not raw hex.

## R4 — Domain data lives in `lib/` manifests; content lives in the backend

Sample product, fitment, spec, and photo data for the mock pipeline belong in
`lib/wheels/*`; block shapes and neutral scaffolds in `lib/content/*`.
Components and pages **render** data; they never **contain** it. No inline
product arrays, no inline copy blocks that are really content.

Anything a shopper reads is **backend-owned** — the site record, the
storefront blog, Puck pages, or per-block editor fields. The repo ships no
brand copy, no editorial pages, and no seeded defaults that publish as a
merchant's own: an unfilled block shows a placeholder in the editor and
renders nothing on the live site (one image serves every tenant).

❌ Violation: a `const WHEELS = [{ … }, { … }]` array declared inside a
component or page file.
❌ Violation: a component default (`heading = "Powered by innovation"`) or
fallback list that renders when the backend/editor provides nothing.

## R5 — API types are generated, never hand-written

`lib/api/types.ts` is generated from `openapi.yml` (`pnpm run generate-api-types`).
Never hand-edit it and never hand-type a shape that the spec already defines —
import from `components["schemas"]["…"]` instead. `openapi.yml` is the source
of truth; fix the contract there.

## R6 — Repeated literals become named constants

If the same string or number appears 2+ times and shares one meaning, hoist it
to a named constant at module (or shared) scope.

✅ Established pattern (`lib/auth.ts`): `ACCESS_KEY`, `REFRESH_KEY`.
❌ Violation: the localStorage key `"shop_access_token"` typed inline at three
call sites; a page-size `20` repeated across handlers.

## R7 — Network calls go through the typed clients

Components call the `api` / `products` clients in `lib/api/`. They do not call
`fetch("/api/...")` directly, and they do not assemble endpoint path strings
inline. New endpoints are added to the client, not scattered across components.

## R8 — Magic numbers are named

Pagination sizes, timeouts, retry counts, z-index steps, breakpoint pixel
values used in logic — give them a named constant explaining intent. A bare
number whose meaning is not obvious from context is a violation.

---

## Not hard-coding — do not "fix" these (avoid churn)

- The token definitions in `app/globals.css` themselves — that **is** the
  single source; raw hex is correct there.
- Tailwind utility values that express a deliberate one-off design decision
  (spacing, sizing) with no config dimension and no repetition.
- A genuine one-use constant with no environment/config dimension — naming it
  is fine, but do not invent a config layer it does not need.
- Backend-owned field names: `lib/api` types for the REGIS Django backend use
  `snake_case` (`is_active`, `logo_url`) on purpose — that mirrors the backend
  contract. Do not "normalize" them. (Frontend-owned product API stays
  `camelCase` — see `doc/naming.md` N4.)

When unsure whether something is a true violation, **stop and ask** rather
than churning code — see `doc/GOAL.md` guardrails.
