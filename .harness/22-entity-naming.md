# ENTITY NAMING — the 7-layer table

P1 migration: efficient-ops `docs/NAMING.md` moves here VERBATIM and ops'
copy becomes a pointer. Until then, ops' file is the authority — open it
BEFORE adding or renaming any entity.

The seven layers each entity touches:
user label · FE entity_type · URL slug · FE files · BE Python class ·
permission codename · NumberingConfig key.

- EN-1 — New entities align all 7 layers; deliberate desyncs (e.g. Order /
  `sales_order`, Payment / `receipt`) are frozen — changing them breaks the
  API contract or live rows. **Review-only.**
- EN-2 — Permission codenames are Django's auto-generated ones; never
  invent one (the iOS app once gated on nonexistent `change_order`;
  it is `change_salesorder`). **Review-only.**
