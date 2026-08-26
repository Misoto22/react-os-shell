# API — REST conventions (skeleton; P1 fills from live practice)

- API-1 — URLs: lowercase, plural, kebab-case; portal surfaces are
  namespaced (`/api/dealer-portal/…`, `/api/pos-portal/…`). DRF keeps the
  trailing slash — clients preserve it (iOS learned this the hard way).
- API-2 — Errors: RFC 9457 problem+json; collect ALL field errors; never
  leak stack traces/SQL/internal names. This backend returns 400 (not 422)
  for validation.
- API-3 — Auth: JWT Bearer (simplejwt); 401 authn / 403 authz.
- API-4 — Pagination: every list endpoint paginates (CappedListPagination
  pattern), filters and orders via whitelists only.
- API-5 — Nested writes REPLACE server-side (SO items, PO po_items, QC
  items, …): forms send header fields only; full-item payloads must carry
  every id. **Enforced:** serializer tests (backend).
- API-6 — New endpoints are additive; column/model drops follow the
  two-release expand/contract discipline. **Enforced:**
  `check_expand_contract.py` (backend Migration safety workflow).
- API-7 — Every API surface change syncs efficient-cli's schema snapshot in
  the same release cycle. **Enforced:** CLI sync checklist (backend CLAUDE.md).

P1: fold in the org REST style guide (response envelopes, ordering/filtering
params, rate-limit headers) with examples from the live backend.
