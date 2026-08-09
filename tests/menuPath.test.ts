import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  openMenuLevel, closeMenuBelow, resolveMenuLevels, clampMenuTop, menuPanelLeft,
  type MenuAnchor,
} from '../src/shell/menuPath';

/**
 * The rules every level of the start menu's flyouts goes through.
 *
 * The bug these replace: the 2nd level and the 3rd level were two separately
 * written mechanisms, and the second one had its own close timer that nothing
 * reliably cancelled — so a submenu could open and then be shut a moment later
 * by a timer armed while the pointer crossed a sibling row. There was no
 * mechanism at all for a 4th level.
 */

const at = (key: string, y = 0, left = 0): MenuAnchor => ({ key, y, left, flipped: false });

test('opening a submenu closes whatever branch was open below it', () => {
  const path = [at('Ops'), at('/g'), at('/g/x')];
  // Back up to the section row and pick a different section: levels 2 and 3
  // belonged to the old branch and go with it.
  assert.deepEqual(openMenuLevel(path, 0, at('HR')).map(a => a.key), ['HR']);
  // Same, one level in.
  assert.deepEqual(openMenuLevel(path, 1, at('/other')).map(a => a.key), ['Ops', '/other']);
});

test('there is no maximum depth', () => {
  let path: MenuAnchor[] = [];
  for (let d = 0; d < 8; d++) path = openMenuLevel(path, d, at(`level-${d}`));
  assert.equal(path.length, 8);
  assert.deepEqual(path.map(a => a.key), Array.from({ length: 8 }, (_, d) => `level-${d}`));
});

test('re-hovering the row that is already open changes nothing', () => {
  // Identity, not just equality: a new array would re-render the menu and
  // restart the panel's open animation while the pointer sits still on the row.
  const path = [at('Ops'), at('/g')];
  assert.equal(openMenuLevel(path, 1, at('/g')), path);
  assert.equal(closeMenuBelow(path, 2), path);
  assert.equal(closeMenuBelow(path, 5), path);
});

test('re-hovering an open row from further in retracts to it', () => {
  // Coming back left out of a grandchild onto the row that owns its parent:
  // the parent panel stays, the grandchild goes.
  const path = [at('Ops'), at('/g'), at('/g/x')];
  assert.deepEqual(openMenuLevel(path, 1, at('/g')).map(a => a.key), ['Ops', '/g']);
});

test('closing below a depth truncates to it', () => {
  const path = [at('Ops'), at('/g'), at('/g/x')];
  assert.deepEqual(closeMenuBelow(path, 1).map(a => a.key), ['Ops']);
  assert.deepEqual(closeMenuBelow(path, 0), []);
  // Leaving the root menu asks to close below depth -1; there is no such panel.
  assert.deepEqual(closeMenuBelow(path, -1), []);
});

interface Node { to: string; label: string; children?: Node[] }

const TREE: Node[] = [
  { to: '/a', label: 'Alpha' },
  {
    to: '/g', label: 'Group',
    children: [
      { to: '/g/x', label: 'Deep', children: [{ to: '/g/x/1', label: 'Deeper' }] },
    ],
  },
];
const kids = (item: Node) => item.children ?? [];

test('every open level resolves to its own item list', () => {
  const levels = resolveMenuLevels(TREE, [at('Ops'), at('/g'), at('/g/x')], kids);
  assert.deepEqual(levels.map(l => l.map(i => i.to)), [
    ['/a', '/g'],
    ['/g/x'],
    ['/g/x/1'],
  ]);
});

test('a path that no longer resolves degrades to the levels that do', () => {
  // Nav data swapped or a permission revoked under an open menu: show what is
  // still there rather than an empty panel hanging off the last good one.
  assert.equal(resolveMenuLevels(TREE, [at('Ops'), at('/gone'), at('/g/x')], kids).length, 1);
  assert.equal(resolveMenuLevels(TREE, [at('Ops'), at('/a')], kids).length, 1);
  assert.deepEqual(resolveMenuLevels([], [at('Ops')], kids), []);
  assert.deepEqual(resolveMenuLevels(TREE, [], kids), []);
});

test('a panel is centred on the row that opened it, inside the usable span', () => {
  assert.equal(clampMenuTop(300, 100, 8, 800), 250);
  // Would ride up over a top taskbar / off the bottom edge.
  assert.equal(clampMenuTop(20, 100, 8, 800), 8);
  assert.equal(clampMenuTop(790, 100, 8, 800), 700);
  // Taller than the span: pinned to the top of it and left to scroll.
  assert.equal(clampMenuTop(400, 2000, 8, 800), 8);
});

test('a panel flips to the left of its parent when there is no room right', () => {
  // Room: sits in the 4px gap to the right.
  assert.deepEqual(menuPanelLeft(100, 324, 224, 1280, 4), { left: 328, flipped: false });
  // No room — a deep branch, or a menu opened from a right-hand taskbar.
  assert.deepEqual(menuPanelLeft(1000, 1224, 224, 1280, 4), { left: 772, flipped: true });
});

test('a branch that has turned around keeps going left', () => {
  // The pin: with room on both sides, an unflipped parent opens right and a
  // flipped one opens left. Without that the chain ping-pongs, and every
  // second panel lands back on top of its grandparent.
  assert.deepEqual(menuPanelLeft(500, 724, 224, 1280, 4, false), { left: 728, flipped: false });
  assert.deepEqual(menuPanelLeft(500, 724, 224, 1280, 4, true), { left: 272, flipped: true });
  // Out of room on the left after all: back to the right rather than off-screen.
  assert.deepEqual(menuPanelLeft(20, 244, 224, 1280, 4, true), { left: 248, flipped: false });
});

test('a panel with room on neither side hugs the edge it was heading for', () => {
  assert.deepEqual(menuPanelLeft(40, 100, 224, 300, 4, false), { left: 68, flipped: false });
  assert.deepEqual(menuPanelLeft(40, 100, 224, 300, 4, true), { left: 8, flipped: true });
});
