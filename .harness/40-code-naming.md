# CODE NAMING — identifiers per language (skeleton)

All identifiers, comments, and commit messages in English.

- Python: snake_case; Django apps single-responsibility under repo root;
  models map legacy tables with `managed=False` where applicable.
- TypeScript/React: PascalCase components (`*Form.tsx`, `*Detail.tsx`,
  `*List.tsx` per entity), camelCase functions, SCREAMING_SNAKE module
  constants; JSON fields snake_case on the wire (backend convention wins;
  transform at the serialization boundary).
- Rust: `{Domain}Service<R: {Domain}Repository>`, `SqlServer{Domain}Repo`
  style generics; one concept per file; `mod.rs` exports the interface.
- Swift: stores per feature (`…Store`), Kit-hosted logic (SwiftPM) vs
  app-target UI.
- SQL/Postgres: snake_case; partial unique constraints on soft-delete
  models (`condition=Q(deleted_at__isnull=True)`).

P1: extend with the audit-base rules (TimestampedModel / AuditedModel /
SoftDeleteModel) from efficient-ops CLAUDE.md.

All of the above: **Review-only** (stack linters catch casing where
configured; the conventions themselves are review discipline).
