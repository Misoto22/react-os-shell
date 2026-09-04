/**
 * A field's error has to be readable from the field, not merely next to it.
 *
 * `FormField` rendered its hint and error with ids — `${htmlFor}-hint` and
 * `${htmlFor}-error` — and pointed nothing at them. The ids referenced nothing,
 * so a screen-reader user who focused a field that had failed validation heard
 * the label and "invalid" and never the reason.
 *
 * `role="alert"` is not a substitute. It announces the message the moment it
 * appears; `aria-describedby` is what re-reads it when the user tabs BACK to
 * fix the field, which is the whole point at which they need it.
 *
 * The shell's own `MediaUploadField` and `MediaUploadGrid` already wire exactly
 * this by hand — which is where the id shape came from, and why the general
 * primitive not doing it was the gap rather than the design.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './dom';
import FormField from '../src/forms/FormField';

test('a control points at its error message', () => {
  const view = render(
    <FormField label="Company name" htmlFor="company" error="Enter a company name.">
      <input id="company" />
    </FormField>,
  );
  const input = view.container.querySelector('input')!;
  const error = view.container.querySelector('[role="alert"]')!;

  assert.equal(input.getAttribute('aria-describedby'), 'company-error');
  assert.equal(error.id, 'company-error', 'the id it points at must be the one rendered');
  view.unmount();
});

test('a control points at its hint when there is no error', () => {
  const view = render(
    <FormField label="ABN" htmlFor="abn" hint="Eleven digits, no spaces.">
      <input id="abn" />
    </FormField>,
  );
  const input = view.container.querySelector('input')!;
  assert.equal(input.getAttribute('aria-describedby'), 'abn-hint');
  view.unmount();
});

test('an error takes precedence over a hint, as the rendering already does', () => {
  const view = render(
    <FormField label="ABN" htmlFor="abn" hint="Eleven digits." error="That is not an ABN.">
      <input id="abn" />
    </FormField>,
  );
  assert.equal(
    view.container.querySelector('input')!.getAttribute('aria-describedby'),
    'abn-error',
    'the description must match the message actually on screen',
  );
  view.unmount();
});

test("a control's own aria-describedby is kept, not replaced", () => {
  // A control may already describe itself with something this component knows
  // nothing about — a character counter, a shared note above the fieldset.
  const view = render(
    <FormField label="Notes" htmlFor="notes" error="Too long.">
      <textarea id="notes" aria-describedby="char-count" />
    </FormField>,
  );
  const value = view.container.querySelector('textarea')!.getAttribute('aria-describedby');
  assert.equal(value, 'char-count notes-error');
  view.unmount();
});

test('nothing is described when there is neither hint nor error', () => {
  const view = render(
    <FormField label="Name" htmlFor="name"><input id="name" /></FormField>,
  );
  assert.equal(view.container.querySelector('input')!.getAttribute('aria-describedby'), null);
  view.unmount();
});

test('a field with no htmlFor is left alone', () => {
  // Without an id there is nothing to point at, and the message keeps its
  // `role="alert"` so it is still announced when it appears.
  const view = render(
    <FormField label="Name" error="Required."><input /></FormField>,
  );
  assert.equal(view.container.querySelector('input')!.getAttribute('aria-describedby'), null);
  assert.ok(view.container.querySelector('[role="alert"]'));
  view.unmount();
});

test('several children are left exactly as they were', () => {
  // A radio group or a split control is not a single describable element; the
  // caller wires it by hand, as the media fields do.
  const view = render(
    <FormField label="Range" htmlFor="from" error="Invalid range.">
      <input id="from" />
      <input id="to" />
    </FormField>,
  );
  for (const input of view.container.querySelectorAll('input')) {
    assert.equal(input.getAttribute('aria-describedby'), null);
  }
  view.unmount();
});
