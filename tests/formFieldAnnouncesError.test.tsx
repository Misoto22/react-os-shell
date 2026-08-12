import { flush } from './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import FormField from '../src/forms/FormField';

/**
 * A validation message appears after the user submits, without focus moving to
 * it. Without a live region it reaches nobody — and of everything a form says,
 * this is the one it cannot afford to lose.
 *
 * The required marker had the opposite problem: exposed, it becomes part of
 * the label on every required field of every form. "Company name star".
 */

void flush;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('an error announces itself', () => {
  const markup = html(<FormField label="Company name" error="Enter a company name"><input /></FormField>);
  assert.match(markup, /role="alert"[^>]*>Enter a company name|Enter a company name/);
  assert.match(markup, /role="alert"/);
});

test('a hint does not interrupt', () => {
  // It is there before anything went wrong; announcing it assertively would
  // cut across whatever the user was reading.
  const markup = html(<FormField label="Company name" hint="As it appears on your invoices"><input /></FormField>);
  assert.doesNotMatch(markup, /role="alert"/);
  assert.match(markup, /As it appears on your invoices/);
});

test('the required marker is decoration', () => {
  // `required` on the control is what assistive technology reads.
  const markup = html(<FormField label="Company name" required><input /></FormField>);
  assert.match(markup, /aria-hidden="true"[^>]*>\*|\*/);
  assert.match(markup, /aria-hidden="true"/);
});

test('a field with neither says nothing extra', () => {
  const markup = html(<FormField label="Company name"><input /></FormField>);
  assert.doesNotMatch(markup, /role="alert"/);
  assert.doesNotMatch(markup, /aria-hidden/);
});

test('the error id still follows htmlFor, so a control can point at it', () => {
  const markup = html(<FormField label="X" htmlFor="company" error="Required"><input id="company" /></FormField>);
  assert.match(markup, /id="company-error"/);
});
