# UI RULES — windows, lists, forms, details, visual vocabulary

> Canonical org-wide copy. Merged 2026-08-26 from TWO sources: the
> portal-ui skill (Victor Mau, grounded in the 2026-08-13/14/16 audits —
> newer, wins every conflict) and efficient-ops' ui-rules skill (2026-06,
> the window-behaviour/base-pattern half). Both sources are now pointers
> here. Read before building or modifying ANY portal window or component.
> **Review-only** except where a named test is cited inline
> (`submitSkinGuard.test.ts`, `test_reporting.py` GRID_DOMAINS ratchet).
> The full audit census (adoption counts, file:line references, known
> deviations) lives in the portal-ui plugin:
> <https://github.com/Efficient-Pty-Ltd/claude-plugins> —
> `plugins/portal-ui/skills/portal-ui/ui-audit-2026-08-14.md`.

## Scope


The **admin, customer and supplier** portals use `ModalActions` (the customer
and supplier portals were clean as of 2026-08-13). The **dealer portal and POS**
do not use it at all — they have their own layout, so these footer rules do not
apply there, though Bug 1 and Bug 2 do.

The confirm rule (and Bug 4) applies wherever `react-os-shell` is a dependency
— admin, customer, supplier, dealer. **POS has no shell dependency yet**, so its
one `window.confirm` (`UnresolvedSaleGate`) is known debt for the UI-kit
adoption epic, not something to hand-roll a dialog for today.



---

# Part I — Window behaviour (the shell contract)

## Window Rules (All Modals)

All windows (create, edit, detail/view) use the `<Modal>` component which provides a unified draggable, resizable, minimizable window experience.

### Window shell
- **Positioning**: Centered in main content area (sidebar-aware) with 40px padding
- **Sidebar detection**: Reads sidebar width from DOM (w-72 open, w-14 collapsed)
- **Auto-resize**: Syncs when sidebar toggles or browser resizes (while maximized)
- **Size prop**: Controls default width (`sm`=384, `md`=512, `lg`=672, `xl`=896, `2xl`=1152)
- ALL modals SHOULD be `size="2xl"` unless content is intentionally narrow

### Window controls (header, right side)
1. **K Prev / J Next** — shown when `onNext`/`onPrev` props are set (detail modals with list nav)
2. **─ Minimize** — collapses to tab at bottom
3. **❐ / ⤢ Maximize/Reset** — toggles between maximized and windowed
4. **ESC badge** — visual indicator
5. **× Close** — closes/dismisses with dirty guard

### Interaction rules
| Action | Result |
|--------|--------|
| Click backdrop (outside window) | **Minimize** — saves position, shows tab at bottom |
| Press ESC | **Close** — dismisses (with dirty guard if unsaved changes) |
| Click × button | **Close** — dismisses (with dirty guard) |
| Click ─ button | **Minimize** — saves position, shows tab |
| Click ❐/⤢ button | Toggle maximize/windowed |
| Drag header | Move window (exits maximized mode) |
| Drag bottom-right corner | Resize window (min 384×300) |
| Cmd+Enter / Ctrl+Enter | Submit form |
| Cmd+S / Ctrl+S | Save and stay (dispatches `modal-save` event) |
| Alt+Shift+D | Duplicate / Save as new (dispatches `modal-duplicate` event) |
| J / K keys | Navigate to next/prev item (detail modals only, skipped in inputs) |

### Minimize behavior
- Saves exact position, size, and maximized state
- Shows a tab at bottom-center with window title + restore + close buttons
- Restoring returns to saved position/size if it still fits viewport
- If viewport shrank, resets to maximized
- Note: Modal minimize is local to the page (unlike DraggableWindow which persists globally)

### Discard Warning
- All create/edit modals MUST have `dirty="auto"` prop on `<Modal>`
- This auto-detects form changes and warns before closing (ESC or ×)
- Backdrop click minimizes WITHOUT dirty guard (since it preserves state)
- Detail/view-only modals do NOT need `dirty="auto"`

### No Cancel/Close Buttons
- Do NOT add Cancel or Close buttons to modals
- ESC key and × button handle closing (via Modal component)
- Backdrop click minimizes (not closes)
- Exception: inline "Cancel editing" within a detail view that has edit mode

### Title
- Show entity number + status badge in modal title
- Header is a drag handle — title area is draggable
- Example: `<span className="flex items-center gap-2">PO#26004 <StatusBadge status={po.status} /></span>`

### Size
- Modals default to `size="2xl"` (detail, create, edit) — a narrower size only when content is intentionally narrow (see Size above)

### Create/Edit Form Rules
- **No Cancel button**: Users close with ESC or X (top-right)
- **Entity number editable**: In edit mode, entity number/code field should be editable
- **Title naming convention**:
  - Transactional: "New ..." (New Project, New Sales Order, New Sales Invoice, New Proposal)
  - Master data: "Add ..." (Add Brand, Add Part Number, Add Supplier, Add Bank Account)
  - R&D creation: "Create Design"
  - Edit mode: "Edit ..." (Edit Project, Edit Sales Order, etc.)

### Form Footer Layout
The Modal footer bar renders in this order from left to right:
1. **Destructive actions** (far left) — Cancel Order, Delete, etc. via `<ModalActions position="left">`
2. **Footer text** (after destructive actions) — Qty totals, entity info, via Modal `footer` prop
3. **Primary actions** (far right) — Submit, Update, Confirm, PDF, etc. via `<ModalActions>`

**Create mode:**
```
                                              [Submit (accent btn with ⌘↵)]
```
**Edit mode:**
```
[Delete (red text)]  footer text...          [Save as New (blue text)]  [Update (accent btn with ⌘↵)]
```

- **Submit/Update button**: Accent-colored (matches active theme — blue default, pink/emerald/grey/etc.), RIGHT-aligned, with ⌘↵ hotkey badge
- **Save as New**: Blue text link, to the LEFT of submit button (edit mode only)
- **Delete/Cancel**: Red text or red ghost button, FAR LEFT (edit mode only, only when `can_delete` is true)

```tsx
import { CMD_ENTER, ALT_SHIFT_D } from '../../components/Kbd';
// Edit mode footer
<div className="flex items-center justify-between pt-4 border-t border-gray-200 shrink-0">
  <div>
    {isEdit && item?.can_delete && (
      <button type="button" onClick={handleDelete}
        className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
    )}
  </div>
  <div className="flex items-center gap-3">
    {isEdit && (
      <button type="button" onClick={handleSaveAsNew}
        className="text-sm font-medium text-blue-600 hover:text-blue-800">Save as New <kbd className="rounded border border-blue-300/50 bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-400">{ALT_SHIFT_D}</kbd></button>
    )}
    <button type="submit" disabled={isPending}
      className="btn-submit inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50">
      {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
      <kbd className="kbd-submit rounded border px-1.5 py-0.5 text-[10px] font-medium">{CMD_ENTER}</kbd>
    </button>
  </div>
</div>
```


### Detail Popup Requirements (ALL 25 pages)
Every list page that opens a detail popup MUST follow these rules:
1. **Shared component**: Detail popup must be a component in `src/components/` (not inline in the page file)
2. **Modal size**: `size="2xl"` unless intentionally narrow
3. **Title**: Entity number/code + StatusBadge (if entity has status) + Edit button
4. **Edit button in title**: Outline style, next to status badge
   ```tsx
   import { ALT_SHIFT_E } from '../../components/Kbd';
   <button onClick={...} className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 px-2.5 py-1 text-xs font-medium rounded-md hover:bg-gray-50 ml-1">
     Edit <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[9px] text-gray-400">{ALT_SHIFT_E}</kbd>
   </button>
   ```
5. **Edit button visibility**: Hidden when entity is not editable (e.g., posted invoices) or when already in edit mode
6. **No Edit button in popup body**: Never put Edit at the bottom or in the content area


## Delete gating — `can_delete` on the serializer
Every entity serializer MUST have a `can_delete` SerializerMethodField. Delete is only offered when:
- **Project**: No designs, no proposals
- **Proposal**: Always deletable (reverts project status on delete)
- **Mould**: No part numbers
- **DFM Log**: Always deletable
- **Weight Log**: Always deletable
- **Sales Order**: No POs, no invoices
- **Goods Issue**: No invoices, no sales claims
- **Sales Invoice**: No receipt allocations
- **Sales Claim**: Always deletable
- **Customer**: No orders
- **Customer Price Sheet**: No orders referencing it
- **Purchase Order**: No QC reports, no purchase invoices
- **Production Progress**: Always deletable
- **QC Report**: Always deletable
- **Purchase Invoice**: Status is draft
- **Supplier**: No POs, no part numbers
- **Supplier Price Sheet**: No POs referencing it
- **Part Number**: No orders/POs/shipments/invoices (client + vendor side)
- **Brand**: No designs
- **Design**: No wheel finishes, no part numbers, no moulds
- **Wheel Finish**: No part numbers
- **Bank Account**: No receipts, no supplier payments
- **Receipt (customer)**: Always deletable (allocations cascade)
- **Payment (supplier)**: Always deletable


---

# Part II — The audited window conventions (2026-08 audits)

## Footer layout — primary RIGHT, everything else LEFT

`ModalActions` (from `react-os-shell`) portals into the window footer wherever
it sits in the tree. Two groups, and the split is not optional:

```tsx
{/* document / secondary actions */}
<ModalActions position="left">
  <PdfActionButton … />
</ModalActions>

{/* the ONE primary — a bare ModalActions is the right-hand slot */}
{(entity.can_submit || entity.can_approve) && (
  <ModalActions>
    {entity.can_submit && <button className="…bg-blue-600…">Submit for approval</button>}
    {entity.can_approve && <button className="…bg-green-600…">Approve &amp; Book</button>}
  </ModalActions>
)}
```

- **Exactly one primary** may occupy the right slot. When two could render,
  prove they are mutually exclusive (`can_submit` / `can_approve` are gated on
  opposite statuses) or pick one.
- Reference implementations: `PaymentDetail`, `AccountTransferDetail`,
  `ReceiptDetail`.
- ⌘⏎ picks the default button via
  `button[type="submit"], button[data-submit], button.bg-green-600, button.bg-blue-600`
  (`react-os-shell/src/shell/Modal.tsx`) — first match in DOM order. Add
  `data-submit` when the primary is not one of those colours.
- A form whose right slot is already taken by `Update` may keep a second
  primary on the left (`PaymentForm`'s Mark Paid). That is the one exception.


## Every list window gets a sidebar

Every entity list window renders inside the shell's `SidebarLayout` (Victor
Mau's call, 2026-08-14). ~93 admin-portal windows already comply (customer and
supplier too — 19/18 files); assume a NEW list or an old straggler is missing
it. **Report windows (`src/pages/reports/`) are exempt from the sidebar** —
all 51 keep their own filter-bar layout by design — but NOT from the
`EntityList` rule in the next section.

The anatomy — reference: `ReceiptList`; import the pieces from
`src/components/SidebarNav`, which re-exports the shell's `SidebarNavItem` /
`SidebarGroupLabel` alongside the count helpers:

```tsx
<SidebarLayout
  sidebarTop={<SidebarActionButton hotkey={ALT_SHIFT_N} onClick={handleNew}>Record Receipt</SidebarActionButton>}
  sidebar={
    <nav className="px-2 py-3">
      <SidebarGroupLabel>Status</SidebarGroupLabel>
      <SidebarNavItem label="All" count={bucketTotal(statusCounts, STATUS_BUCKETS, { excludeCancelled: true })}
        active={!filterStatus} onClick={() => setFilterStatus('')} />
      {STATUS_BUCKETS.map((s) => (
        <SidebarNavItem key={s.value} label={s.label} count={statusCounts?.[s.value]}
          active={filterStatus === s.value} onClick={() => setFilterStatus(s.value)} />
      ))}
    </nav>
  }
  sidebarBottom={<CsvActionButton … />}
  storageKey="receipts.sidebarWidth" defaultWidth={224} maxWidth={320}
  sidebarClassName="border-r border-gray-200 bg-gray-50"
>
  {/* toolbar + table */}
</SidebarLayout>
```

- **`sidebarTop` = the primary create action** — a `SidebarActionButton` wired
  to the SAME handler as `useNewHotkey`, with `hotkey={ALT_SHIFT_N}` so the
  hint renders. Secondary actions take `variant="secondary"`.
- **`sidebar` = the filter nav** — `SidebarGroupLabel` + `SidebarNavItem`
  buckets, **every one of them carrying its row count** (Victor Mau's call,
  2026-08-16 — the Campaigns sidebar shipped countless and that is the defect,
  not a style choice). A bucket without a `count` makes the operator click it
  to find out whether anything is in there. See the next subsection for the
  wiring.
- **`sidebarBottom` = export** (`CsvActionButton`), pinned flush to the bottom.
- **Persist the width**: `storageKey="<window>.sidebarWidth"`,
  `defaultWidth={224}`, `maxWidth={320}`,
  `sidebarClassName="border-r border-gray-200 bg-gray-50"`.
- Known stragglers as of 2026-08-14: `NotificationList`, `MyPayslips`,
  `CertificationTests`, `DealerNotifications` (registered windows), plus
  embedded list surfaces (`WhatsAppNumbers`, the marketplace hub tabs) where
  the PARENT window's layout owns the decision — check the hub before adding
  per-tab sidebars.

### Every status bucket shows its qty — and the backend counts it

The pill is not decoration; it is what makes the sidebar a summary rather than
five buttons. Wiring, both halves:

```tsx
// portal — the SAME params object the rows use
const statusCounts = useStatusCounts('mailing-campaigns', '/newsletter/campaigns/',
                                     campaignParams, ['no_page']);
<SidebarNavItem label="Draft" count={statusCounts?.['draft']} … />
```

```python
# backend — the endpoint the hook calls
class MailingCampaignViewSet(StatusCountsMixin, viewsets.ModelViewSet):
```

- **`useStatusCounts(keyPrefix, endpoint, params, omit?)`** (from
  `src/components/SidebarNav`) fetches `GET <endpoint>status-counts/`, keyed
  under the list's OWN query-key prefix so the invalidations the window
  already fires on create/edit refresh the pills too. `bucketTotal(counts,
  BUCKETS, { excludeCancelled })` feeds the All row. `status`,
  `status_exclude`, `ordering` and `page` are stripped for you; pass a
  list-shape param like `no_page` in `omit` so it doesn't fragment the cache
  key.
- **Pill-less is only ever "loading", "zero" or "no endpoint".** The shell's
  `SidebarNavItem` hides a `count` of 0 by design, and a 404 returns
  `undefined` without retrying. Don't special-case any of the three — but a
  bucket that is permanently pill-less because you never wired the hook is the
  bug this rule exists for.
- **🚨 The counts must line up with the rows the bucket click shows.** The
  mixin runs the ViewSet's whole filter pipeline (filterset, search) before
  aggregating, so anything the list filters SERVER-side is already reflected.
  A filter the page applies CLIENT-side is not — the pills then tally rows the
  list refuses to show. Move that filter onto the endpoint instead: the
  Campaigns website filter became `?site=` / `?site_isnull=true` on
  `MailingCampaignFilter` for exactly this reason, and `products/tests.py`
  regression-guards the same agreement for the DFM log's `latest_only`.
- **🚨 A ViewSet whose class queryset carries annotations needs a
  `status_counts` branch in `get_queryset`.** An annotation declared before
  `.values()` is added to the values output and therefore to the GROUP BY, so
  the aggregation splits into one group per row and **every pill reads 1**.
  Return the bare queryset for the action (`MailingCampaignViewSet`,
  `InvoiceViewSet` — `sales/views.py` scopes its `total_qty` annotate to the
  `list` action for the same reason). Nothing type-checks this; a test that
  creates a campaign with several `sends` rows and asserts the bucket is still
  1 does.
- `status_counts_field` overrides what the buckets count when the sidebar isn't
  on a lifecycle `status` — `is_active`, a type/category field, or an FK (keys
  come back as the FK's id; booleans as `'true'`/`'false'`).
  `remap_status_counts` folds a bucket the UI no longer surfaces into its
  replacement.

Two sidebars can't use the mixin at all, and both alternatives are legitimate
— reach for them only when the shape genuinely doesn't fit:

- **Buckets that are PREDICATES, not values of one field** get their own
  action. The talent database's Everyone / Talent pool / Not in play is
  `GET /recruitment/people/view-counts/` → `{all, pooled, available}`, built
  on `self.filter_queryset(self.get_queryset())` so search and tag still
  narrow it. **Share the predicate with the filter that implements the same
  view** — `PersonFilter.filter_available` and the action both read one
  module-level `ENGAGED_Q`; two copies drift, and the symptom is a pill
  contradicting its own rows. `distinct()` each count when the predicate or
  the search joins a to-many.
- **A window that already fetches every row counts them client-side.**
  `EmployeeList` pulls the whole roster (`no_page=true`) and filters in a
  memo, so a round trip would only re-ask what it holds. Split the filtering
  in two: a `scoped` memo for everything EXCEPT the bucket (search, type),
  which the pills tally, then the bucket filter on top for the rows. Getting
  that order wrong makes the active bucket's pill equal the row count and
  every other pill go blank.
- Don't reach for either when a plain `status` field would do, and don't build
  a second aggregate next to one that exists — but a heavier endpoint is not
  automatically reusable: the abandoned-cart pills take `StatusCountsMixin`
  rather than `summary/`'s `counts`, because reading four numbers out of
  `summary` drags the funnel scans and a per-currency revenue join over
  `SalesOrderItem` along on every keystroke.

All admin sidebars carried counts as of 2026-08-16 (`UserProfile` and
`ServerStatus` use `SidebarNavItem` for a settings/health nav, not status
buckets — exempt; customer, supplier and dealer were clean already). A new
list window is where the next gap comes from.


## The table is the shell's `EntityList` — tick-boxes + a right-click menu, always

Every list's rows render through the shell's `EntityList` (Victor Mau's call,
2026-08-14) — the canonical pageless data grid. Admin imports it via the thin
local re-export `src/components/EntityList` (`export { EntityList as default }
from 'react-os-shell'`); the customer and supplier portals consume the same
implementation. **This rule DOES cover report tables** — none of the 51
`src/pages/reports/` pages complied when the rule was set on 2026-08-14
(Sales by Customer's plain `<table>`, no tick-boxes, no context menu, was
the reported defect). **All 51 were converted the same day** (ap #1582,
#1584, #1587, #1588, #1590), so a report now inherits the grid from
`ReportGrid` — see the reports subsection below.

- **Tick-boxes are built in and non-optional** — `selected` / `setSelected`
  (`useState<Set<string | number>>()`) are REQUIRED props and bring the
  checkbox column with them. Don't hand-roll a `<table>` or use bare
  `ResizableTable` to dodge the wiring.
- **The right-click menu only exists if you feed it.** With neither
  `exportEndpoint` nor `contextActions` set, `EntityList` renders NO context
  menu — that bare state is banned. Always pass at least
  `exportEndpoint="<base>/export_csv/"` + `exportFilename` (built-in "Export
  selected to CSV" for the ticked rows, honouring visible/ordered columns),
  and add `contextActions={(items) => [...]}` for domain bulk actions where
  they exist. Reference: `PurchaseOrderList`, `GoodsReceiptList`,
  `StockTakeList`, `GoodsIssueList`.
- Wire `isError` + `onRetry` from `useInfiniteScroll` so a failed fetch reads
  as an error with a retry, not "nothing here".
### Reports get the grid through `ReportGrid`, never `EntityList` directly

A report page does NOT wire `EntityList` itself — it renders
`src/components/reports/ReportGrid`, which adapts the report layer's one
column spec (`ReportColumn`) to the grid so the screen, the column picker
and both exports keep reading the same declaration. The page supplies
`columns` / `rows` / `rowKey` / `ctx` (the `ReportShell` render-prop
context, which carries `tableId`, the filter-baked `exportEndpoint` and
`onDrill`) plus `selected` / `setSelected` and a `footerLabel`; pass
`grid` on `ReportShell` so it drops its bordered scroll wrapper — the grid
scrolls itself, and nesting the two double-scrolls.

What `ReportGrid` decides for you, so don't re-solve it per page:

- **Row identity is the server-stamped `row_id`**, with the page's `rowKey`
  only as the fallback. The backend `Report.row_id` descriptor derives it
  (`row_id_from(*keys)` over the report's GROUPING keys) and `?ids=` filters
  the CSV export to the ticked rows. The derivation lives on the server
  ONLY — the portal reads `row_id` back rather than rebuilding the
  composite, so the two sides cannot drift. A new report in any domain must
  declare a `row_id`; `efficient/tests/test_reporting.py`'s `GRID_DOMAINS`
  ratchet fails the build otherwise.
- **Sorting is client-side and opt-out.** Rows arrive pre-ordered by the
  report's own logic (aged receivables oldest-first), so there is no sort
  until a header is clicked; blanks sink last in both directions. Pass
  `sortable={false}` when the ORDER *is* the data — BOM Explosion is a
  flattened tree whose parent-child adjacency a column sort destroys.
- **Totals become the footer line** via `footerExtra`, not a table row, and
  resolve through the shared `computeTotals` — an explicit backend total
  wins over the client-side sum, because the backend returns `null` exactly
  when summing would be wrong (mixed currencies).
- `onRowClick` defaults to the row's first drillable column's target and
  no-ops on a row with no drill; pass it explicitly only when the row's
  primary entity is not its first drill.
- `indentOf` carries a tree indent on the first column.

`ReportTable` (the old plain-table renderer) was deleted with the
conversion — **grouped/sectioned payloads went with it**, so a future
grouped report has to rebuild that shape inside `ReportGrid`.


## List toolbar — search, then filters, dates last

Body shape (72 exact matches): `<div className="flex flex-col h-full p-4">` →
toolbar row `<div className="pb-3 shrink-0 flex items-center gap-3 flex-wrap">`
→ `<EntityList …>`. Within the row: search input first
(`border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm w-64 focus:border-blue-500 focus:ring-blue-500`,
placeholder `"Search..."`), then FK `SearchableSelect`s, then **`FilterBar` +
`useFilters`** (Victor Mau's call, 2026-08-14 — the ~65 hand-rolled `<select>`
rows are legacy, convert when touched; `FilterBar` owns its own Clear button),
then `DateRangePicker` last (wired to `…_date_from`/`…_date_to`). Status
buckets belong in the SIDEBAR, never the toolbar.


## Active is a toggle, never a checkbox

Every Active / `is_active` control in a portal form renders as the shell's
`Switch` (Victor Mau's call, 2026-08-14) — imported from `react-os-shell`,
`size="sm"`, with the field name as its `label`:

```tsx
{/* react-hook-form */}
<Controller name="is_active" control={control} render={({ field }) => (
  <Switch size="sm" checked={!!field.value} onChange={field.onChange} label="Active" />
)} />

{/* local state */}
<Switch size="sm" checked={isActive} onChange={setIsActive} label="Active" />
```

- This deliberately overrides the shell kit's own Switch doc-comment ("Checkbox
  inside a form, Switch for immediate effect") **for Active fields only**.
  Other booleans (Default, DST, behaviour flags…) stay checkboxes.
- Config-driven ref-data forms get it for free: `RefForm` renders a
  `type: 'checkbox'` field as a Switch when its key is `is_active` — keep the
  config type as `checkbox`.
- Reference implementations: `BankAccountForm`, `BrandForm`, `PaymentTermForm`
  (admin portal, converted 2026-08-14 along with DeliveryLocation / Design /
  PayrollComponent / TermsTemplate).


## Destructive actions live in the EDIT form, never the read view

Cancel / Delete / Void belong in the `*Form`, reached through **Edit**. Forward
transitions (Submit for approval, Approve & Book, Reserve Stock, Start Review,
Complete & Post) **stay in the read view**.

The registry decides which component is the read view:

```tsx
if (editing) return <XForm id={entity.id} onSuccess={() => setEditing?.(false)} … />;
return <XDetail entity={entity} />;   // ← read-only. No Cancel/Delete here.
```

**Duplicate buttons stay** where they already exist (Victor Mau's call,
2026-08-13) — they were removed from Receipt and Payment only.

## Destructive actions confirm through the SHELL dialog, never a native popup

`react-os-shell` ships a Promise-based confirm family, rendered in-theme by the
shell's `ConfirmProvider`:

- **`confirmDestructive({ message, confirmWord: 'Delete' })`** — the destructive
  confirm window. Required for anything irreversible: Delete, Cancel, Void,
  ending a listing. `confirmWord` is the verb on the red button. Reference:
  `RefTable`, `SalesClaimForm`, `RequisitionForm`, `PurchaseInvoiceForm`.
- **`await confirm({ title, message, variant })`** — lower-stakes gate (discard
  dirty state, take a site offline). It accepts a bare string, but pass the
  object so the dialog carries the record's facts.
- **`prompt({ … })`** — the shell's input dialog, replacing `window.prompt`.

`window.confirm` / `window.alert` / `window.prompt` are banned (Victor Mau,
2026-08-14; the why is recorded in `serverStatus/ConfirmPopover.tsx`): they
can't be styled or themed, can't carry the facts, and block the event loop.
The bare-identifier trap that keeps shipping them anyway is Bug 4 below.


## Detail windows — chrome-less body, facts table, timeline last

Reference: `PaymentDetail`, `ReceiptDetail`, `SalesOrderDetail`.

- **The Detail is a chrome-less body**: entity prop in, `<div className="space-y-4">`
  (or `DetailLayout` for tall docs in a `bodyScroll={false}` Modal) out. Title,
  status badge, Edit button and key facts live in the REGISTRY entry
  (`title: dupTitle(…)`, `footer: dupFooter(…)`), not the component. The
  self-fetching Modal-rooted family (JournalEntryDetail, GLAccountDetail, …)
  exists only because those also open as nested popups.
- **Facts render as the bordered `lc`/`vc` table**, never a `<dl>` (that's for
  settings-flavoured records): wrapper
  `border border-gray-200 rounded-lg overflow-hidden`, label cell
  `px-3 py-2 text-xs font-medium text-gray-500 uppercase bg-gray-50 border-r border-gray-200`,
  value cell `px-3 py-2 text-sm text-gray-900 border-r border-gray-200` —
  hoist them as `const lc/vc`, don't inline per-`<td>`.
- **Line tables:** own lines get `thead bg-gray-100 text-gray-700`; related-doc
  sub-tables `bg-gray-50 text-gray-500`. Numerics right-aligned
  (`.toLocaleString()` for qty). Totals: `tfoot bg-gray-50 font-semibold`,
  first row `border-t-2 border-gray-300`, right-aligned `colSpan` labels,
  `text-xs` adjustment rows (negatives `text-green-700` with a real `−`),
  grand total `font-bold` labelled `Total (incl. {taxLabel})` when taxed.
- **Money/dates:** `const fmt = (v) => formatCurrency(v, doc.currency)` closure;
  header Amount rows append the code. `formatDate`/`formatDateTime` always —
  never raw ISO passthrough or `toFixed(2)` + a bare symbol.
- **Empty value = `<span className="text-gray-400">—</span>`** (Victor Mau's
  call, 2026-08-14). Bare `'—'` and ASCII `'-'` are legacy; `displayOrDash`
  stays the LIST-column helper.
- **Section headings: `text-sm font-semibold text-gray-700 mb-2`** (Victor Mau's
  call, 2026-08-14) — the uppercase `text-gray-900 tracking-wider` rival is legacy.
- **`EntityTimeline` is the LAST block, directly above `ModalActions`** (36/42
  comply) — `entityType` snake_case + `entityId` + `entityLabel` (doc number).
  Tabbed workspace details move it to an Activities tab with
  `variant="messages-only"`. It belongs in the Detail, never the Form.
- **Status-explaining banner** at body top where a status needs context:
  `flex items-start gap-2 rounded-lg border border-{tone}-200 bg-{tone}-50 px-3 py-2 text-sm`
  (slate=draft, amber=pending/blocked, green=approved) + one sentence saying
  what the primary button will do.
- **Tabs** only for workspace entities (PartNumber, Customer, Supplier…), via
  the shared `TabBar` — never hand-roll the underline strip.
- **Related links:** blue `text-blue-600 hover:text-blue-800 hover:underline`
  buttons calling `openEntity(type, id, snapshotOrNull, label, listRoute)`
  (5-arg form — the route drives accent + taskbar grouping). Prefer the shared
  `PartNumberLink` / `CounterpartyLink` / `openCompanyProfile`.


## Forms — INPUT_CLS, the error pipeline, per-field undo

Reference: `BankAccountForm` (react-hook-form), `ReceiptForm` /
`GLAccountForm` (useState). Full census in the audit file.

- **Inputs:** `import { INPUT_CLS } from '../utils/formClasses'`, aliased
  `const inp = INPUT_CLS`, with `const lbl = 'block text-sm font-medium text-gray-700 mb-1'`
  and the `errCls` red-border helper. `COMPACT_INPUT_CLS` for dense grids —
  never a hand-rolled compact string. Required marker = trailing `*` inside
  the label text (not a red span).
- **State:** document forms with line items = `useState`/`useUndoableState` +
  hand-written `handleSave`; flat master-data forms = bare react-hook-form.
  **zod is installed but unused — do not introduce it.**
- **Layout:** `grid grid-cols-2 gap-4`; `col-span-2` for full-width; Notes/
  textarea last with `rows={2}`. No responsive variants — windows are
  desktop-fixed.
- **Error pipeline:** `parseApiError` in the save mutation's `onError` →
  `setFormErrors(parsed.fieldErrors)` (`Record<string, string[]>`) →
  `<FormErrorAlert errors={mut.isError ? formErrors : null} className="mb-4" />`
  before the footer + `className={inp + errCls('field')}` per field. Use
  `parseApiError` (silent), NOT `apiErrorToast`, when the global MutationCache
  will already toast (Bug 2).
- **Selects:** `SearchableSelect` for any FK (`className={inp}`);
  `CurrencySelect` bound to the currency CODE; shell `Select` for short enums.
  rhf: `register()` for plain inputs, `<Controller>` for every custom field
  component, `setValue(…, { shouldDirty: true })` for imperative writes.
- **Submit:** use `FormActions` (labels
  `Updating.../Creating...` ↔ `Update`/`Create`; document forms may say
  `Save Draft`). **Submit skin = `.btn-submit` + `.kbd-submit`** (Victor Mau's
  call, 2026-08-14; ✅swept in ap#1595, guarded by
  `tests/unit/submitSkinGuard.test.ts`). A non-native `.btn-submit` button
  NEEDS `data-submit` — the shell's ⌘⏎ selector matches `bg-blue-600` but not
  `.btn-submit`, so the conversion silently unhooks the hotkey without it.
  Alt-hint chips (⌥⇧N/E) on blue toolbar buttons deliberately KEEP the raw
  blue badge — only ⌘⏎ badges use `.kbd-submit`.
  `meta: { success: '<Entity> <verbed>.' }` on every save mutation.
- **Undo:** register EVERY editable field — `useUndoableState(initial, { label,
  coalesceKey })` or `useUndoable(watch(f), v => setValue(f, v), { label,
  coalesceKey })` (per field; never the whole `watch()` object) — and render
  `<ModalActions position="left"><UndoControls /></ModalActions>` at the FORM
  ROOT (a conditional branch can hide a portaled footer). A `FormActions` form
  with no registered state must wrap `<UndoProvider canEdit={false}>`.
- **Also:** an FK field's label gets `{value && <OpenLink …/>}`; blank optional
  FKs/dates normalise to `null` in `mutationFn` (DRF rejects `''`).


## Visual vocabulary — buttons, pills, icons, dark mode

Buttons are hand-rolled class recipes, not the shell `Button` — keep the
recipes exact (census + all six verbatim strings in the audit file):

- **Primary/submit:** `.btn-submit` (see Forms above). Solid `bg-green-600` is
  the approve/post/book action.
- **Secondary:** `bg-white text-gray-700 border border-gray-300 px-3 py-1.5
  text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50`.
- **Destructive DEFAULT = red OUTLINE** (`text-red-600 border border-red-200
  bg-white … hover:bg-red-50 hover:border-red-300`); solid `bg-red-600` only
  for terminal, irreversible actions (decline/reject). Amber outline = caution/
  reversal; gray outline = quiet/dismiss.
- **⛔ Off-palette solid fills as buttons** (`bg-amber-600`, `bg-indigo-600`,
  `bg-emerald-600`) — they ignore the accent theme.
- **Sizes:** `px-4 py-2 text-sm` footers · `px-3 py-1.5 text-sm` toolbars
  (dominant) · `px-2.5 py-1 text-xs` row actions. Icons pair as `h-4 w-4`+`gap-2`
  / `h-3.5 w-3.5`+`gap-1.5`; Heroicons v2 outline-24 only; `h-` before `w-`.
- **Pills:** `StatusBadge` for ANY status string (tones come from
  `shell-config/statusGroups.ts` — never a local STATUS_COLOR map);
  `ColoredBadge tone=` for categorical values (`constants/badges.ts`);
  `colorClass=` only for a colour with no tone name; raw span pills are drift.
  Admin's `statusGroups.ts` is CANONICAL — the customer/supplier maps must
  agree with it (they currently don't on submitted/rejected/delivered/unpaid).
- **Rounding `rounded-lg`** (pills `rounded-full`); body text `text-sm`,
  metadata/table heads `text-xs`; `font-medium` emphasis, `font-semibold`
  headings.
- **Dark mode: NEVER write `dark:` variants** — write light classes; the shell
  remaps them. Three traps, each a DISTINCT class the remaps can miss:
  `/NN` alpha modifiers, `hover:`/`disabled:` state variants, `!`-important
  forms. Raw hex bypasses theming entirely (legit only in email/storefront
  render surfaces). New tinted classes may need a `[data-theme="dark"]` rule in
  admin's `index.css`.


## States, feedback & permissions

- **Loading:** `if (isLoading) return <LoadingSpinner />;` — bare, prop-less.
  Lists never spin manually (`EntityList` owns loading/error/empty).
- **Empty:** `<EmptyState message="No <plural> yet." hint="<what fills it>" />`
  — sentence case, full stop; switch the message when filters are active
  ("No matches." vs genuinely empty).
- **Error ≠ empty:** wire `isError` + `onRetry` (from `useInfiniteScroll`) into
  every `EntityList` — 0/69 did at audit time, so every list showed "No X
  yet." on a 500. Error copy: "Couldn't load <thing>" + a Try again button.
- **Modals from lists:** `Modal size="2xl" dirty="auto"` wrapping the form
  (`id | null` + `onSuccess`/`onCancel`; the list owns open-state and
  invalidation). **`dirty="auto"` is not the shell default — omitting it
  silently drops the discard guard.**
- **Hotkeys:** `useNewHotkey(handleNew)` + the visible `ALT_SHIFT_N` chip on
  `SidebarActionButton` (same handler — a hotkey without its chip is
  undiscoverable); `useEditHotkey(cond ? fn : null)` — pass `null` to disable,
  don't skip the call.
- **Permissions:** `hasPerm(codename)` ('*' = superuser); never group names.
  Creates HIDE behind `hasPerm('add_x')`; per-record deletes HIDE behind
  `can_delete`; **status transitions on a visible record SHOW-DISABLE-EXPLAIN**:
  a module-level `*_DENIED` sentence ("You need the <Module> → <Perm>
  permission to …. Ask an administrator to add it to your role."),
  `aria-disabled` + `title` on the button, and a `toast.error` guard in the
  handler — a hidden transition reads as a broken screen (BG#00479/BG#00485).


- Only show for write operations (POST/PUT/PATCH/DELETE), not GET
- Show human-readable permission name: `Products -> Add Part Number`
- All denials logged to activity log



## Window registry & navigation

- **Page entry:** `'/route': { component: lazy(() => import('…')), label,
  multiInstance: true, flushBody: true, dimensions: [1376, 1150] }` — string-
  literal import specifier (a template literal kills code-splitting);
  `flushBody` whenever the page brings its own `SidebarLayout`; every entity
  LIST window is `multiInstance: true`, settings/hubs/editors are singletons.
- **Entity entry:** `endpoint`, `queryKey`, `icon` (a page-route key), `render`,
  `title: dupTitle(…)`, `footer: dupFooter(…)`, `size: '2xl'`. Render branch
  order is fixed: `_duplicate` → `_new` → `editing` → Detail. Registry `title`
  fns are NOT components — no hooks inside them; permission-aware chrome must
  be a component (`SupplierEditButton`).
- **`size` vs `dimensions`:** `dimensions` re-enforces pixels on every open
  (list windows pin `[1376, 1150]`); `size` seeds the first open then persists
  the user's resize (details `'2xl'`, editors `'3xl'`). `autoHeight: false`
  MUST come with `dimensions` (else the 240px floor). `flushBody` on an ENTITY
  entry works only on react-os-shell ≥ 4.75.0 (before that the entity path
  silently ignored it; the portal pins ≥ 4.77.0 as of 2026-08-16 — don't
  "clean up" entity flushBody flags, they are live).
- **`openEntity(type, id, snapshot, label, route)` — always the 5-arg form.**
  Seed the list row as `snapshot` (null from bare links); `label` = doc number
  (taskbar + copy text); `route` = the owning page route (accent stripe +
  taskbar grouping — omitting it is a bug). Drafts: `new-${Date.now()}` +
  `{ _new: true }`; duplicates `{ _duplicate: true }`. Entity windows dedupe
  per record.
- **Persistence names:** sidebar `storageKey="<camelArea>.sidebarWidth"`;
  `tableId` = kebab `<noun>-list`, the SAME string into `useSort(field, dir,
  tableId)` and `CsvActionButton`; detail sub-tables `<parent>-<child>` or
  deliberately none (comment why); reports `` `report:${route}` ``.
- **New window recipe:** registry entry → `nav.tsx` item (`to` = same route,
  `perms: ['view_x']`) → `navIcons['<route>']` → `App.tsx` route. **A report is
  ONE line in `shell-config/reports.ts`** — it derives all four. Every
  NavSection requires `feedbackModule`; `perms` alone can NOT gate
  operator-only UI (every Admin has `'*'`) — use `operatorOnly`. Renamed routes
  get a `ROUTE_ALIASES` entry. A non-default registry flag gets a one-line why
  (ticket ref) — that's current practice, keep it at 100%.


---

# Part III — Recurring bugs (found in 15+ components)

## 🚨 Bug 1 — delete/cancel that leaves a stale list and a dead window

The single most repeated defect in this codebase. Found in **13 components**.

```tsx
// ✗ WRONG — this was in 13 places
onDelete={async () => {
  await apiClient.delete(`/products/moulds/${id}/`);
  onSuccess();          // registry wires this to setEditing(false)
}}
```

The registry wires an edit-mode form as `onSuccess={() => setEditing?.(false)}`.
So this **only leaves edit mode**: the list keeps the deleted record and the
window falls back to a detail view of something that no longer exists. For a
status change (cancel) the record survives but every list, balance and
statement showing it goes stale.

```tsx
// ✓ RIGHT
const deleteMut = useMutation({
  mutationFn: () => deleteMould(id!),
  meta: { success: 'Mould deleted.' },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['moulds'] });
    (onDeleted ?? onSuccess)();
  },
});
```

- Add **`onDeleted?: () => void`** to the form's props and pass
  `onDeleted={onClose}` from the registry's `editing` branch — a deleted record
  must CLOSE the window, not fall back to a detail view.
- ⚠️ **`onDeleted={onClose}` needs react-os-shell ≥ 4.74.1.** Before that, the
  shell handed `entry.render()` the CHROME's guarded close, which converts any
  close into "exit edit mode" while the window is editing and pristine — so the
  wiring was silently swallowed (open Edit → Delete immediately = pristine =
  swallowed; found live on the GL account delete, ros#158 fixed it). Browser-
  verify a delete actually closes its window; unit gates can't see this.
- **Keep the `(onDeleted ?? onSuccess)()` fallback.** List pages render the same
  forms inside their own modal, where `onSuccess` *is* the close handler.
- **Copy the invalidation set from wherever the action used to live.** A cancel
  usually needs more than the list: receipts also invalidate `clients`,
  `invoices`, `account-statement` and `statement`; a GRN cancel needs
  `vendor-invoices`, `invoices` and `shipments`.

## 🚨 Bug 2 — never add a local `onError` that toasts

`App.tsx` installs a global `MutationCache.onError` that toasts **every**
mutation failure. The axios interceptor marks only **403** and
server-unreachable as `_toastHandled`, so a local
`onError: apiErrorToast(err, toast.error, '…')` double-toasts a 409 or a
validation error. `PartNumberDetail.deleteMut` documents this.

A local `onError` is still right when it does something *other* than toast —
e.g. `setFormErrors(parsed.fieldErrors)` on a save mutation.

## 🚨 Bug 3 — a Detail rendered with a hardcoded `editing={false}`

`ProjectDetail` takes an `editing` prop and the registry passes `editing={false}`
literally, so its whole `{editing ? … }` branch — including a delete button — is
**dead code**. Before "fixing" an action in a Detail, confirm the registry can
actually reach it.

## 🚨 Bug 4 — a bare `confirm(` has two failure modes, both invisible to tsc AND eslint

```tsx
// ✗ WRONG — no shell import, so this is window.confirm: the native browser popup
<button type="button" onClick={() => { if (confirm('Delete this account?')) deleteMut.mutate(); }}>
```

- **Import missing** — a bare `confirm(…)` resolves to lib.dom's
  `window.confirm(string): boolean`. It typechecks and lints clean, and ships
  the native popup (`GLAccountForm` shipped exactly this; found 2026-08-14).
- **Import present but not awaited** — the shell `confirm` returns
  `Promise<boolean>`, so a sync `if (confirm(…))` is ALWAYS truthy and the
  destructive action fires with **no confirmation at all**. Strictly worse than
  the popup, and equally silent: the eslint config has no type-aware rules, so
  `no-misused-promises` isn't there to catch it.

```tsx
// ✓ RIGHT
onClick={async () => {
  if (await confirmDestructive({
    message: `Delete account ${account.account_number} ${account.name}? This cannot be undone.`,
    confirmWord: 'Delete',
  })) deleteMut.mutate();
}}
```

Audit both modes in one pass — every bare hit must have the shell import AND
an `await`:

```bash
grep -rnE "window\.(confirm|alert|prompt)|[^.a-zA-Z](confirm|prompt)\(" src/
```

As of 2026-08-14 the admin portal had 12 native-popup sites (`GLAccountForm`,
`BillingPlans`, `ScorecardSettings`, `Tenants`, `TodoList`, `ContactSetup`,
`ChatLinks`, `AssessmentDetailsForm`, `MarketplaceRepricing`,
`MarketplaceListings`, `usePortalEnabled`, `RichTextEditor`); the customer,
supplier and dealer portals were clean.


## Auditing this yourself

Grep-based scanning misses these three ways. All three bit during the audit:

1. **`<[^>]+>` tag-stripping loses button labels.** A JSX opening `<button>` tag
   contains `=>` and `>` inside expressions, so the regex truncates
   mid-attribute. Scan for the first `>` at brace-depth 0 outside quotes.
2. **`onClick={…}` alone misses over half the writes** — they also live in
   `onDelete={…}`, `onSubmit={…}`, `onPark={…}`. Walk every `on[A-Z]\w*={…}`.
3. **`apiClient.(patch|post|put|delete)` misses helper-routed writes** — most go
   through a typed function in `src/api/*.ts` (`updateGoodsReceiptStatus`,
   `deleteCustomer`). Resolve the writing helpers out of the api modules first,
   then search for them awaited in a handler.

Treat a handler as safe if it contains `invalidateQueries`, `setQueryData`,
`refetch`, or delegates to a mutation.

To decide authoritatively whether a component is a read view, parse
`windowRegistry.tsx` for `if (editing) return <XForm …>` paired with
`return <XDetail …>` — 23 such Detail components in the admin portal.


---

# Part IV — Base patterns and recipes

## Buttons — submit skin, hotkeys, save-and-stay, duplicate

### Submit Buttons
- Use the `.btn-submit` utility class (defined in `admin-portal/src/index.css`) — it consumes CSS vars that track the active theme's accent color (blue default, pink/emerald/grey/etc.). NEVER hardcode colors like `bg-green-600 hover:bg-green-700` — that ignores the active theme.
- The kbd badge uses the `.kbd-submit` utility class, which themes alongside the button.
- Always show platform-aware hotkey using constants from `src/components/Kbd.tsx`:
  ```tsx
  import { CMD_ENTER, ALT_SHIFT_D } from '../../components/Kbd';
  // In button:
  <kbd className="kbd-submit rounded border px-1.5 py-0.5 text-[10px] font-medium">{CMD_ENTER}</kbd>
  ```
- **NEVER use raw HTML entities** (`&#8984;&#9166;`) — always use `Kbd.tsx` constants
- Available constants: `CMD_ENTER`, `CMD_S`, `CMD_K`, `CMD_DOT`, `CMD_A`, `ALT_SHIFT_D`, `ALT_SHIFT_E`, `ALT_SHIFT_N`
- Shows `⌘⏎` on Mac, `Ctrl⏎` on PC (etc.)
- Use `inline-flex items-center gap-2` on the button className
- Blue for primary actions, Green for status transitions, Red text for destructive

### Enter Key
- Bare Enter MUST NOT submit forms in modals (handled globally by Modal component)
- Only Cmd+Enter submits

### Keyboard Shortcuts in Modals (handled by Modal.tsx)
- **Cmd+Enter / Ctrl+Enter**: Submit and close (finds `button[type="submit"]`, `button[data-submit]`, `button.bg-green-600`, or `button.bg-blue-600`). For status-transition buttons that aren't inside a `<form>` (e.g. "Submit Report", "Approve"), add `data-submit` so the hotkey still fires now that submit buttons no longer carry the literal `bg-green-600` class.
- **Cmd+S / Ctrl+S**: Save and stay — dispatches `modal-save` event, resets dirty state, modal stays open
- **Alt+Shift+D**: Save as new (duplicate) — dispatches `modal-duplicate` event
- **ESC**: Close modal (with dirty guard if unsaved changes)

### Save and Stay (Cmd+S)
Forms that support save-without-close use the `useModalSave` hook:
```tsx
import useModalSave from '../../hooks/useModalSave';
// Inside the component:
useModalSave(useCallback(() => {
  const payload = buildPayload();
  mutation.mutateAsync(payload).then(() => {
    queryClient.invalidateQueries({ queryKey: ['entity-key'] });
  }).catch(() => {});
}, [mutation, queryClient]));
```
- Saves data to backend without closing the modal
- Modal resets dirty state so ESC/click-outside won't warn

### Save as New / Duplicate (Alt+Shift+D)
Forms that support duplicate use the `useModalDuplicate` hook:
```tsx
import useModalDuplicate from '../../hooks/useModalDuplicate';
// Inside the component:
useModalDuplicate(useCallback(() => {
  const payload = buildPayload();
  delete payload.entity_number; // let backend assign new number
  createEntity(payload).then(() => {
    queryClient.invalidateQueries({ queryKey: ['entity-key'] });
    onSuccess();
  }).catch(() => {});
}, [queryClient, onSuccess]));
```


### Action Button Layout
- Delete/destructive: left-aligned, red text link (`text-red-600 hover:text-red-800`)
- Primary action (Save/Create/Submit): right-aligned, blue button
- Status transitions (Mark as Sent, Confirm, Approve): left-aligned, green button
- Save as New: right-aligned, blue text link next to Edit/Update button
- Edit button: right-aligned, blue button with keyboard shortcut badge

### Detail Popup Action Bar Pattern
**View mode:**
```
[Left]  Edit (blue btn with hotkey)          [Right]  Approve (green btn, if submitted)
```
**Edit mode:**
```
[Left]  Delete (red text)                [Right]  Save as New (blue text)  Update (accent btn with hotkey)
```
- Edit button: in title bar next to entity number + status badge, outline/ghost style (`border border-gray-300 text-gray-600`), with the `ALT_SHIFT_E` hotkey badge from `Kbd.tsx`. Small size (`text-xs`, compact padding).
- Update/Save button: right side, green, with the `CMD_ENTER` hotkey badge from `Kbd.tsx`
- Approve: right side, green, only in view mode when status is "submitted"
- Delete: left side, red text, only in edit mode when entity has no dependencies
- Save as New: right side, blue text link next to Update button, only in edit mode

### Inline Edit Mode in Detail Popups
- Detail popups should support inline editing (not open a separate form modal)
- Toggle between view (read-only table) and edit (form inputs) using Edit button
- In edit mode: all fields become editable inputs/selects/textareas
- Upload/delete actions for images/files only available in edit mode
- Fetch reference data (brands, designers, etc.) only when `enabled: editing`

### Text Action Links
- Bulk Import: `⇥ Bulk Import` (with tab-right arrow symbol)
- Calculate Prices: `$ Calculate Prices` (with dollar symbol)
- Add Line: `+ Add Line`


## FK fields — SearchableSelect, never a hand-rolled dropdown

Every ForeignKey field in a create/edit form uses **`SearchableSelect`**
(`className={inp}`) — see the Forms section above. Simple enum/choice
fields (status, currency) keep the shell `Select`. The hand-rolled
open/blur/onMouseDown dropdown pattern that predates `SearchableSelect`
survives in older forms — understand it when editing them, but never
write a new one.

- Part Number search in line-item tables stays a special case — the
  reusable `PNSearchCell`:
  - Input shows current value, switches to search on focus
  - API call to `/products/part-numbers/?search=X&page_size=10` with 300ms debounce
  - Dropdown shows `part_number` (mono) + `description` (truncated)
  - On select: fills part_number + description fields
  - Table cell needs `style={{ overflow: 'visible' }}` and the table
    container needs `overflow: visible` (a searchable dropdown inside an
    `overflow-hidden` table clips)
- For entity dropdowns: filter client-side from a pre-fetched list
  (`useQuery` with `no_page: 'true'`)


### Scrollable Item Tables in Modals
When a modal/popup contains a list table (line items, allocated invoices, etc.), the scrollbar must be **only on the tbody rows**, not the thead or tfoot. The table header and footer stay fixed — the scrollbar starts BELOW the header row.

**Pattern — 3-part split: fixed thead, scrollable tbody, fixed tfoot:**
```tsx
<div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0 flex-1">
  {/* 1. Fixed header — separate table, NOT scrollable */}
  <table className="min-w-full text-sm shrink-0">
    <thead className="bg-gray-800 text-white">
      <tr>
        <th className="px-3 py-2 text-left text-xs font-medium uppercase w-8">#</th>
        <th className="px-3 py-2 text-left text-xs font-medium uppercase">Part Number</th>
        ...
      </tr>
    </thead>
  </table>
  {/* 2. Scrollable body — only this has overflow-y-auto */}
  <div className="overflow-y-auto flex-1 min-h-0">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <tbody className="divide-y divide-gray-100">
        {items.map(...)}
      </tbody>
    </table>
  </div>
  {/* 3. Fixed footer — separate table, NOT scrollable */}
  <table className="min-w-full text-sm">
    <tfoot className="bg-gray-50 font-semibold">
      <tr className="border-t-2 border-gray-300">
        <td colSpan={N}>Total</td>
        <td>{qty}</td>
        <td>{amount}</td>
      </tr>
    </tfoot>
  </table>
</div>
```

**Rules:**
- **3 separate `<table>` elements**: thead table, tbody table (inside scroll div), tfoot table
- Outer container: `border rounded-lg overflow-hidden flex flex-col min-h-0 flex-1`
- thead table: `shrink-0` — stays fixed at top, scrollbar starts BELOW it
- tbody scroll div: `overflow-y-auto flex-1 min-h-0` — only part that scrolls
- tfoot table: stays fixed at bottom, outside scroll area
- Column widths: use matching `w-` classes on thead th and tfoot td for alignment
- **NEVER** put thead inside the scroll div — the scrollbar must not cover the header
- Apply this pattern to ALL item tables in modals: detail views, edit forms, invoices, shipments, POs

**Flex column layout for detail/edit views with item tables:**
```tsx
<div className="flex flex-col gap-5 max-h-[calc(100vh-10rem)]">
  <div className="... shrink-0">  {/* progress bar */} </div>
  <div className="... shrink-0">  {/* header info table */} </div>
  <div className="... flex flex-col min-h-0 flex-1">  {/* items — 3-part split above */} </div>
  <div className="... shrink-0">  {/* terms, notes, actions — stay fixed */} </div>
</div>
```
- Root: `flex flex-col gap-5 max-h-[calc(100vh-10rem)]`
- Fixed sections: `shrink-0` (header, footer, actions)
- Items section: `flex flex-col min-h-0 flex-1` (fills remaining space, uses 3-part split)

### Form Scroll Pattern — Fixed Footer
When a form is too tall for the modal, the footer (submit buttons) MUST stay fixed at the bottom while form fields scroll:
```tsx
<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
  {/* Scrollable content */}
  <div className="overflow-y-auto -mr-2 pr-2 flex-1 min-h-0">
    {/* form fields here */}
  </div>
  {/* Fixed footer */}
  <div className="flex items-center justify-between pt-4 border-t border-gray-200 shrink-0">
    {/* Delete / Save as New / Submit buttons */}
  </div>
</form>
```
- Form root: `flex flex-col flex-1 min-h-0` (fills Modal's flex container)
- Content wrapper: `overflow-y-auto -mr-2 pr-2 flex-1 min-h-0` (scrolls, `-mr-2 pr-2` for scrollbar gutter)
- Footer: `shrink-0` (never scrolls)

### Required Fields
- Mark with `*` in label
- Category is always required for Part Numbers


### File Upload / Upload Buttons

**In detail popups (edit mode):**
- Use text link style: `className="text-sm font-medium text-blue-600 hover:text-blue-800"`
- Prefix with `+`: e.g., `+ Upload Renderings`, `+ Upload Files`
- Place top-right of section header, inline with section title

**In forms (create/edit):**
- Use inline bordered button style:
```tsx
<label className={lbl}>Field Name</label>
<div className="flex items-center gap-3">
  <input type="file" ref={ref} multiple onChange={handler} className="hidden" />
  <button type="button" onClick={() => ref.current?.click()}
    className="bg-white text-gray-700 border border-gray-300 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-50">
    + File Label
  </button>
  <span className="text-sm text-gray-400">{count} new</span>
</div>
```
- Show count next to button: `{count} new`
- Show small thumbnails (w-16 h-16) below the button for selected images
- Each thumbnail has a hover delete button (red circle x, top-right)

**General:**
- Generate server-side thumbnails (300x300 JPEG via Pillow) on upload


## Shared Component Rules

### Shell-First Placement
When a UI or UX change can live in `react-os-shell`, build it there — not in any portal (admin-portal, supplier-portal, customer-portal). Shell holds portal-agnostic UI infrastructure (Layout, WindowRegistry, DesktopHost, toasts, modals, theming, generic widgets) and is published to npm, so all consumers upgrade together with one `npm install`.

**Belongs in shell:**
- Layout chrome, desktop, window management
- Generic UI primitives (modals, dialogs, toasts, badges, resizable tables)
- Cross-portal interaction patterns (drag-drop, column resize, prefs persistence)
- Theming, animations, frosted glass surfaces

**Stays in the portal:**
- Forms and detail popups bound to EFFICIENT models (e.g. `QCReportForm`, part number popups)
- Anything depending on EFFICIENT API endpoints, permissions, or business logic
- Auth, login UI, user/profile management, activity charts (existing scope exclusions)

When unsure, prefer shell — duplicated UI across portals is the failure mode this rule prevents.

### ALWAYS extract to shared components:
1. Any detail popup that shows entity data in a Modal
2. Any form (create/edit) that's used in a Modal
3. Any component used in more than one page

### Naming Convention:
- Detail popups: `src/components/{Entity}DetailPopup.tsx` or `src/components/{Entity}Popup.tsx`
- Forms: `src/components/{Entity}Form.tsx`
- Export as default

### When creating a new entity page:
1. Create the shared detail popup component FIRST
2. Create the shared form component
3. Import both in the page file
4. The page file should only contain: list view, filter bar, and Modal wrappers


## Under `EntityList` — the `ResizableTable` layer

`EntityList` (Part II) is the mandatory entry point for every list; it
renders through `ResizableTable`, whose knobs you still configure:

### Column Definitions
- Define ALL available columns in a `COLUMNS` const array, even optional ones
- Each column: `{ key, label, defaultWidth, minWidth: 30, sortField?, defaultHidden? }`
- `defaultHidden: true` — column available in picker but hidden by default
- `sortField` — set only for backend-sortable columns
- Include comprehensive columns: all model fields + serializer computed fields
- Group columns logically: identity first, then specs, then dates, then status last

### Column Cell Renderers
- Define `cellRenderers: Record<string, (item) => ReactNode>` inside the render prop
- Use a `v()` helper for text: `const v = (val) => val != null && val !== '' ? String(val) : '—'`
- Primary identifier: `font-medium text-blue-600`
- Status: use `<StatusBadge>` component
- Booleans: show "Yes" (colored) or "—"
- Dates: show as-is from API (YYYY-MM-DD)
- Fallback `?? '—'` handles columns without explicit renderers

### ResizableTable Props
- `tableId` — unique ID per list (e.g., "mould-list")
- `columns` — column definitions array
- `sort` / `onSort` — from `useSort()` hook (only if page has sorting)
- `footer` — record count text: `<>{count} items</>` or hasNextPage pattern
- `afterBody` — sentinel ref + loading indicator for infinite scroll pages

### Column Picker
- Built into ResizableTable footer (settings icon)
- Shows all columns with checkboxes (ticked = visible)
- At least one column must remain visible
- "Reset" button restores all defaults

### Sorting
- Import `{ useSort } from '../../components/SortableHeader'` (not `SortableHeader` itself)
- Pass `sort={sort} onSort={onSort}` to ResizableTable
- For client-side data: sort the filtered array before rendering

### Filters
- Use `FilterBar` for dropdown filters when possible — it handles "Clear filters" automatically
- `FilterBar` accepts `children` (e.g. `DateRangePicker`) — rendered after dropdowns, before "Clear filters"
- Use `useInfiniteScroll` for server-side pagination
- Show total count in footer
- **Every list page with dropdown filters MUST have a "× Clear filters" button**
- The clear button appears only when at least one filter is active (not search text)
- Position: after all filters and DateRangePicker, at the END of the filter bar
- Clear button resets all dropdown filters and date ranges (NOT the search text input)
- Style: `className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 shrink-0"`
- Icon: inline SVG X mark (4×4)


### Keyboard Navigation — useTableNav
Every list page MUST use the `useTableNav` hook for keyboard navigation:
```tsx
import useTableNav from '../../hooks/useTableNav';

// IMPORTANT: Call AFTER the items variable is defined (not before!)
const focusIdx = useTableNav(
  items,                          // the array of items currently displayed
  openDetail,                     // Enter: open detail popup
  (item: any) => setSelected(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; }),  // Space: toggle
  () => setSelected(prev => prev.size === items.length ? new Set() : new Set(items.map((i: any) => i.id))),  // Cmd+A: select all
  (from: number, to: number) => setSelected(prev => { const next = new Set(prev); for (let i = from; i <= to; i++) next.add((items[i] as any).id); return next; }),  // Shift+click range
);
```

**Hook ordering rule**: `useTableNav` must be called AFTER the items variable (`items`, `filtered`, `pos`, etc.) is defined. Calling it before causes a blank page (runtime reference error).

**Row integration** — add `data-row-idx` and `focusIdx` highlight to `<tr>`:
```tsx
{items.map((item, rowIdx) => (
  <tr key={item.id} data-row-idx={rowIdx}
    className={`cursor-pointer ${focusIdx === rowIdx ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : selected.has(item.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
    onClick={() => openDetail(item)}>
```

**Supported shortcuts** (all handled by the hook):
- `J` / `↓` — next row
- `K` / `↑` — previous row
- `Enter` — open detail popup for focused row
- `Space` — toggle focused row's checkbox
- `Shift+J/K` — move and select (range select by keyboard)
- `Shift+Click` — range select by mouse (from last toggled to clicked row)
- `Cmd+A` / `Ctrl+A` — select/deselect all

### Shortcut Help Overlay
- Press `?` anywhere (outside inputs) to toggle the keyboard shortcut cheat sheet
- Component: `src/components/ShortcutHelp.tsx`, mounted in `Layout.tsx`
- Uses constants from `Kbd.tsx` for platform-aware labels
- **Discoverability**: A "? Shortcuts" text button is in every list page footer (inside `ResizableTable`, next to Reset). Clicking it opens the same overlay. This is built into `ResizableTable` — no per-page work needed.


## Error copy — always say WHY

`window.alert()` is banned (shell confirm/toast family only — Part II).
Error text always says why the operation failed, not just "Failed":

- Bad: `"Failed to calculate prices."`
- Good: `"Please select a price sheet first."`, `"Missing net weight for 90318L6N38KTMBDDK2MZV"`
- For API errors, extract the detail: `e.response?.data?.error || e.response?.data?.detail || e.message`
- For validation: check prerequisites before calling the API (price sheet, exchange rate, etc.)
- For per-item errors from batch operations, list which items failed and why


After "Calculate Prices" / "Recalculate Prices", show a clickable **ⓘ** icon next to each price. Clicking opens a popup with the full calculation.

### Sales Order (FOB price)
```
Part Number: ANO05S1895511438SB
Customer: Canterbury Tyres Pty Ltd
Price Sheet: CP#80010 — Anovia FOB

Base Price              $57
+ MF surcharge           $3
+ AM surcharge           $6
+ FF surcharge           $3
+ MT surcharge           $3
Subtotal                $72
Surcharge (45%)       × 1.45

FORMULA
= (Base + MF + AM + FF + MT) × (1 + 45%)
= (57 + 3 + 6 + 3 + 3) × 1.45
= 72 × 1.45
= $104.5 *

* Rounded to nearest $0.50
```

Data from API: `base`, `breakdown` (per-procedure), `subtotal`, `surcharge_pct`, `unit_price`, `sheet_number`, `nickname`, `brand`, `procedures`.

### Purchase Order (CNY + USD cost)
```
Part Number: 13817K6N18KTM1MZV
Supplier: DWM — Dare Wheel Manufacturing Co.,Ltd.
Price Sheet: VP#90005 — DWM Warrior

Base Finish             BAS
Procedures              AR, DB, SB
Base Rate (BAS × dia)   ¥13.5
KG Price (Base Rate + 30D÷1000)  ¥37.93/kg
Base Weight (width × dia)  10 kg
Net Weight              12.1 kg
Alloy Cost (30D÷1000 + premium)  ¥26.43/kg
Extra Cost (AR:¥16)     ¥16
Process Fee             No
Exchange Rate           6.89

CNY FORMULA
= baseWeight × kgPrice + (netWeight − baseWeight) × alloyCost + extraCost
= 10 × 37.93 + (12.1 − 10) × 26.43 + 16
= $450.84

USD FORMULA
= CNY ÷ (1 + VAT) ÷ Exchange Rate
= 450.84 ÷ (1 + 0.13) ÷ 6.89
= $57.89
```

Data from API: `breakdown` object with `base_rate`, `kg_price`, `base_weight`, `net_weight`, `alloy_cost`, `extra_cost`, `extra_detail`, `has_process_fee`, `unit_price_cny`, `unit_price_cny_net`, `unit_price_usd`, `vat_rate`, `exchange_rate`, `surcharge_pct`.

### Implementation pattern
- State: `priceBreakdowns` (Record<string, any>), `breakdownPN` (string | null)
- Store breakdowns after each calculate call: `setPriceBreakdowns(prev => ({ ...prev, ...bds }))`
- ⓘ icon: only show when `priceBreakdowns[item.part_number]` exists
- Popup: fixed overlay with `z-[60]`, `max-w-md`, click outside to close
- Show `* Rounded to nearest $0.50` with `*` on final amount when surcharge_pct > 0




### Thumbnails
- Always generate server-side thumbnails (300x300 JPEG via Pillow) on upload
- Display thumbnails in grids, NOT full images — use `thumbnail_url` with fallback to `image_url`
- Thumbnail grid: `grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3`, height `h-24 object-cover`
- Make thumbnails clickable to open lightbox

### Lightbox
- Use `createPortal(... , document.body)` to escape Modal stacking context
- Full-screen dark overlay: `fixed inset-0 z-[9999] bg-black/80`
- Show full-resolution image: `max-w-[90vw] max-h-[85vh] object-contain`
- Counter badge top-right: `1 / 5`
- Close button (x) top-right
- Left/right arrow buttons for navigation (circular — wraps around)
- Keyboard support: ArrowLeft, ArrowRight, Escape
- Caption shown below image if present
- Click overlay to close, click image area to stay




### When to use
- Part Number detail views use `DraggableWindow` instead of `Modal`
- Used by `PartNumberLink` (clickable PN in tables) and `PartNumberList` (detail view)
- Other entity detail views continue to use `Modal`

### Shell behavior
- **Positioning**: Fills main content area (sidebar-aware) with 40px padding on all sides
- **Sidebar detection**: Reads sidebar width from DOM (w-72 open = 288px, w-14 collapsed = 56px)
- **Auto-resize**: MutationObserver syncs when sidebar toggles; window.resize syncs when maximized
- **Min size**: 640px wide × 420px tall

### Window controls (header, right side)
1. **─ Minimize**: Collapses window to a tab at bottom of screen
2. **❐ / ⤢ Maximize/Reset**: Snaps back to full content area
3. **ESC badge**: Visual indicator
4. **× Close**: Closes and dismisses the window

### Interaction rules
| Action | Result |
|--------|--------|
| Click backdrop (outside window) | **Minimize** — saves position, shows tab |
| Press ESC | **Close** — dismisses entirely |
| Click × button | **Close** — dismisses entirely |
| Click ─ button | **Minimize** — saves position, shows tab |
| Click ❐/⤢ button | Toggle maximize/windowed |
| Drag header | Move window (exits maximized mode) |
| Drag footer | Move window (exits maximized mode) |
| Drag corner handle | Resize window (exits maximized mode) |

### Minimize behavior
- Saves exact position, size, and maximized state before minimizing
- Minimized tab appears at bottom-center of screen
- Tab shows PN number + "Click to restore" + × close button
- **Persists across page navigation** via `MinimizedWindowsProvider` context at app level
- Restoring returns to saved position/size if it still fits the viewport
- If viewport shrank and saved position doesn't fit, resets to maximized

### Header content
- Part Number (font-mono, blue-600)
- Active/Inactive status badge
- Edit button with ⌥⇧E hotkey (PartNumberList only)
- Breadcrumb: `· Brand Design · Wheel Finish`

### Footer content
- Left: Brand · Category · Supplier
- Right: J/K prev/next nav (PartNumberList only) + Stock count
- Footer is also a drag handle

### Content (PartNumberDetailPopup)
- Description banner (blue-50 bg) with marketing finish swap
- Identity table (PN, Brand, Category, Supplier)
- Product-type sections:
  - **Wheels**: Wheel Specs (design, mould, finish, size, PCD, ET, C/B, bolt pattern, etc.) + Weight & Packaging
  - **Tires**: Tire Specs (size, load, speed rating, UTQG, etc.) + Weight & Packaging
  - **Caps**: Component Details (type, design, material, finish) + Weight & Packaging
- BOM section (PartNumberList only, via PNBomSection)
- Internal Notes (if present)

### Components
- `DraggableWindow` — `admin-portal/src/components/DraggableWindow.tsx`
- `MinimizedWindowsProvider` — `admin-portal/src/components/MinimizedWindows.tsx` (wraps App)
- `PartNumberLink` — `admin-portal/src/components/PartNumberLink.tsx` (clickable PN → DraggableWindow)
- `PartNumberDetailPopup` — `admin-portal/src/components/PartNumberDetailPopup.tsx` (content)

