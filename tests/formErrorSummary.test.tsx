/**
 * FormErrorSummary — the map a multi-error form was missing. Contracts:
 *
 *  - empty errors render nothing, so the box can sit permanently above a form;
 *  - the box takes focus when errors APPEAR, and does not re-steal it on
 *    re-renders while the user works through the list;
 *  - each message is a link that moves focus to the control with that id;
 *  - the heading comes from the strings catalog unless overridden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// First, and before anything that touches `src/` — see `dom.ts`.
import { act, render } from './dom';
import FormErrorSummary from '../src/forms/FormErrorSummary';

test('empty renders nothing; errors render a focused alert box', async () => {
  const view = render(<FormErrorSummary errors={[]} />);
  assert.equal(view.container.innerHTML, '');

  view.rerender(
    <FormErrorSummary errors={[{ fieldId: 'email', message: 'Enter your email address' }]} />,
  );
  const box = view.container.querySelector('[role="alert"]') as HTMLElement;
  assert.ok(box);
  assert.equal(document.activeElement, box, 'the box takes focus when errors appear');
  assert.match(box.textContent!, /There is a problem/);
  assert.match(box.textContent!, /Enter your email address/);
  await act(async () => { view.unmount(); });
});

test('a link focuses its field; re-renders do not re-steal focus', async () => {
  const view = render(
    <div>
      <FormErrorSummary errors={[{ fieldId: 'qty', message: 'Enter a quantity' }]} />
      <input id="qty" />
    </div>,
  );
  const link = view.container.querySelector('a')!;
  act(() => { link.click(); });
  assert.equal((document.activeElement as HTMLElement).id, 'qty', 'the link focuses the control');

  // A re-render with the SAME error must not yank focus back to the box.
  view.rerender(
    <div>
      <FormErrorSummary errors={[{ fieldId: 'qty', message: 'Enter a quantity' }]} />
      <input id="qty" />
    </div>,
  );
  assert.equal((document.activeElement as HTMLElement).id, 'qty', 'focus stays where the user put it');
  await act(async () => { view.unmount(); });
});

test('the heading is overridable, and autoFocus can be declined', async () => {
  const view = render(
    <FormErrorSummary
      errors={[{ fieldId: 'a', message: 'Nope' }]}
      title="Fix these first"
      autoFocus={false}
    />,
  );
  assert.match(view.container.textContent!, /Fix these first/);
  assert.notEqual(document.activeElement, view.container.querySelector('[role="alert"]'));
  await act(async () => { view.unmount(); });
});
