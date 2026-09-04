/**
 * A status a consumer did not name still has to read properly.
 *
 * `StatusBadge` derived its text from the raw status — underscores to spaces,
 * title case — with no way to override it. That is right for a status this
 * system named. It is wrong for one that arrived from somewhere else: Stripe's
 * `trialing` reads as "Trialing" rather than "Trial", and its `canceled` puts
 * an American spelling in front of a British-English tenant.
 *
 * A consumer that needed one word changed had to abandon the badge and
 * hand-roll the pill — and took the colours with it. In admin-portal that is
 * five files, each carrying its own status→colour literals, which is exactly
 * the drift this component exists to prevent (`70-ui-rules.md` UI-7).
 *
 * The tone must keep coming from `status`, so the group mapping stays the one
 * source of truth for colour whatever is written on the pill. That is the
 * second test, and it is the one that matters.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './dom';
import StatusBadge, { StatusBadgeProvider, GROUP_COLORS } from '../src/shell/StatusBadge';

const GROUPS = { trialing: 'success', canceled: 'neutral', overdue: 'danger' } as const;

const withGroups = (node: React.ReactNode) =>
  render(<StatusBadgeProvider groups={GROUPS}>{node}</StatusBadgeProvider>);

test('a label replaces the derived text', () => {
  const view = withGroups(<StatusBadge status="trialing" label="Trial" />);
  assert.equal(view.container.textContent, 'Trial');
  view.unmount();
});

test('the COLOUR still comes from the status, not the label', () => {
  // The whole point. A pill may say anything and must still be the colour its
  // group says — otherwise the label prop becomes a second way to drift.
  const view = withGroups(<StatusBadge status="overdue" label="Well overdue" />);
  const pill = view.container.querySelector('span')!;
  for (const cls of GROUP_COLORS.danger.split(' ')) {
    assert.ok(pill.className.includes(cls), `expected ${cls} from the danger group`);
  }
  view.unmount();
});

test('without a label the derived text is unchanged', () => {
  const view = withGroups(<StatusBadge status="canceled" />);
  assert.equal(view.container.textContent, 'Canceled');
  view.unmount();
});

test('an underscored status still title-cases when no label is given', () => {
  const view = withGroups(<StatusBadge status="past_due" />);
  assert.equal(view.container.textContent, 'Past Due');
  view.unmount();
});

test('an empty-string label is honoured rather than falling back', () => {
  // `??` and not `||`: a consumer rendering an icon-only pill asks for no text
  // and must not silently get the raw status back.
  const view = withGroups(<StatusBadge status="canceled" label="" />);
  assert.equal(view.container.textContent, '');
  view.unmount();
});

test('an unmapped status is still neutral, labelled or not', () => {
  const view = withGroups(<StatusBadge status="who_knows" label="Unknown" />);
  const pill = view.container.querySelector('span')!;
  for (const cls of GROUP_COLORS.neutral.split(' ')) {
    assert.ok(pill.className.includes(cls));
  }
  view.unmount();
});
