import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Meter from '../src/charts/Meter';

/**
 * A meter whose fill is made of parts.
 *
 * Found by aligning an ERP against its benchmark set: Business Central and
 * NetSuite both show fulfilment ON the order line — 80 of 100 shipped, 15 more
 * picked — because "what is still owed" is a spatial question, not one the
 * reader should have to do arithmetic for. `Meter` could only draw one fill,
 * so consumers hand-rolled a layered track instead. The kit already proved the
 * shape works in `ContainerFillChart`, whose own doc describes layering
 * "instruction (blue) and loaded (green) into the same bar so both are visible
 * at once" — it was just locked to container volumes.
 *
 * The single-value form must be untouched by this: it is the one every
 * observability console already renders.
 */

test('the single-value meter is unchanged when no segments are passed', () => {
  const html = renderToStaticMarkup(
    <Meter value={0.42} objective={0.9} label="Success rate" />,
  );
  assert.match(html, /role="meter"/);
  assert.match(html, /width:42\.00%|width: 42\.00%/);
  // The objective marker and its verdict still render.
  assert.match(html, /objective/);
  assert.match(html, /missed/);
});

test('segments are laid end to end on one track', () => {
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[
        { value: 0.8, label: 'Shipped' },
        { value: 0.15, label: 'Picked', tone: 'neutral' },
      ]}
    />,
  );
  assert.match(html, /width:80\.00%|width: 80\.00%/);
  assert.match(html, /width:15\.00%|width: 15\.00%/);
});

test('each part is NAMED with its share, so colour never travels alone', () => {
  // The single-value form writes its value out for the same reason: greyscale,
  // CVD and forced-colors all survive a written breakdown and none of them
  // survive two adjacent hues.
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[
        { value: 0.8, label: 'Shipped' },
        { value: 0.15, label: 'Picked' },
      ]}
    />,
  );
  assert.match(html, /Shipped 80\.0%/);
  assert.match(html, /Picked 15\.0%/);
});

test('the ARIA value stays the TOTAL, not the last segment', () => {
  // A screen reader should hear "95%", which is what the line is fulfilled to.
  // Reading the final segment would announce 15%.
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[{ value: 0.8, label: 'Shipped' }, { value: 0.15, label: 'Picked' }]}
    />,
  );
  assert.match(html, /aria-valuenow="95"/);
});

test('a segment wider than the track is clipped rather than overflowing it', () => {
  const html = renderToStaticMarkup(
    <Meter value={1} label="Over" segments={[{ value: 1.4, label: 'Shipped' }]} />,
  );
  assert.match(html, /width:100\.00%|width: 100\.00%/);
  assert.doesNotMatch(html, /width:140/);
});

test('the unavailable state still wins over segments', () => {
  // `value == null` means "not enough data to judge", and that is true however
  // many parts the caller happens to have computed.
  const html = renderToStaticMarkup(
    <Meter value={null} label="Line 3" segments={[{ value: 0.8, label: 'Shipped' }]} />,
  );
  assert.doesNotMatch(html, /role="meter"/);
  assert.match(html, /Not enough eligible requests/);
});
