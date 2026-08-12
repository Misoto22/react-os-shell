import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, act } from './dom';
import Button from '../src/forms/Button';
import IconButton from '../src/forms/IconButton';
import DatePicker from '../src/forms/DatePicker';

/**
 * 4.22.0 adds two controls the dealer portal needs and the kit did not have.
 *
 * Both are additive, but one of them reached into an existing file: `Button`'s
 * `BASE` and `VARIANTS` became `BUTTON_BASE`/`BUTTON_VARIANTS` so `IconButton`
 * can share them instead of copying. Three production portals render `Button`,
 * so the first spec here pins its output — a rename is exactly the kind of
 * change that looks free and is not.
 *
 * The DatePicker specs are almost all about one bug wearing different hats:
 * `new Date('2026-08-11')` is UTC midnight, which is the 10th anywhere west of
 * Greenwich, and `toISOString()` on a locally-built Date is the previous day
 * anywhere east of it. Every crossing of that boundary is a day-off bug that
 * only shows up for users in some timezones, which is the worst kind to find
 * in production.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const classOf = (markup: string) => markup.match(/class="([^"]*)"/)?.[1] ?? '';

// ── Button did not move ───────────────────────────────────────────────────

test('Button: renaming its internal constants changed nothing it renders', () => {
  assert.match(html(<Button size="sm">x</Button>), /class="[^"]*gap-1 px-2\.5 py-1 text-xs/);
  assert.match(html(<Button size="md">x</Button>), /class="[^"]*gap-1\.5 px-3 py-1\.5 text-sm/);
  assert.match(html(<Button variant="danger">x</Button>), /bg-red-600 text-white/);
  assert.equal(html(<Button>Save</Button>), html(<Button size="md" variant="primary">Save</Button>));
});

// ── IconButton ────────────────────────────────────────────────────────────

test('IconButton: square at every rung, matching Button height for height', () => {
  const rungs = [
    ['sm', 'h-6 w-6'],
    ['md', 'h-8 w-8'],
    ['touch-sm', 'h-11 w-11'],
    ['touch', 'h-14 w-14'],
    ['touch-lg', 'h-16 w-16'],
    ['touch-xl', 'h-20 w-20'],
  ] as const;
  for (const [size, expected] of rungs) {
    assert.match(
      classOf(html(<IconButton size={size} aria-label="Actions">i</IconButton>)),
      new RegExp(expected.replace(/-/g, '\\-')),
      `${size} should be ${expected}`,
    );
  }
});

test('IconButton: exactly one padding utility reaches the class attribute', () => {
  // The failure this guards is invisible in review: two competing px-*
  // utilities both survive into the attribute, and which one applies is
  // decided by compiled-stylesheet order rather than by the order they were
  // written. It would render one size or the other essentially at random, and
  // look correct in whichever one the reviewer happened to see.
  for (const size of ['sm', 'md', 'touch', 'touch-xl'] as const) {
    const padding = classOf(html(<IconButton size={size} aria-label="Actions">i</IconButton>))
      .split(' ')
      .filter(c => /^p[xy]?-/.test(c));
    assert.deepEqual(padding, ['p-0'], `${size} should carry one padding utility`);
  }
});

test('IconButton: the label reaches the DOM', () => {
  // The prop is required at the type level; this is the runtime half of that
  // promise — a required prop that is silently dropped is worse than no prop.
  assert.match(html(<IconButton aria-label="Close dialog">x</IconButton>), /aria-label="Close dialog"/);
});

test('IconButton: defaults to ghost, where Button defaults to primary', () => {
  const bare = html(<IconButton aria-label="Actions">i</IconButton>);
  assert.equal(bare, html(<IconButton variant="ghost" aria-label="Actions">i</IconButton>));
  assert.doesNotMatch(bare, /bg-blue-600/);
});

test('IconButton: type defaults to button, so it never submits a form by accident', () => {
  assert.match(html(<IconButton aria-label="Actions">i</IconButton>), /type="button"/);
});

// ── DatePicker: the timezone boundary ─────────────────────────────────────

test('DatePicker: an ISO string is passed through, never round-tripped', () => {
  // Round-tripping through `new Date('2026-08-11')` would land on the 10th for
  // every user west of Greenwich. The short-circuit that prevents it looks like
  // an optimisation, so this is the spec that fails if someone removes it.
  assert.match(html(<DatePicker value="2026-08-11" />), /value="2026-08-11"/);
});

test('DatePicker: a Date is serialised from its LOCAL calendar fields', () => {
  // Local midnight on the 11th. Through toISOString() this is the 10th for
  // anyone east of Greenwich.
  assert.match(html(<DatePicker value={new Date(2026, 7, 11)} />), /value="2026-08-11"/);
});

test('DatePicker: min and max normalise exactly as value does', () => {
  const markup = html(<DatePicker value={null} min="2026-01-01" max={new Date(2026, 11, 31)} />);
  assert.match(markup, /min="2026-01-01"/);
  assert.match(markup, /max="2026-12-31"/);
});

test('DatePicker: absent bounds emit no attribute rather than an empty one', () => {
  const markup = html(<DatePicker value={null} />);
  assert.doesNotMatch(markup, /min="/);
  assert.doesNotMatch(markup, /max="/);
});

test('DatePicker: no value is an empty field, never the text "null"', () => {
  assert.match(html(<DatePicker value={null} />), /value=""/);
  assert.doesNotMatch(html(<DatePicker />), /value="(null|undefined|Invalid Date)"/);
  assert.match(html(<DatePicker value={new Date('nonsense')} />), /value=""/);
});

test('DatePicker: touch uses the kit ladder, and md is the untouched default', () => {
  assert.match(classOf(html(<DatePicker size="touch" />)), /h-14 px-4 text-base/);
  assert.equal(html(<DatePicker />), html(<DatePicker size="md" />));
});

test('DatePicker: invalid gets the same error treatment as Input', () => {
  assert.match(classOf(html(<DatePicker invalid />)), /border-red-300/);
});

// ── DatePicker: what it hands back ────────────────────────────────────────

/**
 * Set an input's value the way a browser does, so React's own onChange fires.
 * Assigning `.value` directly is invisible to React — it tracks the last value
 * it wrote and skips the event as a no-op.
 */
function setValue(input: HTMLInputElement, next: string) {
  const proto = Object.getPrototypeOf(input) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) throw new Error('no native value setter on the input prototype');
  setter.call(input, next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * A genuinely controlled harness, which this needs to be.
 *
 * Rendering `<DatePicker value={null}>` with a fixed prop makes React write ''
 * back into the DOM after every change, so a later "clear the field" writes ''
 * over '' — no change, no event, and the spec passes or fails for a reason
 * that has nothing to do with the component.
 */
function Harness({ onReport }: { onReport: (value: Date | null) => void }) {
  const [value, setValue] = useState<Date | null>(null);
  return (
    <DatePicker
      value={value}
      onChange={next => {
        setValue(next);
        onReport(next);
      }}
    />
  );
}

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const reported: (Date | null)[] = [];
  act(() => {
    root.render(<Harness onReport={v => reported.push(v)} />);
  });
  const input = host.querySelector('input') as HTMLInputElement;
  return {
    input,
    reported,
    unmount: () => {
      act(() => { root.unmount(); });
      host.remove();
    },
  };
}

test('DatePicker: reports the chosen day at LOCAL midnight', () => {
  const { input, reported, unmount } = mount();
  act(() => { setValue(input, '2026-08-11'); });

  const got = reported.at(-1);
  assert.ok(got instanceof Date);
  // Read back as local fields. Asserting on toISOString() here would encode the
  // machine's timezone into the spec and pass only in UTC.
  assert.equal(got.getFullYear(), 2026);
  assert.equal(got.getMonth(), 7);
  assert.equal(got.getDate(), 11);
  assert.equal(got.getHours(), 0);
  unmount();
});

test('DatePicker: a cleared field is reported as no date', () => {
  const { input, reported, unmount } = mount();
  act(() => { setValue(input, '2026-08-11'); });
  act(() => { setValue(input, ''); });
  assert.equal(reported.at(-1), null);
  unmount();
});
