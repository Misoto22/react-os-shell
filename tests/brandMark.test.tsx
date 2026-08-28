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

test('BrandMark gives a transparent dark mark a light plate on a dark surface', () => {
  const view = render(
    <BrandMark
      src="/dark-mark.png"
      alt="Dealer"
      surface="dark"
      adaptive
      hasAlpha
      isLight={false}
    />,
  );
  const frame = view.container.querySelector('[data-brand-treatment]') as HTMLElement;
  assert.equal(frame.dataset.brandTreatment, 'plate-light');
  assert.equal(frame.style.background, 'rgb(255, 255, 255)');
  view.unmount();
});

test('BrandMark leaves a contrasting transparent mark bare', () => {
  const view = render(
    <BrandMark src="/light-mark.png" alt="Dealer" surface="dark" adaptive hasAlpha isLight />,
  );
  const frame = view.container.querySelector('[data-brand-treatment]') as HTMLElement;
  assert.equal(frame.dataset.brandTreatment, 'bare');
  assert.equal(frame.style.background, '');
  view.unmount();
});

test('BrandMark does not alter an authoritative surface-specific variant', () => {
  const view = render(
    <BrandMark src="/on-dark.png" alt="Dealer" surface="dark" hasAlpha isLight={false} />,
  );
  assert.equal(
    view.container.querySelector('[data-brand-treatment]')?.getAttribute('data-brand-treatment'),
    'bare',
  );
  view.unmount();
});

test('BrandMark can hide after load failure when the caller owns fallback content', () => {
  const view = render(
    <BrandMark src="/missing.svg" alt="Dealer" fallbackMode="none" />,
  );
  const image = view.container.querySelector('img')!;
  act(() => { image.dispatchEvent(new Event('error', { bubbles: true })); });
  assert.equal(view.container.querySelector('[data-brand-fallback]'), null);
  assert.equal(view.container.querySelector('img'), null);
  view.unmount();
});

test('BrandMark supports natural-aspect dimensions without the default slot size', () => {
  const view = render(
    <BrandMark
      src="/tenant-wide.svg"
      alt="Dealer"
      width="100%"
      height={32}
      treatmentPadding={2}
      treatmentRadius={6}
      adaptive
    />,
  );
  const frame = view.container.querySelector('[data-brand-treatment]') as HTMLElement;
  assert.equal(frame.style.width, '100%');
  assert.equal(frame.style.height, '32px');
  assert.equal(frame.style.padding, '2px');
  assert.equal(frame.style.borderRadius, '6px');
  assert.doesNotMatch(frame.className, /h-10|w-10/);
  view.unmount();
});
