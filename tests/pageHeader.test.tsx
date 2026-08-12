import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import PageHeader from '../src/shell/PageHeader';

/**
 * `icon` and `breadcrumbs` are additive: three portals render this component
 * today with neither, so the first spec is the one that matters most — the
 * existing output has to be byte-identical.
 *
 * The trail is rendered with the kit's own `Breadcrumbs` rather than a second
 * implementation inside this file. That is not a style preference: a header
 * trail and a standalone trail collapsing differently, or only one of them
 * marking the current crumb with `aria-current`, is exactly the drift a shared
 * kit exists to prevent.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

test('PageHeader: without the new props, the output is what it always was', () => {
  const before = html(<PageHeader title="Orders" description="Everything you have ordered" actions={<button>New</button>} />);
  assert.match(before, /<h1[^>]*>Orders<\/h1>/);
  assert.match(before, /Everything you have ordered/);
  // No trail element, no icon span, when neither was asked for.
  assert.doesNotMatch(before, /aria-current/);
  assert.doesNotMatch(before, /<nav/);
});

test('PageHeader: subtitle and children still work as the documented aliases', () => {
  assert.equal(
    html(<PageHeader title="Orders" subtitle="Recent" />),
    html(<PageHeader title="Orders" description="Recent" />),
  );
  assert.equal(
    html(<PageHeader title="Orders">{<button>New</button>}</PageHeader>),
    html(<PageHeader title="Orders" actions={<button>New</button>} />),
  );
});

test('PageHeader: the icon sits inside the heading, muted', () => {
  const markup = html(<PageHeader title="Inventory" icon={<svg data-testid="i" />} />);
  // Inside the <h1>: it labels the title, so it belongs to the heading rather
  // than floating beside it.
  assert.match(markup, /<h1[^>]*>.*<svg.*Inventory<\/h1>/s);
  assert.match(markup, /text-gray-400/);
});

test('PageHeader: breadcrumbs render through the kit Breadcrumbs component', () => {
  const markup = html(
    <PageHeader
      title="Change Password"
      breadcrumbs={[{ label: 'Company', onClick: () => {} }, { label: 'Change Password' }]}
    />,
  );
  // Behaviour that comes from Breadcrumbs, not from this file: a <nav>, a
  // button for the crumb that can be navigated to, and aria-current on the
  // last one. If someone reimplements the trail here, these stop holding.
  assert.match(markup, /<nav[^>]*aria-label="Breadcrumb"/);
  assert.match(markup, /<button[^>]*>[\s\S]*?Company[\s\S]*?<\/button>/);
  assert.match(markup, /aria-current="page"[\s\S]*?Change Password/);
});

test('PageHeader: an empty trail renders nothing rather than an empty nav', () => {
  assert.doesNotMatch(html(<PageHeader title="Orders" breadcrumbs={[]} />), /<nav/);
});
