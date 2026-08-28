import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, render } from './dom';
import BrandMark from '../src/forms/BrandMark';

test('BrandMark contains a wordmark without stretching it into the slot', () => {
  const view = render(
    <BrandMark src="/tenant-wide.svg" alt="INOVIT" slot="wordmark" surface="light" />,
  );
  const image = view.container.querySelector('img')!;
  assert.equal(image.getAttribute('src'), '/tenant-wide.svg');
  assert.equal(image.getAttribute('data-brand-slot'), 'wordmark');
  assert.equal(image.style.objectFit, 'contain');
  assert.match(image.className, /max-h-full/);
  assert.match(image.className, /max-w-full/);
  view.unmount();
});

test('BrandMark changes to the fallback when the primary image cannot load', () => {
  const view = render(
    <BrandMark src="/missing.svg" fallbackSrc="/neutral.svg" alt="Dealer" slot="compact" />,
  );
  const image = view.container.querySelector('img')!;
  act(() => { image.dispatchEvent(new Event('error', { bubbles: true })); });
  assert.equal(image.getAttribute('src'), '/neutral.svg');
  view.unmount();
});

test('BrandMark renders a neutral monogram when no image URL exists', () => {
  const view = render(<BrandMark alt="Regis Design" slot="favicon" />);
  const fallback = view.container.querySelector('[data-brand-fallback]')!;
  assert.equal(fallback.textContent, 'R');
  assert.equal(fallback.getAttribute('aria-label'), 'Regis Design');
  view.unmount();
});
