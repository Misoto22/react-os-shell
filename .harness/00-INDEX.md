# Harness index

Read this first. Precedence: user instructions > repo `AGENTS.md` > these
rules > agent defaults. When rules conflict, the more specific one wins;
when still unclear, stop and ask.

| File | Scope | Status |
|---|---|---|
| `10-architecture.md` | Platform map: repos, data flow, tenancy | draft |
| `11-versions.yml` | Machine-readable toolchain/dependency matrix | **enforced** by `check-versions.py` (P3) |
| `12-cicd.md` | Release fragments, CI checks, preview → promote | draft |
| `20-api.md` | REST conventions (RFC 9457 errors, pagination, auth) | draft |
| `21-cli-mcp.md` | CLI verbs, MCP tool naming, destructive-action manifest | draft |
| `22-entity-naming.md` | The 7-layer entity naming table | **canonical** (source repos hold pointers) |
| `30-git.md` | Commits, branches, PR titles, cross-repo refs | draft |
| `31-issues.md` | Issue templates: org `.github` repo is the only SSOT | draft |
| `40-code-naming.md` | Identifier conventions per language | draft |
| `50-ssot.md` | No hard-coding (R1–R8) | **canonical** (shop holds a pointer) |
| `51-frontend-tokens.md` | Color/radius/spacing/components resolve to react-os-shell | draft |
| `60-search-first.md` | Search before writing: this repo → siblings → shell → OSS | draft |
| `61-duplication-gate.md` | jscpd ratchet + glyph gate | **canonical**; enforced in shop, rollout P3 |
| `70-ui-rules.md` | Windows/forms/buttons/lists/shared-component rules | **canonical** (ops skills are pointers) |
| `71-erp-workflow.md` | Business logic, status flows, numbering | **canonical** (ops skills are pointers) |
