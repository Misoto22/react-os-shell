/**
 * The Cmd+Enter submit selector.
 *
 * `Modal.submitModal` falls back to `MODAL_SUBMIT_SELECTOR` whenever the window
 * has no `<form>` to `requestSubmit()`. Everything a consumer can do to mark a
 * button as "the submit" has to be in that string, and the consequence of a gap
 * is invisible: the button simply stops responding to the hotkey while its own
 * ⌘⏎ badge keeps advertising it. `.btn-submit` was exactly that gap until
 * 4.76.0.
 *
 * These specs pin the contract the portals rely on, including the one piece of
 * DOM semantics that reliably surprises people — a comma-separated
 * `querySelector` resolves in DOCUMENT order, not selector order.
 */

import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODAL_SUBMIT_SELECTOR } from '../src/shell/Modal';

/** Build a panel from raw markup and resolve it the way `submitModal` does. */
function pick(html: string): HTMLButtonElement | null {
  const panel = document.createElement('div');
  panel.innerHTML = html;
  const btn = panel.querySelector<HTMLButtonElement>(MODAL_SUBMIT_SELECTOR);
  return btn && !btn.disabled ? btn : null;
}

test('every explicit submit marker is matched', () => {
  for (const markup of [
    '<button type="submit">Create</button>',
    '<button data-submit>Confirm &amp; Post</button>',
    '<button class="btn-submit">Update</button>',
  ]) {
    assert.ok(pick(markup), `not matched: ${markup}`);
  }
});

test('.btn-submit alone is enough — no data-submit needed', () => {
  // The regression this file exists for. A button converted from a hardcoded
  // `bg-blue-600` fill to the themable utility keeps its hotkey.
  const btn = pick('<button class="btn-submit inline-flex items-center gap-2">Post</button>');
  assert.equal(btn?.textContent, 'Post');
});

test('the legacy colour heuristic still resolves', () => {
  // Consumers still ship plenty of it; dropping these would break Cmd+Enter on
  // every window that has not been converted yet.
  assert.equal(pick('<button class="bg-blue-600">Save</button>')?.textContent, 'Save');
  assert.equal(pick('<button class="bg-green-600">Approve</button>')?.textContent, 'Approve');
});

test('a disabled match is not clicked, and does not fall through to a later one', () => {
  // submitModal checks `!btn.disabled` on the FIRST match rather than searching
  // on, so a pending submit swallows the hotkey instead of firing whatever sits
  // behind it. Losing that would let Cmd+Enter double-submit.
  const btn = pick('<button type="submit" disabled>Creating…</button><button class="btn-submit">Other</button>');
  assert.equal(btn, null);
});

test('the earliest candidate in DOCUMENT order wins, not the earliest selector', () => {
  // `type="submit"` is listed first in the selector, but the `.btn-submit` here
  // comes first in the DOM — so it is the one that resolves.
  const btn = pick('<button class="btn-submit">First</button><button type="submit">Second</button>');
  assert.equal(btn?.textContent, 'First');
});

test('a non-button carrying the markers is ignored', () => {
  // Every entry is scoped to `button`, so an anchor or a div styled like a
  // submit cannot hijack the hotkey.
  assert.equal(pick('<a class="btn-submit" href="#">Link</a><div data-submit>Div</div>'), null);
});
