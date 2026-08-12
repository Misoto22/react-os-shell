import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ColoredBadge from '../src/shell/ColoredBadge';
import StatusBadge, { StatusBadgeProvider, GROUP_COLORS } from '../src/shell/StatusBadge';

/**
 * The kit had two badges and no way to ask for a colour by name.
 *
 * `StatusBadge` takes a domain status STRING and maps it through a
 * consumer-supplied provider. `ColoredBadge` takes raw Tailwind classes. So a
 * consumer that already knows it wants "success" — a plain label, not an
 * entity status — had to hardcode `bg-green-100 text-green-800` at the call
 * site, which is the thing StatusBadge's docblock says it exists to prevent.
 *
 * `tone` reads the same table StatusBadge does. Two independently maintained
 * greens is how "the same concept always looks the same colour" quietly stops
 * being true.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const classOf = (markup: string) => /class="([^"]*)"/.exec(markup)?.[1] ?? '';

test('a tone resolves to the shared table', () => {
  for (const tone of ['success', 'warning', 'danger', 'info', 'neutral'] as const) {
    assert.match(classOf(html(<ColoredBadge tone={tone}>Paid</ColoredBadge>)), new RegExp(GROUP_COLORS[tone].split(' ')[0]), tone);
  }
});

test('a tone and the status that maps to it are the same colour', () => {
  // The promise. If these ever diverge, one of the two tables was edited.
  const byTone = classOf(html(<ColoredBadge tone="success">Paid</ColoredBadge>));
  const byStatus = classOf(html(
    <StatusBadgeProvider groups={{ paid: 'success' }}>
      <StatusBadge status="paid" />
    </StatusBadgeProvider>,
  ));
  for (const cls of GROUP_COLORS.success.split(' ')) {
    assert.ok(byTone.includes(cls), `tone: ${cls}`);
    assert.ok(byStatus.includes(cls), `status: ${cls}`);
  }
});

test('raw classes still win, and still work alone', () => {
  // The escape hatch has to stay usable — a colour the vocabulary has no name
  // for is a real case, and every existing caller passes this form.
  assert.match(classOf(html(<ColoredBadge colorClass="bg-purple-100 text-purple-800">Custom</ColoredBadge>)), /bg-purple-100/);
  assert.match(
    classOf(html(<ColoredBadge tone="success" colorClass="bg-purple-100 text-purple-800">Custom</ColoredBadge>)),
    /bg-purple-100/,
    'explicit beats semantic',
  );
});

test('neither given is neutral', () => {
  // `colorClass` used to be required, so this state could not be reached. It
  // must not render an unstyled pill.
  assert.match(classOf(html(<ColoredBadge>Unlabelled</ColoredBadge>)), /bg-gray-100/);
});

test('className is appended, not swallowed', () => {
  // A badge in a table cell needs alignment and tabular numerals from the call
  // site; there was no way to pass them.
  const cls = classOf(html(<ColoredBadge tone="info" className="ml-1 font-mono tabular-nums">7</ColoredBadge>));
  assert.match(cls, /ml-1/);
  assert.match(cls, /tabular-nums/);
  assert.match(cls, /bg-sky-100/, 'and the tone survives alongside it');
});

test('size and capitalize are unchanged', () => {
  assert.match(classOf(html(<ColoredBadge tone="neutral" size="xs">x</ColoredBadge>)), /text-\[10px\]/);
  assert.match(classOf(html(<ColoredBadge tone="neutral" capitalize>in_progress</ColoredBadge>)), /capitalize/);
});
