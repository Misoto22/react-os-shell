/**
 * SearchableSelect portals its option menu into the document body. The menu
 * must keep the same width as its trigger: option copy is content, not layout,
 * and long user names or email addresses must not resize the form control.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, render } from './dom';
import SearchableSelect from '../src/shell/SearchableSelect';

test('the option menu matches the trigger width and truncates long copy', async () => {
  const view = render(
    <SearchableSelect
      value=""
      onChange={() => {}}
      options={[
        {
          value: 'long',
          label: 'ci-smoke@efficient-erp.com',
          sublabel: 'ci-smoke@efficient-erp.com',
        },
      ]}
    />,
  );
  const trigger = view.container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  trigger.getBoundingClientRect = () => ({
    x: 100,
    y: 40,
    left: 100,
    top: 40,
    right: 420,
    bottom: 80,
    width: 320,
    height: 40,
    toJSON: () => ({}),
  });

  act(() => { trigger.focus(); });

  try {
    const menu = document.querySelector<HTMLElement>('div.fixed')!;
    assert.equal(menu.style.width, '320px');
    assert.equal(menu.style.minWidth, '320px');
    assert.match(menu.querySelector('button')!.className, /overflow-hidden/);
    const [label, sublabel] = [...menu.querySelectorAll('button span')];
    assert.match(label.className, /truncate/);
    assert.match(sublabel.className, /truncate/);
  } finally {
    await act(async () => { view.unmount(); });
  }
});
