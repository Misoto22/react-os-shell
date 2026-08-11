import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Button from '../src/forms/Button';
import Input from '../src/forms/Input';
import TileButton from '../src/forms/TileButton';
import NumericKeypad from '../src/forms/NumericKeypad';
import Card from '../src/shell/Card';
import Banner from '../src/shell/Banner';
import LoadingSpinner from '../src/shell/Spinner';
import { INPUT_BASE, inputClasses } from '../src/forms/styles';

/**
 * 4.17.0 added a touch scale and several new axes to primitives that three
 * production portals already render. The rule for every one of them was that
 * the existing default must come out byte-identical, so the whole batch is
 * invisible to anyone who does not opt in.
 *
 * That is not a claim you can eyeball. `Button` alone gained three size rungs,
 * a prop that changes its DOM shape, and a hook call; `INPUT_BASE` was taken
 * apart into three fragments and reassembled. Each of these specs pins the
 * untouched path by EQUALITY against the explicit default — the assertion that
 * fails if a "harmless" reordering changes one space.
 *
 * The literals below are captured from 4.16.0. If one needs updating, that is
 * the signal to check every consuming portal, not to update the literal.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// ── Nothing existing moved ────────────────────────────────────────────────

test('Button: the desktop sizes are exactly what they were', () => {
  assert.match(html(<Button size="sm">x</Button>), /class="[^"]*gap-1 px-2\.5 py-1 text-xs/);
  assert.match(html(<Button size="md">x</Button>), /class="[^"]*gap-1\.5 px-3 py-1\.5 text-sm/);
});

test('Button: omitting size is identical to asking for md', () => {
  assert.equal(html(<Button>Save</Button>), html(<Button size="md">Save</Button>));
});

test('Button: disabledReason on an ENABLED button changes nothing', () => {
  // Safe to pass unconditionally — that is the point, callers should not have
  // to gate it on the same condition twice.
  assert.equal(html(<Button disabledReason="nope">Save</Button>), html(<Button>Save</Button>));
});

test('INPUT_BASE is byte-identical after being split into fragments', () => {
  assert.equal(
    INPUT_BASE,
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 ' +
      'placeholder:text-gray-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30',
  );
  assert.equal(inputClasses(), inputClasses({ size: 'md' }));
});

test('Card, Banner and Spinner defaults are unchanged', () => {
  assert.equal(html(<Card padding="md">b</Card>), html(<Card>b</Card>));
  assert.equal(html(<Card padding="none">b</Card>), html(<Card padded={false}>b</Card>));
  assert.equal(html(<Banner emphasis="subtle">m</Banner>), html(<Banner>m</Banner>));
  assert.equal(html(<Banner sticky={false}>m</Banner>), html(<Banner>m</Banner>));
  // A bare ring must NOT gain role="status" — that would change the a11y tree
  // for every existing caller, none of which passes a label.
  assert.doesNotMatch(html(<LoadingSpinner />), /role="status"/);
});

// ── The new surface ───────────────────────────────────────────────────────

test('Button: the touch scale is 56 / 64 / 80px', () => {
  assert.match(html(<Button size="touch">x</Button>), /h-14/);
  assert.match(html(<Button size="touch-lg">x</Button>), /h-16/);
  assert.match(html(<Button size="touch-xl">x</Button>), /h-20/);
});

test('Button: a disabled reason is on-screen text, never a title attribute', () => {
  // The whole reason this prop exists. A tooltip needs a hover; a touchscreen
  // has none; a cashier facing a dead button with no explanation calls someone.
  const out = html(<Button disabled disabledReason="No connection to the server">Charge</Button>);
  assert.doesNotMatch(out, /title=/);
  assert.match(out, /No connection to the server/);
  assert.match(out, /aria-describedby=/);
});

test('Button: loading counts as disabled for the reason', () => {
  assert.match(html(<Button loading disabledReason="Working">Charge</Button>), /Working/);
});

test('inputClasses: the touch size swaps the size triple rather than adding to it', () => {
  const touch = inputClasses({ size: 'touch' });
  // Exactly one horizontal padding and one text size — two of either would be
  // resolved by compiled-stylesheet order, which nothing here controls.
  assert.equal((touch.match(/(?:^|\s)px-\d/g) ?? []).length, 1);
  assert.equal((touch.match(/(?:^|\s)text-(?:xs|sm|base|lg)/g) ?? []).length, 1);
  assert.match(touch, /h-14/);
  assert.doesNotMatch(touch, /py-1\.5/);
});

test('Input: inputMode reaches the DOM, so a keypad can suppress the OS keyboard', () => {
  assert.match(html(<Input inputMode="none" />), /inputmode="none"/i);
});

test('Banner: solid emphasis is a saturated bar, and sticky keeps its place in flow', () => {
  const solid = html(<Banner tone="danger" emphasis="solid" sticky>Offline</Banner>);
  assert.match(solid, /bg-red-700/);
  assert.match(solid, /sticky top-0/);
  assert.match(solid, /role="alert"/);
  // Not the pale panel a form error uses.
  assert.doesNotMatch(solid, /bg-red-50/);
});

test('Card: lg padding scales the header and footer with the body', () => {
  const out = html(<Card padding="lg" header="H" footer="F">b</Card>);
  assert.match(out, /p-6/);
  assert.match(out, /px-6 py-4/);
  assert.doesNotMatch(out, /px-4 py-3/);
});

test('Spinner: a label makes it a status', () => {
  const out = html(<LoadingSpinner label="Signing in…" />);
  assert.match(out, /role="status"/);
  assert.match(out, /Signing in/);
});

test('NumericKeypad: three columns, a backspace, and Enter only when wired', () => {
  const bare = html(<NumericKeypad value="" onChange={() => {}} />);
  assert.match(bare, /grid-cols-3/);
  assert.match(bare, /aria-label="Backspace"/);
  assert.doesNotMatch(bare, /col-span-3/);

  const withEnter = html(<NumericKeypad value="" onChange={() => {}} onEnter={() => {}} enterLabel="Tender" />);
  assert.match(withEnter, /col-span-3/);
  assert.match(withEnter, /Tender/);
});

test('NumericKeypad: keys are the 80px rung — the most-tapped control in a till', () => {
  assert.match(html(<NumericKeypad value="" onChange={() => {}} />), /h-20/);
});

test('TileButton: fixed height and left-aligned, so a grid of them lines up', () => {
  const out = html(<TileButton title="Wheel 18in" subtitle="$420.00" />);
  assert.match(out, /h-32/);
  assert.match(out, /text-left/);
  assert.match(out, /type="button"/);
  assert.match(out, /\$420\.00/);
  assert.match(html(<TileButton title="x" selected />), /aria-pressed="true"/);
});
