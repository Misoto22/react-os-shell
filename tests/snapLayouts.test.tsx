/**
 * Snap layouts picker — rest on (or focus) the maximize button and the snap
 * zones appear as click targets. Pure UI over the snapping module: the same
 * calcSnapBox geometry the drag-to-edge gesture and Ctrl/Cmd+arrows reach.
 *
 * Contracts: the palette opens on focus after the hover delay and lists all
 * six zones; clicking one snaps the panel to that zone's box and saves the
 * pre-snap box (so Ctrl+Down restores it — the same contract as every other
 * snap path); blurring closes the palette.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// First, and before anything that touches `src/` — see `dom.ts`.
import { act, render, pressKey } from './dom';
import Modal from '../src/shell/Modal';

const settle = (ms: number) => act(async () => { await new Promise(r => setTimeout(r, ms)); });

function maximizeButton() {
  return document.querySelector<HTMLButtonElement>('button[title="Maximize"]')!;
}
function palette() {
  return document.querySelector<HTMLElement>('[role="group"][aria-label="Snap layouts"]');
}

test('focus opens the palette; a zone click snaps and stays restorable', async () => {
  const view = render(<Modal open onClose={() => {}} title="Orders">body</Modal>);
  const panel = document.querySelector<HTMLElement>('[data-window-chrome]')!.parentElement!;
  const w0 = parseFloat(panel.style.width);

  act(() => { maximizeButton().focus(); });
  assert.equal(palette(), null, 'not yet — the open delay debounces a pass-through');
  await settle(400);
  const box = palette();
  assert.ok(box, 'the palette opens after the delay');
  assert.equal(box!.querySelectorAll('button').length, 6, 'halves and quarters');

  act(() => { box!.querySelector<HTMLButtonElement>('button[aria-label="Snap left half"]')!.click(); });
  assert.equal(parseFloat(panel.style.left), 0);
  assert.equal(parseFloat(panel.style.width), Math.floor(window.innerWidth / 2));

  // Same restore contract as a snap-drop and the keyboard path.
  const chrome = document.querySelector<HTMLElement>('[data-window-chrome]')!;
  pressKey('ArrowDown', { ctrl: true, target: chrome });
  assert.equal(parseFloat(panel.style.width), w0, 'Ctrl+Down restores the pre-snap box');
  await act(async () => { view.unmount(); });
});

test('a quarter zone gets a quarter box; blur closes the palette', async () => {
  const view = render(<Modal open onClose={() => {}} title="Orders">body</Modal>);
  const panel = document.querySelector<HTMLElement>('[data-window-chrome]')!.parentElement!;

  act(() => { maximizeButton().focus(); });
  await settle(400);
  act(() => { palette()!.querySelector<HTMLButtonElement>('button[aria-label="Snap bottom-right quarter"]')!.click(); });
  assert.equal(parseFloat(panel.style.left), Math.floor(window.innerWidth / 2));
  assert.equal(parseFloat(panel.style.top), Math.floor(window.innerHeight / 2));

  // The button KEPT focus through the zone click (a click() moves no focus in
  // jsdom), so blur first — a second focus() on the focused element fires no
  // event at all.
  act(() => { maximizeButton().blur(); });
  await settle(250);
  act(() => { maximizeButton().focus(); });
  await settle(400);
  assert.ok(palette(), 'reopened');
  act(() => { maximizeButton().blur(); });
  await settle(300);
  assert.equal(palette(), null, 'blur closes it after the grace period');
  await act(async () => { view.unmount(); });
});
