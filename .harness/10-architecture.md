# ARCHITECTURE — the EFFICIENT platform map

Multi-tenant wheels/tyres ERP + commerce platform. One backend, one UI kit,
five frontends, one storefront builder, plus CLI/iOS/ops/docs.

## Repositories

| Repo | What | Talks to |
|---|---|---|
| efficient-backend | Django 5 + DRF, PostgreSQL (schema-per-tenant) | serves every portal at `/api/…` |
| react-os-shell | UI kit + desktop shell, published to npm (public repo, outside the org) | consumed by all 5 frontends |
| efficient-admin-portal | React/Vite staff portal (:5173) | `/api/` |
| efficient-customer-portal | React/Vite (:5174) | `/api/customer-portal/` |
| efficient-supplier-portal | React/Vite (:5175) | `/api/supplier-portal/` |
| efficient-dealer-portal | React/Vite (:5176) | `/api/dealer-portal/` |
| efficient-pos | React/Vite till (:5177) — `react-os-shell/ui` ONLY, no window manager | `/api/pos-portal/` |
| efficient-shop | Next 16 multi-tenant storefront | backend storefront APIs |
| efficient-cli | Rust CLI (`efficient`) — full portal parity + MCP server | HTTP API; schema snapshot synced per backend release |
| efficient-ios-app | SwiftUI companion (EFFICIENT Go), offline outbox | `/api/` |
| efficient-ops | Docker Compose dev stack, CI/CD orchestration, Terraform, runbooks | deploys everything |
| efficient-doc | mkdocs-material architecture docs (human-rendered view; harness stays the rule SSOT) | — |
| `.github` (org) | Issue templates | — |

## Load-bearing boundaries

- ARCH-1 — Tenancy: schema-per-tenant; brand only SELECTS a site, never
  scopes content. **Review-only.**
- ARCH-2 — The backend is the SSOT for which apps/models exist
  (`/api/auth/permissions/tree/`); frontends never hard-code that list.
  **Review-only.**
- ARCH-3 — Shell-first placement: UI that can live in react-os-shell goes
  there, not in a portal. Details: `51-frontend-tokens.md`. **Review-only.**
- ARCH-4 — Destructive actions are declared in the backend's
  `mcp_contract/manifest.py`, never in the CLI. **Enforced:** resolver-walking
  tests in `mcp_contract`.

P1: add the data-flow diagram and the tenancy/promote topology from
efficient-ops `docs/DEPLOY.md`.
