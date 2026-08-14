/**
 * ShellStrings — the shell's user-facing strings in one typed catalog.
 * The contracts pinned here:
 *
 *  - NO provider means the English defaults — nothing about 4.63.0's markup
 *    changes for an app that never mounts the provider;
 *  - an override merges per SECTION, so translating one string does not
 *    blank out its neighbours;
 *  - a caller's own prop (DataTable `emptyText`) beats the catalog — the
 *    catalog replaces hardcoded defaults, never a caller's words.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// First, and before anything that touches `src/` — see `dom.ts`.
import './dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShellStringsProvider } from '../src/shell/strings';
import DataTable from '../src/data/DataTable';
import LogoutAnimation from '../src/shell/LogoutAnimation';
import TagInput from '../src/forms/TagInput';

const COLS = [{ key: 'a', title: 'A', dataIndex: 'a' as const }];

test('no provider: the English defaults render exactly as before', () => {
  const markup = renderToStaticMarkup(<DataTable columns={COLS} data={[]} rowKey="a" />);
  assert.match(markup, /Nothing to show/);
  const logout = renderToStaticMarkup(<LogoutAnimation onComplete={() => {}} />);
  assert.match(logout, />Goodbye</);
  assert.match(logout, />See you next time</);
});

test('a partial override reaches the components, and its section keeps its other defaults', () => {
  const markup = renderToStaticMarkup(
    <ShellStringsProvider value={{ table: { empty: '没有数据' }, logout: { goodbye: '再见' } }}>
      <>
        <DataTable columns={COLS} data={[]} rowKey="a" />
        <LogoutAnimation onComplete={() => {}} />
      </>
    </ShellStringsProvider>,
  );
  assert.match(markup, /没有数据/);
  assert.match(markup, />再见</);
  // The logout section's OTHER string was not overridden and must survive.
  assert.match(markup, />See you next time</);
});

test('a caller prop always beats the catalog', () => {
  const markup = renderToStaticMarkup(
    <ShellStringsProvider value={{ table: { empty: '没有数据' } }}>
      <DataTable columns={COLS} data={[]} rowKey="a" emptyText="Custom empty" />
    </ShellStringsProvider>,
  );
  assert.match(markup, /Custom empty/);
  assert.doesNotMatch(markup, /没有数据/);
});

test('chip remove labels come from the catalog', () => {
  const markup = renderToStaticMarkup(
    <ShellStringsProvider value={{ select: { remove: 'Entfernen' } }}>
      <TagInput value={['x']} onChange={() => {}} options={[{ value: 'x', label: 'X' }]} />
    </ShellStringsProvider>,
  );
  assert.match(markup, /aria-label="Entfernen X"/);
});
