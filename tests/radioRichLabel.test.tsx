import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './dom';
import Radio from '../src/forms/Radio';

test('Radio: rich label content can shrink inside a fixed-width card', () => {
  const view = render(
    <Radio
      checked={false}
      onChange={() => {}}
      label={<span className="truncate">A reference that is wider than its card</span>}
    />,
  );
  const input = view.container.querySelector('input')!;
  const content = input.nextElementSibling as HTMLElement;
  const label = content.firstElementChild as HTMLElement;

  assert.match(content.className, /\bmin-w-0\b/, 'the flex item must be allowed to shrink');
  assert.match(content.className, /\bflex-1\b/, 'the content should use the card width left after the radio');
  assert.match(label.className, /\bblock\b/, 'the rich label needs a bounded block formatting context');
  assert.match(label.className, /\bmin-w-0\b/);

  view.unmount();
});
