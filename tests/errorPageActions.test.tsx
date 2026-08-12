import { flush } from './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorPage from '../src/templates/ErrorPage';

/**
 * The page rendered "Go back" and "Take me home" as buttons with no handlers
 * on them. They looked like the way out of a dead end and did nothing — worse
 * than offering nothing, because the user spends a click and a moment of trust
 * finding out.
 *
 * The kit has no router, so the destination has to come from the consumer.
 */

void flush;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('nothing is offered when nothing was given', () => {
  const markup = html(<ErrorPage code={404} />);
  assert.doesNotMatch(markup, /<button/, 'a control that does nothing must not be drawn');
  assert.doesNotMatch(markup, /Take me home/);
});

test('the consumer supplies the way out', () => {
  // A routed app passes its own link, which is the case the hardcoded buttons
  // could never serve.
  const markup = html(<ErrorPage code={404} actions={<a href="/dashboard">Back to Dashboard</a>} />);
  assert.match(markup, /<a href="\/dashboard">Back to Dashboard<\/a>/);
});

test('the code still picks the copy', () => {
  assert.match(html(<ErrorPage code={403} />), /Access denied/);
  assert.match(html(<ErrorPage code={404} />), /Page not found/);
  assert.match(html(<ErrorPage code={500} />), /Something went wrong/);
  assert.match(html(<ErrorPage />), /Page not found/, 'and 404 is still the default');
});

test('the code is shown as the headline', () => {
  assert.match(html(<ErrorPage code={500} />), />500</);
});
