# ERP WORKFLOW — business logic, status flows, numbering

> Canonical org-wide copy (migrated 2026-08-26 from efficient-ops
> `.claude/skills/erp-workflow/SKILL.md` — the newer of its two drifted
> twins; both are now pointers here). **Review-only** (the backend's
> transition guards enforce the flows at runtime).

# EFFICIENT — Business Workflow & Logic

## Company Overview
REGIS Design is a wheel distribution company. They design wheels, have them manufactured in China/Thailand, and sell to clients worldwide. The ERP manages the full lifecycle: design → manufacturing → quality control → shipping → invoicing.

## Entity Lifecycle & Status Flows

### Projects
**Statuses**: `initialized` → `in_progress` → `submitted` → `approved` | `rejected`

- **Initialized**: New project created by sales team with brand, designer, and inspiration images
- **In Progress**: Designer is working on the project
- **Submitted**: Proposal PDF uploaded and sent to client (auto-transitions when proposal is created)
- **Approved**: Client approved the design — requires Design Name, Design Code, and Approved Date. Creates a Design record.
- **Rejected**: Client rejected the proposal

**Side effects**:
- When a Proposal is created/linked → all linked projects with `initialized`/`in_progress` status change to `submitted`
- When a Proposal is deleted → linked projects with `submitted` status and no other proposals revert to `in_progress`
- When approved → `approved_by` is auto-set to the current user
- Approval creates a Design record (design_code, design_name, brand, project FK)

### Proposals
**Statuses**: `submitted` (default on create)

- Linked to one Brand and multiple Projects (M2M)
- Contains a PDF file uploaded by the sales team
- Auto-numbered: PR#10001, PR#10002, etc.
- Projects are approved individually from the Project detail page, not from the Proposal

### Designs
- Created automatically when a project is approved (design_code + design_name + brand + project FK + date)
- Can also be created manually
- Types: wheel, cap, badge, rivet, accessory
- Has a `date` field (approval date when created from project approval)

### Moulds
**Statuses**: `submitted` → `engineering` → `mould_production` → `safety_tests` → `production_ready` | `cancelled`

- **Submitted**: Mould request submitted
- **Engineering**: First DFM log created → auto-transitions to `engineering`
- **Mould Production**: Both 3D Model and Blueprint approved on DFM log → auto-transitions + sets DFM Completion date
- **Safety Tests**: Manual transition after moulds are produced
- **Production Ready**: First PO confirmed → auto-transitions (or manual)
- **Cancelled**: Mould cancelled

**Auto-code format**: `{model_digits}{suffix}/{diameter}{width_digits}` (normal) or `{model_digits}{suffix}/{diameter}P{profile}{direction}` (flowform)

### DFM Logs (Design for Manufacturing)
**Approval**: Two-track parallel approval:
- 3D Model: `draft` → `pending` → `approved`/`rejected`
- Blueprint: `draft` → `pending` → `approved`/`rejected`

**Side effects**:
- First DFM log for a mould → mould status changes to `engineering`
- Both tracks approved → mould status changes to `mould_production` + DFM Completion date set

### Sales Orders
**Statuses**: `draft` → `confirmed` → `pending_production` → `in_production` → `partial_shipped` → `shipped` → `completed` | `cancelled`

**Side effects**:
- Send Production → creates draft PO, SO moves to `pending_production`
- Any PO confirmed → SO promoted to `in_production` (if not already in production or beyond)
- Any PO moves to `in_production` → SO promoted to `in_production`
- All POs revert to `confirmed` → SO demoted to `pending_production`
- All POs cancelled → SO can revert to `draft`
- SO can re-send production if all previous POs are cancelled

### Purchase Orders
**Statuses**: `draft` → `confirmed` → `in_production` → `completed` | `cancelled`

**Transitions**:
- **Draft → Confirmed**: Requires exchange rate + 30D average alloy price
- **Confirmed → In Production**: Requires production start date + est. completion date ("Start Production" button)
- **In Production → Completed**: "Mark as Completed" button
- **In Production → Confirmed**: "Revert to Confirmed" only if no production progress reports exist
- **Confirmed → Draft**: "Revert to Draft"

**Unassigned POs** (no supplier): Show "Assign Purchase Order" button which splits by supplier

**Merge** (draft only, same supplier): Multiple draft POs to the same supplier can be merged into one (Purchase Orders list → select rows → Merge). Use case: a client with several warehouses places one SO per warehouse, each sent to production as its own draft PO; merging lets the factory manufacture them together. The merged PO keeps the chosen target's `po_number`, header, and primary `sales_order`; line items move onto it (each keeping its `sales_order_item` link) and the other POs are soft-deleted. The factory sees **one combined line per part number** (PO PDF + supplier portal + production progress), while internally each line still tracks back to its own sales order — so shipments/invoicing allocate per order via the existing fungible stock + reservation flow. Inverse of split-by-vendor.

**Side effects**:
- First PO confirmed for a mould → mould status changes to `production_ready`
- PO moves to `in_production` → **every SO it fulfils** promoted to `in_production` (a merged PO can fulfil several SOs — resolved from its line items, not just the primary `sales_order`)
- PO reverts to `confirmed`/`draft` → **each SO it fulfils** may demote to `pending_production` (only if no other active PO keeps that SO in production)
- Last active PO for an SO cancelled → that SO reverts to `confirmed`

### QC Reports (Quality Control)
**Statuses**: `draft` → `submitted`
- Linked to a Purchase Order
- Contains inspection items with pass/ng results for each check (wheel finish, hxpcd, cb, backpad, cap, badge, accessories, labels, package)
- Overall result auto-calculated: `ng` if any field is `ng`

### Production Progress
- Snapshot-in-time reports linked to a Purchase Order
- Each report contains items with production stage quantities: `casting`, `cnc`, `painting`, `packing`, `finished_goods`, `stock_qty`
- **Stock (FG)** = `stock_qty` from latest ProductionProgressItem
- **Coming** = `painting - finished_goods` (items in painting stage but not yet finished)
- First progress report auto-advances PO to `in_production`

### Goods Issue (Delivery Notes)
**Statuses**: `submitted` → `arranged` → `shipped` → `delivered` | `cancelled`
- Numbering: uses `shipment` entity type (e.g. PL#40001)
- Linked to Sales Orders and Warehouses

**Smart auto-fill on creation:**

| Selection | Auto-fills |
|-----------|-----------|
| **SO selected** | Customer (from SO), port of discharge, all SO line items loaded, warehouse auto-selected if only 1 MID produces the SO |
| **Customer selected** | Port of discharge, displays PNs with stock > 0 or coming > 0, filters SOs to customer's only, filters warehouses to MIDs producing for customer |
| **Warehouse selected** | Port of loading (from warehouse's supplier), filters displayed PNs to that supplier |

**Auto-create GRN on submit:**
- When delivery note is created with a warehouse selected:
  - Groups items by supplier (via PO data)
  - Creates one Goods Receipt Note per supplier → warehouse
  - Each GRN is linked back to the delivery note via `delivery_note` FK
  - Uses `goods_receipt` numbering (GR#)

### Goods Receipt (Goods Receipt Notes)
**Statuses**: `submitted` → `in_transit` → `received` | `cancelled` (`GoodsReceiptNote.STATUS_CHOICES`; NOT the Goods Issue states)
- Numbering: uses `goods_receipt` entity type (e.g. GR#10001)
- Linked to Purchase Orders and Warehouses
- Warehouse selection auto-sets the supplier (shipper) if the warehouse is linked to one
- `delivery_note` FK links back to the originating Goods Issue
- **Dropship mode**: When enabled, shows additional fields (delivery note, port of loading/discharge, forwarder, B/L, ETA)

### Warehouses
- Name, address, city, state, zip, country
- `is_supplier` flag — when true, can link to a `Supplier`
- Used in Goods Issue and Goods Receipt forms instead of direct supplier selection
- Warehouse filters in delivery note form are limited to MIDs producing for the selected customer

### Sales Claims (customers' warranty claims — model `SalesClaim`, numbered `WC#`)
**Statuses**: `draft` → `submitted` → `under_review` → `closed` (with `cancelled` as a terminal sideline; legacy `resolution`/`resolved` kept for historical rows only)
- Linked to shipments (or a free-text `shipment_reference` if no DN exists)
- Editable while in `draft` or `submitted`; locked once in `under_review`
- During `submitted`, each claim item must be mapped to a `purchase_order_item` (auto-suggested from the shipment's GRNs) OR flagged `manual_no_po`
- Per-item `return_required` + `return_quantity` flags drive RMA generation
- Media attachments for evidence

**On `submitted → under_review` the system auto-creates:**
- one `SupplierWarrantyClaim` (numbered `SWC#…`) per supplier (Phase 2 — REPLACES the immediate draft supplier credit that Phase 1 used to create at this step)
- one draft `Invoice` (`invoice_type='credit_note'`, numbered `CN#…`) for the client, lines pre-filled at SO unit_price × claim qty — this is the **client credit request**
- one `ReturnMerchandiseAuthorization` (RMA) per supplier whose items have `return_required=True`

The **supplier credit note** is no longer created at Start Review. It's created when the supplier agrees on a final amount inside their `SupplierWarrantyClaim` (see below).

**Approval** happens by editing each draft credit (final agreed amount may differ from the auto-fill) and clicking Post. Rejection happens by clicking Cancel on the draft credit — user can re-enter review later for a new round.

**`under_review → closed`** is gated on: every linked credit is `posted` or `cancelled` AND every linked RMA is `received` or `cancelled` AND every `SupplierWarrantyClaim` has reached a terminal state (`agreed`/`rejected`/`closed`/`cancelled`, NOT `submitted`/`acknowledged`).

**Cancel cascade** (`*→cancelled` from draft/submitted/under_review) auto-cancels any draft credits, submitted/in_transit RMAs, and supplier-claims still in `submitted`/`acknowledged`/`rejected`. Blocked if any credit has already been `posted`, any RMA already `received`, or any supplier-claim already `agreed`/`closed`.

### RMA (Return Merchandise Authorization)
**Statuses**: `submitted` → `in_transit` → `received` (`cancelled` terminal sideline)
- Created from a warranty claim's "Start Review" cascade — one per supplier
- One `RMAItem` per claim item that requires return
- Numbered `RMA#…`
- Shown inline within the warranty claim detail; no standalone list page yet

### Supplier Warranty Claims (Phase 2)
**Statuses**: `submitted` → `acknowledged` → `agreed` → `closed` (with `rejected` and `cancelled` as side branches; `rejected` → can be re-`submitted` after admin renegotiation)
- A claim REGIS sends TO a supplier — visible inside the **supplier-portal** at `/suppliers/warranty-claims`
- Auto-created (one per supplier) when a customer-side `SalesClaim` hits Under Review; OR created manually by admin for stock-discovered defects with no customer claim involvement
- Carries a `claimed_amount` (auto-summed from items at creation) and a nullable `agreed_amount` (set on the `agreed` transition)
- Numbered `SWC#…`

**Supplier actions** (in the supplier-portal): `Acknowledge` (= "received, investigating"), `Agree` (with a final agreed amount — may differ from claimed), `Reject` (with a reason — admin can re-submit).

**Admin actions** (in the admin-portal): full lifecycle parity including `force_agree` — an audited override (`[FORCE OVERRIDE]` prefix in the timeline) for when a supplier never responds.

**On the `agreed` transition the system auto-creates** a draft `PurchaseInvoice` (`invoice_type='credit_note'`, numbered `CN#…`) tied to BOTH the source customer `SalesClaim` AND this `SupplierWarrantyClaim`. The credit's total amount is overridden to `agreed_amount`; per-line prices keep PO `unit_price` so admin can still tweak the draft before posting.

### Sales Invoices (Client Invoices)
**Statuses**: `draft` → `posted`
- Generated from goods issue (shipments)
- Contains line items with part numbers, quantities, prices
- PDF generation available

### Purchase Invoices (model `PurchaseInvoice`)
**Statuses**: `draft` → `posted`
- Received from suppliers
- Contains line items with part numbers, quantities, prices
- Linked to Purchase Orders

### Payments (Client)
- Linked to client invoices
- Payment allocation to specific invoices

### Payments (supplier — model `Payment`)
- Payments to suppliers
- Linked to purchase invoices

## Numbering System
All entity numbers are auto-generated via `NumberingConfig` model:
- Each entity type has a prefix + starting number
- Examples: SO#35001, PO#26001, PR#10001, DF#12345, VP#90001

## Key Relationships
```
Brand → Projects → Proposals (M2M)
Brand → Designs → Moulds → DFM Logs
Brand → Designs → Wheel Finishes → Part Numbers
Part Numbers → Order Items (Sales)
Part Numbers → PO Items (Purchase)
Part Numbers → Shipment Items
Part Numbers → Invoice Items
Purchase Orders → QC Reports
Purchase Orders → Production Progress
Suppliers → Purchase Orders, QC Reports, Purchase Invoices, Payments
```

## Permission Model
- `ReadAnyWriteModelPerm`: Any authenticated user can read, model permissions required for writes
- Admin/superuser bypasses all permission checks
- Special permissions: `approve_dfm_model`, `approve_dfm_drawing`
- Permissions displayed in user group settings via `PERM_TREE` whitelist

## Delete Rules
Each entity has a `can_delete` field computed by the serializer. Entities can only be deleted when they have no dependent records:

| Entity | Deletable when... |
|--------|-------------------|
| Project | No designs, no proposals |
| Proposal | Always (reverts project status) |
| Mould | No part numbers |
| DFM Log | Always |
| Weight Log | Always |
| Sales Order | No POs, no invoices |
| Shipment | No invoices, no warranty claims |
| Invoice | No payment allocations |
| Sales Claim | Always |
| Client | No orders |
| Customer Price Sheet | No orders referencing it |
| Purchase Order | No QC reports, no purchase invoices |
| Production Progress | Always |
| QC Report | Always |
| Purchase Invoice | Status is draft |
| Supplier | No POs, no part numbers |
| Supplier Price Sheet | No POs referencing it |
| Part Number | No orders/POs/shipments/invoices (both sides) |
| Brand | No designs |
| Design | No wheel finishes, no part numbers, no moulds |
| Wheel Finish | No part numbers |
| Bank Account | No receipts, no supplier payments |
| Payment (Receipt) | Always (allocations cascade) |
| Vendor Payment | Always |
| User | No activity logs, not referenced as created_by/approved_by/designer/uploaded_by on any entity. Otherwise offer "Deactivate" instead. |
| User Group | No users assigned (`user_count == 0`) |

**Special delete side effects:**
- Deleting a Proposal → reverts linked projects from `submitted` to `in_progress` (if no other proposals)
- Deleting a Payment/Vendor Payment → allocations cascade-deleted automatically
- User cannot be deleted if referenced anywhere → offer "Deactivate" instead (sets `is_active=false`)

## Price Calculation
- **Customer prices**: Base price matrix (width × diameter) + finish surcharges + increments
- **Vendor costs**: Base cost matrix + alloy adjustment + VAT + exchange rate conversion
- Both use JSON fields for flexible matrix storage
