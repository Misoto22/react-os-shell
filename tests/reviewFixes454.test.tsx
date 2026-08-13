import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, act, pressKey } from './dom';
import DropdownMenu from '../src/shell/DropdownMenu';
import DataTable from '../src/data/DataTable';
import Dialog from '../src/shell/Dialog';
import { runEscapeInterceptors } from '../src/shell/escapeInterceptors';

/**
 * Three defects found reviewing the 4.42.0-4.54.0 stack. Each is a case where
 * the feature was built and the delivery had a hole in it, so each spec asserts
 * the delivery rather than the intent.
 */

const ITEMS = [
  { key: 'edit', label: 'Edit', onSelect: () => {} },
  { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
];

// ── DropdownMenu: Escape on the interceptor seam ──────────────────────────

test('DropdownMenu: Escape is offered to the shell seam, not left to bubble', () => {
  // The seam is the ONLY path Modal consults before closing a window. A
  // bubble-phase onKeyDown loses to Modal's window-level capture listener, so
  // Escape closed the whole window and took the menu with it.
  const view = render(<DropdownMenu trigger="⋯" aria-label="Row actions" items={ITEMS} />);
  const trigger = view.container.querySelector('button')!;
  act(() => { trigger.click(); });
  assert.ok(view.container.querySelector('[role="menu"]'), 'menu opens');

  const win = view.container.ownerDocument.defaultView as Window & typeof globalThis;
  const escape = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  let consumed = false;
  act(() => { consumed = runEscapeInterceptors(escape); });

  assert.equal(consumed, true, 'an open dropdown must consume Escape at the seam');
  assert.equal(view.container.querySelector('[role="menu"]'), null, 'and close');
  view.unmount();
});

test('DropdownMenu: Escape closes the menu and NOT the window around it', () => {
  // The whole point. A Dialog registers on the same seam and is walked
  // most-recent-first, so the menu — registered later, when it opened —
  // consumes the first Escape and the dialog is left alone.
  let closed = 0;
  const view = render(
    <Dialog open onClose={() => { closed += 1; }} title="Order 1041">
      <DropdownMenu trigger="⋯" aria-label="Row actions" items={ITEMS} />
    </Dialog>,
  );
  try {
    const trigger = view.container.querySelector('button')!;
    act(() => { trigger.click(); });
    assert.ok(view.container.querySelector('[role="menu"]'), 'menu opens');

    pressKey('Escape');
    assert.equal(view.container.querySelector('[role="menu"]'), null, 'the menu goes');
    assert.equal(closed, 0, 'and the dialog stays — it is not what was dismissed');

    pressKey('Escape');
    assert.equal(closed, 1, 'the second Escape is the dialog’s');
  } finally {
    view.unmount();
  }
});

test('DropdownMenu: a closed menu holds no interceptor', () => {
  let closed = 0;
  const view = render(
    <Dialog open onClose={() => { closed += 1; }} title="Order 1041">
      <DropdownMenu trigger="⋯" aria-label="Row actions" items={ITEMS} />
    </Dialog>,
  );
  pressKey('Escape');
  assert.equal(closed, 1, 'nothing open, so the dialog takes it');
  view.unmount();
});

// ── DropdownMenu: the item ref actually attaches ──────────────────────────

test('DropdownMenu: arrow keys move DOM focus, not just tabIndex', () => {
  // PopupMenuItem takes its ref through forwardRef. Taken as a plain prop it
  // is React 19 only, and this package's peer range is `react: ">=18"` — on 18
  // the ref is stripped, itemRefs stay null, and the arrows would move
  // tabIndex while focus sat still. Asserting focus (not tabIndex) is what
  // tells the two apart.
  const view = render(<DropdownMenu trigger="⋯" aria-label="Row actions" items={ITEMS} />);
  const trigger = view.container.querySelector('button')!;
  act(() => { trigger.click(); });

  const menuItems = [...view.container.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
  const doc = view.container.ownerDocument;
  assert.equal(doc.activeElement, menuItems[0], 'opening focuses the first item');

  const win = doc.defaultView as Window & typeof globalThis;
  act(() => {
    menuItems[0].dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  });
  assert.equal(doc.activeElement, menuItems[1], 'ArrowDown moves real focus');
  view.unmount();
});

// ── DataTable: a row click must not fire from a control inside it ─────────

const ROWS = [{ id: 1, name: 'Widget' }];

test('DataTable: Enter on a button inside a row does not also open the row', () => {
  // The row handler is on the <tr>, and a keydown from a cell control bubbles
  // to it. Without a target check, tabbing to Delete and pressing Enter ran
  // Delete AND navigated the row open.
  let rowOpened = 0;
  let buttonPressed = 0;
  const view = render(
    <DataTable
      data={ROWS}
      rowKey="id"
      onRow={() => ({ onClick: () => { rowOpened += 1; } })}
      columns={[
        { key: 'name', title: 'Name', dataIndex: 'name' },
        {
          key: 'actions',
          title: 'Actions',
          render: () => <button type="button" onClick={() => { buttonPressed += 1; }}>Delete</button>,
        },
      ]}
    />,
  );
  try {
    const inner = view.container.querySelector('tbody button') as HTMLButtonElement;
    assert.ok(inner, 'the row has a control in it');
    const win = view.container.ownerDocument.defaultView as Window & typeof globalThis;
    act(() => {
      inner.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    assert.equal(rowOpened, 0, 'the row must not answer a key pressed on its child');

    // And the row itself still works when the key is genuinely its own.
    const row = view.container.querySelector('tbody tr') as HTMLTableRowElement;
    act(() => {
      row.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    assert.equal(rowOpened, 1, 'Enter on the row still opens it');
    assert.equal(buttonPressed, 0, 'and the synthetic keydown never clicked the button');
  } finally {
    view.unmount();
  }
});

test('DataTable: Space typed into a field in a row is not swallowed', () => {
  // preventDefault() on the row handler ate the space bar of any input in the
  // table, so a text field in a cell could not accept a space at all.
  let rowOpened = 0;
  const view = render(
    <DataTable
      data={ROWS}
      rowKey="id"
      onRow={() => ({ onClick: () => { rowOpened += 1; } })}
      columns={[
        { key: 'name', title: 'Name', render: () => <input aria-label="Note" /> },
      ]}
    />,
  );
  try {
    const field = view.container.querySelector('tbody input') as HTMLInputElement;
    const win = view.container.ownerDocument.defaultView as Window & typeof globalThis;
    const event = new win.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    act(() => { field.dispatchEvent(event); });
    assert.equal(event.defaultPrevented, false, 'the space must reach the field');
    assert.equal(rowOpened, 0, 'and must not open the row');
  } finally {
    view.unmount();
  }
});
