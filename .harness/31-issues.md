# ISSUES — templates and filing

## ISS-1 — Org `.github` repo is the only template SSOT
The five templates (bug_report, feature_request, incident, tech_debt, config)
live in `Efficient-Pty-Ltd/.github` and nowhere else. A repo-local
`.github/ISSUE_TEMPLATE/` silently OVERRIDES the org set — the dealer-portal
copy (5 files, all 5 hashes diverged from org) is scheduled for deletion in P2.
**Enforced:** harness-check greps for repo-local ISSUE_TEMPLATE dirs (P3).

## ISS-2 — Postmortems are GitHub issues
Prod incidents file with the incident template (see efficient-ops
`docs/incidents/README.md`), not as in-repo markdown.
**Enforced:** Review-only.
