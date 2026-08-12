import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from './dom';
import Switch from '../src/forms/Switch';

/**
 * Switch could not be a form field.
 *
 * A form library hands a field three things: a change handler, a name, and a
 * ref it uses to move focus there when validation fails. Only the first had
 * anywhere to go — which contradicts `.design-sync/conventions.md`, where the
 * kit's controls are documented as dropping into react-hook-form.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('Switch: the caller receives the control', () => {
  const seen: (HTMLButtonElement | null)[] = [];
  const view = render(<Switch checked={false} onChange={() => {}} ref={el => { seen.push(el); }} />);

  const node = seen.find(Boolean);
  assert.ok(node, 'the forwarded ref should receive the button');
  assert.equal(node.getAttribute('role'), 'switch', 'and it is the control itself, not a wrapper');
  view.unmount();
});

test('Switch: the ref points at the control even inside a label row', () => {
  // With a label the button is nested in a wrapper span. The ref must still be
  // the thing focus should land on.
  const seen: (HTMLButtonElement | null)[] = [];
  const view = render(<Switch checked onChange={() => {}} label="Default address" ref={el => { seen.push(el); }} />);
  const node = seen.find(Boolean);
  assert.ok(node);
  assert.equal(node.getAttribute('role'), 'switch');
  view.unmount();
});

test('Switch: native attributes reach the button', () => {
  const markup = html(<Switch checked={false} onChange={() => {}} name="is_default" data-testid="default-toggle" />);
  assert.match(markup, /name="is_default"/);
  assert.match(markup, /data-testid="default-toggle"/);
});

test('Switch: what it rendered before is unchanged', () => {
  // Three portals render this; the spread and the ref must be invisible to
  // anyone not using them.
  assert.match(
    html(<Switch checked onChange={() => {}} label="Email me" hint="Order updates only." />),
    /role="switch"[\s\S]*aria-checked="true"/,
  );
  assert.match(html(<Switch checked={false} onChange={() => {}} />), /bg-gray-300/);
  assert.match(html(<Switch checked onChange={() => {}} />), /bg-blue-600/);
});
