# CLI + MCP — naming and safety (skeleton; P1 fills from efficient-cli)

- CLIMCP-1 — CLI verbs mirror the API's resource names (`efficient
  <resource> <action>`); no invented vocabulary.
- CLIMCP-2 — Destructive actions (stock/GL transitions, high-blast-radius
  infra) are declared in backend `mcp_contract/manifest.py` and served at
  `/api/mcp-manifest/`; the CLI and MCP tools READ it, never declare their
  own. **Enforced:** resolver-walking tests fail the build on an undeclared
  destructive-looking route.
- CLIMCP-3 — MCP is split three ways: backend `mcp_contract` (truth), CLI
  stdio server, gated remote HTTP. New tools land in that order.
- CLIMCP-4 — The real action surface is the URL resolver, not grep — audit
  routes by walking the resolver.
