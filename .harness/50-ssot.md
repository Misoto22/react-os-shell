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

P1 TODO: move shop's full R1–R8 text + examples here; shop's doc then
points at this file.
