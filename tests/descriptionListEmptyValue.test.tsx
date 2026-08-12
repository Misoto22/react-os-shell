import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import DescriptionList from '../src/shell/DescriptionList';

/**
 * A field with no value rendered an empty cell.
 *
 * That answers nothing — and inside `bordered`, where the cell has an outline
 * of its own, it reads as a rendering fault rather than as "there is no
 * tracking number". A dash is the difference between the data being absent and
 * the component being broken.
 */

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const dd = (markup: string) => [...markup.matchAll(/<dd[^>]*>(.*?)<\/dd>/g)].map(m => m[1]);

test('an absent value says so', () => {
  for (const value of [null, undefined, '']) {
    const markup = html(<DescriptionList items={[{ label: 'Tracking number', value }]} />);
    assert.deepEqual(dd(markup), ['—'], String(value));
  }
});

test('a falsy value that IS a value is left alone', () => {
  // 0 and false are answers. Replacing them with a dash would report a zero
  // balance as "we do not know", which is a different and worse statement.
  assert.deepEqual(dd(html(<DescriptionList items={[{ label: 'Balance', value: 0 }]} />)), ['0']);
  assert.deepEqual(dd(html(<DescriptionList items={[{ label: 'On hold', value: <span>No</span> }]} />)), ['<span>No</span>']);
});

test('the placeholder can be replaced or removed', () => {
  assert.deepEqual(dd(html(<DescriptionList items={[{ label: 'X', value: null }]} emptyText="Not set" />)), ['Not set']);
  assert.deepEqual(dd(html(<DescriptionList items={[{ label: 'X', value: null }]} emptyText={null} />)), ['']);
});

test('a present value is untouched', () => {
  assert.deepEqual(
    dd(html(<DescriptionList items={[{ label: 'Carrier', value: 'DFE' }]} />)),
    ['DFE'],
  );
});
