import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { render } from './dom';
import Input from '../src/forms/Input';
import Textarea from '../src/forms/Textarea';
import DatePicker from '../src/forms/DatePicker';
import Select, { NativeSelect } from '../src/forms/Select';

/**
 * `invalid` painted the control red and told assistive technology nothing.
 *
 * Four of the six form controls set no `aria-invalid` at all — `Input`,
 * `Textarea`, `DatePicker` and the native `Select` — while `InputNumber` and
 * the listbox `Select` trigger did. That split is what makes it an oversight
 * rather than a decision: the same prop meant two different things depending
 * on which control you reached for. A sighted user saw a red border; a screen
 * reader user was told the field was fine (WCAG 3.3.1).
 *
 * The second half is `Select`'s naming. `aria-describedby` — the attribute that
 * points at the error message — reached only the `sr-only` <select> behind the
 * trigger, through the props spread. Focus lands on the trigger, so the message
 * was announced to nobody.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const OPTIONS = [{ value: 'syd', label: 'Sydney' }];

test('every text control announces an invalid value', () => {
  assert.match(html(<Input invalid />), /aria-invalid="true"/);
  assert.match(html(<Textarea invalid />), /aria-invalid="true"/);
  assert.match(html(<DatePicker invalid onChange={() => {}} />), /aria-invalid="true"/);
  assert.match(
    html(<NativeSelect invalid value="" onChange={() => {}} options={OPTIONS} />),
    /aria-invalid="true"/,
  );
});

test('a valid control claims nothing', () => {
  // `aria-invalid="false"` is not the same as absent to every screen reader,
  // and there is nothing to say about a field that is simply fine.
  for (const markup of [
    html(<Input />),
    html(<Textarea />),
    html(<DatePicker onChange={() => {}} />),
    html(<NativeSelect value="" onChange={() => {}} options={OPTIONS} />),
  ]) {
    assert.doesNotMatch(markup, /aria-invalid/);
  }
});

test('the Select trigger carries the description, not the hidden select', () => {
  // jsdom reports a desktop viewport, so this is the listbox form — the one
  // with a button in front of an sr-only <select>.
  const view = render(
    <Select
      value=""
      onChange={() => {}}
      options={OPTIONS}
      invalid
      aria-describedby="region-error"
    />,
  );
  const trigger = view.container.querySelector('[role="combobox"]')!;
  assert.equal(trigger.getAttribute('aria-describedby'), 'region-error');
  assert.equal(trigger.getAttribute('aria-invalid'), 'true');

  // And it is no longer duplicated onto the element nobody focuses.
  const hidden = view.container.querySelector('select.sr-only');
  assert.equal(hidden?.getAttribute('aria-describedby'), null);
  view.unmount();
});

test('an aria-label reaches the Select trigger too', () => {
  // Same reasoning as the description: a control with no visible label is
  // named by this, and naming the hidden element names nothing.
  const view = render(
    <Select value="" onChange={() => {}} options={OPTIONS} aria-label="Delivery region" />,
  );
  const trigger = view.container.querySelector('[role="combobox"]')!;
  assert.equal(trigger.getAttribute('aria-label'), 'Delivery region');
  view.unmount();
});

test('the hidden select still carries the attributes that are its job', () => {
  // It exists to hold the forwarded ref and to make a form post work, so the
  // native form attributes must still ride the spread.
  const view = render(
    <Select value="" onChange={() => {}} options={OPTIONS} name="region" required />,
  );
  const hidden = view.container.querySelector('select.sr-only')!;
  assert.equal(hidden.getAttribute('name'), 'region');
  assert.ok(hidden.hasAttribute('required'));
  view.unmount();
});
