# UI RULES — windows, forms, buttons, lists, shared components

> Canonical org-wide copy (migrated 2026-08-26 from efficient-ops
> `.claude/skills/ui-rules/SKILL.md`, now a pointer here). Read before
> building or modifying ANY frontend page or component. **Review-only**
> except where a named test is cited inline.

# EFFICIENT — UI Rules

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
  - Transactional: "New ..." (New Project, New Sales Order, New Invoice, New Proposal)
  - Master data: "Add ..." (Add Brand, Add Part Number, Add Vendor, Add Bank Account)
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

### Delete Logic (`can_delete` field on serializer)
Every entity serializer MUST have a `can_delete` SerializerMethodField. Delete is only offered when:
- **Project**: No designs, no proposals
- **Proposal**: Always deletable (reverts project status on delete)
- **Mould**: No part numbers
- **DFM Log**: Always deletable
- **Weight Log**: Always deletable
- **Sales Order**: No POs, no invoices
- **Shipment**: No invoices, no warranty claims
- **Invoice**: No payment allocations
- **Warranty Claim**: Always deletable
- **Client**: No orders
- **Customer Price Sheet**: No orders referencing it
- **Purchase Order**: No QC reports, no vendor invoices
- **Production Progress**: Always deletable
- **QC Report**: Always deletable
- **Vendor Invoice**: Status is draft
- **Manufacturer**: No POs, no part numbers
- **Vendor Price Sheet**: No POs referencing it
- **Part Number**: No orders/POs/shipments/invoices (client + vendor side)
- **Brand**: No designs
- **Design**: No wheel finishes, no part numbers, no moulds
- **Wheel Finish**: No part numbers
- **Bank Account**: No payments, no vendor payments
- **Payment (Receipt)**: Always deletable (allocations cascade)
- **Vendor Payment**: Always deletable

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

## Button Rules

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

## Form Rules

### Searchable Dropdowns — ALL FK Fields
- **Every ForeignKey field** in create/edit forms MUST use a searchable input (not `<select>`)
- This applies to ALL FK relationships: Brand, Design, Manufacturer, Customer, Project, Sales Order, Purchase Order, Part Number, Mould, Category, etc.
- The ONLY exception is simple enum/choice fields (e.g., status, currency) which use `<select>`

### Searchable Dropdown Pattern
```tsx
// State
const [xxxSearch, setXxxSearch] = useState('');
const [xxxOpen, setXxxOpen] = useState(false);
const currentXxx = watch('xxx') || '';
const selectedXxxName = list.find(x => x.id === currentXxx)?.name || '';
const filteredXxx = list.filter(x => !xxxSearch || x.name.toLowerCase().includes(xxxSearch.toLowerCase()));

// JSX
<div className="relative">
  <label className={lbl}>Field Name</label>
  <input type="hidden" {...register('xxx')} />
  <div className="relative group">
    <input type="text"
      value={xxxOpen ? xxxSearch : selectedXxxName}
      onChange={e => { setXxxSearch(e.target.value); setXxxOpen(true); }}
      onFocus={() => { setXxxOpen(true); setXxxSearch(''); }}
      onBlur={() => setTimeout(() => setXxxOpen(false), 150)}
      placeholder="Search..." className={inp} />
    {currentXxx && <button type="button" onClick={() => { setValue('xxx', ''); }}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>}
  </div>
  {xxxOpen && (
    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
      {filteredXxx.map(x => (
        <div key={x.id} onMouseDown={() => { setValue('xxx', x.id); setXxxOpen(false); }}
          className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50">{x.name}</div>
      ))}
    </div>
  )}
</div>
```

### Searchable Dropdown Rules
- Use `onMouseDown` (not `onClick`) on dropdown items to fire before `onBlur`
- Use `onBlur={() => setTimeout(() => setOpen(false), 150)}` to allow click to register
- Pre-fill display text on edit from the selected entity's display name
- Show clear button (×) on hover using `group` + `group-hover:opacity-100`
- For related FKs: filter by parent (e.g., designs filtered by selected brand)
- For Part Number search in line items: use API search with debounce (300ms), show dropdown with PN + description, auto-fill description on select
- Part Number search cell pattern (reusable component `PNSearchCell`):
  - Input shows current value, switches to search on focus
  - API call to `/products/part-numbers/?search=X&page_size=10` with 300ms debounce
  - Dropdown shows `part_number` (mono) + `description` (truncated)
  - On select: fills part_number + description fields
  - Table cell needs `style={{ overflow: 'visible' }}` and table container needs `overflow: visible`
- For entity dropdowns: filter client-side from pre-fetched list (`useQuery` with `no_page: 'true'`)

### Table Overflow
- Line item tables with searchable dropdowns: use `style={{ overflow: 'visible' }}` instead of `overflow-hidden`
- This prevents dropdown clipping

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

## List Page Rules

### Table Layout — ResizableTable
- **Always use `<ResizableTable>`** for all list page tables (not raw `<table>`)
- Columns are resizable (drag border), reorderable (drag header), and hideable (column picker)
- Column config persists to user preferences in the backend

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

### Row Selection Checkboxes
- **Every list page** MUST have a checkbox column as the first column
- Header has a select-all checkbox; each row has an individual checkbox
- Selected rows highlight with `bg-blue-50 hover:bg-blue-100`
- Footer shows selection count **with aggregate statistics** when rows are selected:
  - Compute totals from selected items (qty, amount, etc.) relevant to the entity
  - Format: `{count} selected — {totalQty} pcs — {sym}{totalAmount} — {record count}`
  - Use currency symbol from the first selected item
  - Examples by entity:
    - **Sales Orders**: `8 selected — 13,260 pcs — $1,386,800.00`
    - **Purchase Orders**: `3 selected — 2,400 pcs — $45,600.00`
    - **Invoices**: `5 selected — $234,500.00`
    - **Shipments**: `2 selected — 1,800 pcs`
  - Show whatever numeric columns are meaningful (qty, amount, weight, etc.)
- Checkbox column definition:
```tsx
{ key: '_select', label: '', defaultWidth: 40, minWidth: 40,
  headerNode: <input type="checkbox" checked={data.length > 0 && selected.size === data.length}
    onChange={toggleAll} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" /> }
```
- State and helpers:
```tsx
const [selected, setSelected] = useState<Set<string>>(new Set());
const toggleSelect = (id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
};
const toggleAll = () => {
  if (selected.size === data.length) setSelected(new Set());
  else setSelected(new Set(data.map(d => d.id)));
};
```
- Cell renderer: `_select: (item) => (<input type="checkbox" checked={selected.has(item.id)} onClick={e => toggleSelect(item.id, e)} readOnly className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />)`
- Row className: `` className={`cursor-pointer ${selected.has(item.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`} ``
- Use `headerNode` prop on ColumnDef for custom header content (e.g., checkbox)

### Row Actions
- Click row to open detail popup
- No inline edit/delete buttons on rows (do it in the detail popup)

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

## Error Messages — Toast, Never alert()
- **NEVER use `window.alert()` or `alert()`** for error messages
- Use inline toast banners within the component (red bg, dismiss button):
```tsx
const [toastMsg, setToastMsg] = useState('');
// In JSX:
{toastMsg && (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
    <span>{toastMsg}</span>
    <button onClick={() => setToastMsg('')} className="text-red-400 hover:text-red-600 ml-4">&times;</button>
  </div>
)}
```
- **Always show WHY** the operation failed, not just "Failed":
  - Bad: `"Failed to calculate prices."`
  - Good: `"Please select a price sheet first."`, `"Missing net weight for 90318L6N38KTMBDDK2MZV"`
- For API errors, extract the detail: `e.response?.data?.error || e.response?.data?.detail || e.message`
- For validation: check prerequisites before calling API (price sheet, exchange rate, etc.)
- For per-item errors from batch operations, list which items failed and why

## Price Calculation Breakdown (ⓘ icon)
After "Calculate Prices" / "Recalculate Prices", show a clickable **ⓘ** icon next to each price. Clicking opens a popup with the full calculation.

### Sales Order (FOB price)
```
Part Number: ANO05S1895511438SB
Client: Canterbury Tyres Pty Ltd
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
Vendor: DWM — Dare Wheel Manufacturing Co.,Ltd.
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

## Permission Toast
- Only show for write operations (POST/PUT/PATCH/DELETE), not GET
- Show human-readable permission name: `Products -> Add Part Number`
- All denials logged to activity log

## Confirm Dialogs
- Use `import { confirm } from '../components/ConfirmDialog'` (NOT native `window.confirm`)
- `await confirm('message')` returns Promise<boolean>
- Auto-detects delete messages and shows red/danger variant

## Image Display & Lightbox

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

## DraggableWindow (Part Number Detail)

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
- Left: Brand · Category · Manufacturer
- Right: J/K prev/next nav (PartNumberList only) + Stock count
- Footer is also a drag handle

### Content (PartNumberDetailPopup)
- Description banner (blue-50 bg) with marketing finish swap
- Identity table (PN, Brand, Category, Manufacturer)
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
