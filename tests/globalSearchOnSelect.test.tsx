import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, pressKey, act } from './dom';
import GlobalSearch, { type SearchResult } from '../src/shell/GlobalSearch';

/**
 * GlobalSearch stopped importing the window manager, so it can live in
 * `react-os-shell/ui`.
 *
 * The import was there for one line — opening the chosen result. The hook is
 * only a `useContext` and would not have thrown without a provider, so nothing
 * about this was a runtime failure; an import is resolved statically, and that
 * one line pulled WindowManager, react-query and axios into the module graph of
 * anything containing the overlay.
 *
 * Three production portals render this through `Layout`, which now passes
 * `openEntity` in. These specs cover both halves: that a caller's `onSelect`
 * receives the result, and that the overlay survives having none.
 */

const RESULTS: SearchResult[] = [
  { type: 'Sales Order', label: 'SO-21371', sub: 'INOVIT Pty Ltd', entity_type: 'sales_order', entity_id: '21371' },
  { type: 'Part Number', label: '00620L6N25', sub: 'Force 6', entity_type: 'part_number', entity_id: 'pn-1' },
];

const provider = async () => RESULTS;

/** The debounce is 250ms of real time; there is no fake clock in this runner. */
const settle = async () => {
  await act(async () => { await new Promise(r => setTimeout(r, 320)); });
};

function typeInto(input: HTMLInputElement, text: string) {
  const proto = Object.getPrototypeOf(input) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) throw new Error('no native value setter on the input prototype');
  setter.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function openWithResults(onSelect?: (r: SearchResult) => void) {
  const view = render(<GlobalSearch providers={[provider]} onSelect={onSelect} />);
  pressKey('k', { meta: true });
  const input = view.container.ownerDocument.querySelector('input') as HTMLInputElement;
  assert.ok(input, 'the overlay should be open after ⌘K');
  act(() => { typeInto(input, 'SO-21'); });
  await settle();
  return { view, input };
}

test('GlobalSearch: ⌘K opens it, Escape closes it', async () => {
  const view = render(<GlobalSearch providers={[provider]} />);
  assert.equal(view.container.ownerDocument.querySelector('input'), null, 'closed to begin with');

  pressKey('k', { meta: true });
  assert.ok(view.container.ownerDocument.querySelector('input'), 'open after ⌘K');

  pressKey('Escape');
  assert.equal(view.container.ownerDocument.querySelector('input'), null, 'closed after Escape');
  view.unmount();
});

test('GlobalSearch: Enter hands the chosen result to onSelect', async () => {
  const chosen: SearchResult[] = [];
  const { view, input } = await openWithResults(r => chosen.push(r));

  pressKey('Enter', { target: input });

  assert.equal(chosen.length, 1);
  assert.equal(chosen[0].label, 'SO-21371');
  // The whole result, not a flattened pair: a routed consumer needs fields the
  // window registry never cared about.
  assert.equal(chosen[0].entity_type, 'sales_order');
  assert.equal(chosen[0].entity_id, '21371');
  view.unmount();
});

test('GlobalSearch: choosing a result closes the overlay', async () => {
  const { view, input } = await openWithResults(() => {});
  pressKey('Enter', { target: input });
  assert.equal(view.container.ownerDocument.querySelector('input'), null);
  view.unmount();
});

test('GlobalSearch: with no onSelect, choosing a result just closes', async () => {
  // The prop is optional, so this must not throw. A search with nowhere to go
  // is a legitimate state — it is what the overlay does before a consumer has
  // wired navigation.
  const { view, input } = await openWithResults(undefined);
  assert.doesNotThrow(() => { pressKey('Enter', { target: input }); });
  assert.equal(view.container.ownerDocument.querySelector('input'), null);
  view.unmount();
});

test('GlobalSearch: the source no longer imports the window manager', () => {
  // The reason this component can be in the kit at all. `uiEntryIsPeerFree`
  // proves the barrel as a whole; this names the single import whose return
  // would silently undo it, which is the one a future edit is likely to add
  // back for convenience.
  // Specs are transpiled into node_modules/.cache before they run, so
  // `import.meta.dirname` is the build output, not tests/. Same resolution as
  // uiBarrelMatchesRoot.test.ts, which reads source for the same reason.
  const ROOT = process.env.REPO_ROOT ?? resolve(import.meta.dirname, '..', '..', '..');
  const source = readFileSync(join(ROOT, 'src/shell/GlobalSearch.tsx'), 'utf8');
  // The import statement and the call, not the word: the docblock above the
  // component explains this decision by name, and an assertion that forbids
  // mentioning it would forbid documenting it.
  assert.doesNotMatch(source, /^\s*import[^\n]*WindowManager/m);
  assert.doesNotMatch(source, /useWindowManager\s*\(/);
});
