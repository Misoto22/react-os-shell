# ENTITY NAMING — the 7-layer table

> Canonical org-wide copy (migrated 2026-08-26 from efficient-ops
> `docs/NAMING.md`, which is now a pointer here). Open this BEFORE adding
> or renaming any entity.

- EN-1 — New entities align all 7 layers; the deliberate desyncs flagged
  below in **Stable identifiers** are frozen — changing them breaks the
  API contract or live DB rows. **Review-only.**
- EN-2 — Permission codenames are Django's auto-generated ones; never
  invent one (the iOS app once gated on nonexistent `change_order`; it is
  `change_salesorder`). **Review-only.**

---

How every entity in EFFICIENT is named across the seven layers it touches:

| Layer | Where it lives | Example |
|---|---|---|
| User label | UI text — sidebar, headings, buttons | "Sales Order" |
| FE entity_type | windowRegistry key, openEntity arg, EntityTimeline prop | `sales_order` |
| URL slug | Backend route + frontend route | `/sales-orders` |
| FE files | `*Form.tsx` / `*Detail.tsx` / `*List.tsx` | `SalesOrderForm.tsx` |
| BE Python class | Django model class in `models.py` | `SalesOrder` |
| DB permission codename | Django auto-generated (view/add/change/delete) | `view_salesorder` |
| NumberingConfig key | DB row in `system.NumberingConfig` | `sales_order` |

For most entities all seven layers are aligned. A handful are deliberately desynced because changing them would break either the API contract or live DB rows — those are flagged below in **Stable identifiers**.

---

## Customer side

| User label | entity_type | URL | FE files | Python class | NumberingConfig key |
|---|---|---|---|---|---|
| Customer | `customer` | `/customers` | `CustomerForm/Detail/List` | `Customer` | — |
| Sales Order | `sales_order` | `/sales-orders` | `SalesOrderForm/Detail/List` | `SalesOrder` | `sales_order` (`SO#`) |
| Sales Invoice | `sales_invoice` | `/sales-invoices` | `SalesInvoiceForm/Detail` | `SalesInvoice` | _`invoice`_ (`CI#`) |
| Goods Issue | `goods_issue` | `/goods-issues` | `GoodsIssueForm/Detail/List` | `GoodsIssue` | _`shipment`_ (`PL#`) |
| Receipt | `receipt` | `/receipts` | `ReceiptForm/Detail/List` | `Receipt` | `receipt` (`RP#`) |
| Sales Claim | `sales_claim` | `/sales-claims` | `SalesClaimForm/Detail/List` | `SalesClaim` | _`warranty_claim`_ (`WC#`) |
| RMA | `rma` | `/rmas` (inline only — no standalone list yet) | inline within `SalesClaimDetail` | `ReturnMerchandiseAuthorization` | `rma` (`RMA#`) |
| Supplier Warranty Claim | `supplier_warranty_claim` | `/supplier-warranty-claims` (admin) / `/suppliers/warranty-claims` (supplier-portal) | `SupplierWarrantyClaimList/Detail` | `SupplierWarrantyClaim` | `supplier_warranty_claim` (`SWC#`) |
| Price Sheet | `price_sheet` | `/price-sheets` | `PriceSheetForm/Detail/List` | `CustomerPriceSheet` | `client_price_sheet` (`CP#`) |

## Supplier side

| User label | entity_type | URL | FE files | Python class | NumberingConfig key |
|---|---|---|---|---|---|
| Supplier | `supplier` | `/suppliers` | `SupplierForm/Detail/List` | `Supplier` | — |
| Purchase Order | `purchase_order` | `/purchase-orders` | `PurchaseOrderForm/Detail/List` | `PurchaseOrder` | `purchase_order` (`PO#`) |
| Goods Receipt | `goods_receipt` | `/goods-receipts` | `GoodsReceiptForm/Detail/List` | `GoodsReceiptNote` | `goods_receipt` (`GR#`) |
| Purchase Invoice | `purchase_invoice` | `/purchase-invoices` | `PurchaseInvoiceForm/Detail/List` | `PurchaseInvoice` | _`supplier_invoice`_ (`VI#`) |
| Payment | `payment` | `/payments` | `PaymentForm/Detail/List` | `Payment` | _`supplier_payment`_ (`MP#`) |
| Production Progress | `production_progress` | `/production-progress` | `ProductionProgressForm/Detail/List` | `ProductionProgress` | `production_progress` (`PP#`) |
| QC Report | `qc_report` | `/qc-reports` | `QCReportForm/Detail/List` | `QCReport` | `qc_report` (`QC#`) |
| Supplier Price Sheet | `supplier_price_sheet` | `/supplier-price-sheets` | `SupplierPriceSheetForm/Detail/List` | `SupplierPriceSheet` | `supplier_price_sheet` (`VP#`) |

## Products & Engineering

| User label | entity_type | URL | Python class | NumberingConfig key |
|---|---|---|---|---|
| Part Number | `part_number` | `/part-numbers` | `PartNumber` | — |
| Design | `design` | `/designs` | `Design` | — |
| Brand | `brand` | `/brands` | `Brand` | — |
| Wheel Finish | `wheel_finish` | `/wheel-finishes` | `WheelFinish` | — |
| Mould | `mould` | `/moulds` | `Mould` | — |
| DFM Log | `dfm_log` | `/dfm-logs` | `DfmLog` | `dfm_log` (`DF#`) |
| Weight Log | `weight_log` | `/weight-logs` | `WeightLog` | `weight_log` (`WL#`) |
| Project | `project` | `/projects` | `Project` | — |
| Proposal | `proposal` | `/proposals` | `Proposal` | `proposal` (`PR#`) |

## Inventory & System

| User label | entity_type | URL | Python class |
|---|---|---|---|
| Warehouse | `warehouse` | `/warehouses` | `Warehouse` |
| Stock On Hand | `stock` | `/stock-on-hand` | `StockOnHand` |
| Bank Account | `bank_account` | `/bank-accounts` | `BankAccount` |

## Payroll (HR)

| User label | entity_type | URL | FE files | Python class | NumberingConfig key |
|---|---|---|---|---|---|
| Payroll | `payroll` | `/payroll` | `PayrollForm/Detail/List` | `Payroll` | `payroll` (`PA#`) |
| Payslip | `payslip` | `/my-payslips` | `MyPayslips` (employee view) | `PayrollLine` (per-employee projection) | — |
| Payroll Settings | — | `/settings/payroll` | `PayrollSettings` | `PayrollComponent`, `PayrollPaymentGroup`, `PayrollSetting` | — |

A payslip is one employee's line within a run (`PayrollLine`), surfaced read-only and scoped to the requesting user — it is not a separate stored entity. Child rows `PayrollLine` / `PayrollLineAmount` are parent-managed (hidden from the permission tree). Payroll config (components, payment groups, the per-company setting) is edited on the Payroll Settings screen, not as standalone numbered entities.

---

## Stable identifiers (deliberately desynced)

_Italic_ entries above represent surfaces that were **not** renamed when the user-facing label changed, because doing so would break either the API contract or live DB data.

### Python class names

The user-facing label moved on but the model class kept its name.

| User label | Python class |
|---|---|
| Goods Receipt | `GoodsReceiptNote` |

**Major renames already shipped** — listed here so the historical context isn't lost:
- `Manufacturer` → `Supplier` (db-schema-overhaul, 2026-05)
- `VendorInvoice` / `VendorInvoiceItem` → `SupplierInvoice` / `SupplierInvoiceItem`
- `VendorPayment` → `SupplierPayment`
- `ManufacturerPriceSheet` → `SupplierPriceSheet`
- `VendorType` → `SupplierType`
- `ShipmentItem` → `GoodsIssueItem` (2026-04-30)
- `MouldLog` → `DfmLog` (2026-04-30)
- **Pass 17** (`efficient/entity_map.py` header): `Client` → `Customer`, `Order` → `SalesOrder`, `Invoice` → `SalesInvoice`, `SupplierInvoice` → `PurchaseInvoice` (and their `*Item` children); customer receipts are `Receipt` and supplier payments are `Payment` (both in `bank/models.py`)
- `WarrantyClaim` / `WarrantyClaimItem` / `WarrantyClaimMedia` → `SalesClaim` / `SalesClaimItem` / `SalesClaimMedia` (2026-05-27, Phase 2 of "Sales Claims & Returns" refactor — broadened to cover Standard Returns alongside Warranty Claims; NumberingConfig key kept as `warranty_claim`/`WC#` for sequence continuity)

**App renames (folder + `app_label` + table prefix):**
- `samples` app → `rnd` (2026-05-29) — folder `backend/samples/`→`backend/rnd/`, tables `samples_*`→`rnd_*`, API `/api/samples/`→`/api/rnd/`, perms `samples.*`→`rnd.*`. Model class names and `entity_type` literals (`mould`, `dfm_log`, `sample_order`, …) are unchanged.
- `notifications` app → `activity` (2026-05-29) — folder `backend/notifications/`→`backend/activity/`, tables `notifications_*`→`activity_*`, API `/api/notifications/`→`/api/activity/`, perms `notifications.*`→`activity.*`, auth class `notifications.auth`→`activity.auth` (settings). Model class names, `entity_type` literals, and the `user.notifications` reverse accessor (`related_name='notifications'`) are unchanged.

Both renames are reconciled automatically on deploy by the `migrate` override (`accounts/app_renames.py` `RENAMES` list + `accounts/management/commands/migrate.py`) — see `docs/DEPLOY.md`. Fresh DBs replay to the new prefix natively; existing DBs are pivoted in place before `migrate`.

### NumberingConfig DB keys

Live DB rows in `system.NumberingConfig` (relocated from `accounts` by `system/0008_relocate_config_models_from_accounts.py`; table `system_numberingconfig`) keyed by `entity_type`. Renaming requires a coordinated data migration in lockstep with FE / serializer code changes. After the supplier rename these are aligned with the entity_type literals.

| Entity | NumberingConfig.entity_type | Prefix |
|---|---|---|
| Goods Issue | `shipment` | `PL#` |
| Sales Invoice | `invoice` | `CI#` |
| Purchase Invoice | `supplier_invoice` | `VI#` |
| Payment (supplier) | `supplier_payment` | `MP#` |
| Supplier Price Sheet | `supplier_price_sheet` | `VP#` |
| Receipt (customer) | `receipt` | `RP#` |
| Sales Claim | `warranty_claim` | `WC#` |
| Price Sheet (customer) | `client_price_sheet` | `CP#` |

The desynced keys are `shipment`, `invoice`, `warranty_claim`, `client_price_sheet`, `supplier_invoice`, and `supplier_payment` — each predates a later entity rename (`GoodsIssue`, `SalesInvoice`, `SalesClaim`, `CustomerPriceSheet`, `PurchaseInvoice`, `Payment` respectively) and is kept so the live numbering sequences continue unbroken. ALL of them are frozen (EN-1): never "align" one to its entity_type.

---

## Naming conventions for new entities

When introducing a new entity, align all seven layers from day one:

1. **User label**: pick a short noun phrase the user would say aloud. E.g. "Receipt", "Goods Issue".
2. **entity_type**: snake_case version of the user label. E.g. `receipt`, `goods_issue`.
3. **URL slug**: kebab-case plural of the user label. E.g. `/receipts`, `/goods-issues`.
4. **FE files**: PascalCase singular + `Form.tsx` / `Detail.tsx` / `List.tsx`, in `pages/<plural-slug>/`. E.g. `ReceiptForm.tsx` in `pages/receipts/`.
5. **Python class**: PascalCase singular. Match the user label spelling. E.g. `Receipt`.
6. **DB permission**: auto-derived from class name. Don't override.
7. **NumberingConfig key** (only if the entity has user-visible numbers like `PL#1234`): match the entity_type exactly. Don't reuse a legacy key.

If you must rename later, use the renaming recipe in the rename commits from 2026-04-30 (commits `d71929d` through `af7f349`) — every rename pairs FE + BE updates with a `notifications` backfill migration that rewrites `InAppNotification.entity_type` and `EntityMessage.entity_type`. Look at `backend/notifications/migrations/0010` through `0015` for the template.

---

## Adjacent contracts (also worth knowing)

These aren't entity names but they consistently come up in the same conversations:

- **API mounts**: project-level `urls.py` routes API apps under `/api/<area>/`. E.g. `/api/invoicing/`, `/api/products/`.
- **TanStack query keys**: typically the URL slug as a string array, e.g. `['sales-orders']`, `['goods-receipts']`. These are internal cache identifiers — they don't follow the entity_type literal and don't need to. Cache invalidation works as long as the same string is used at every reader/writer.
- **Window registry keys** (`admin-portal/src/components/windowRegistry.tsx`): match `entity_type` for entity windows; match URL path (with leading slash) for page windows.
- **`MODEL_ENTITY_MAP` in `backend/efficient/signals.py`**: maps Python class name → entity_type literal. The single source of truth that signals use to broadcast WebSocket updates and write timeline rows on every save/delete.
