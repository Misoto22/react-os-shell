import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, render } from './dom';
import {
  PortalBrandingProvider,
  usePortalBranding,
  type PublicPortalBranding,
} from '../src/branding/PortalBrandingProvider';

function Probe() {
  const { branding, loading } = usePortalBranding();
  return <output data-loading={String(loading)}>{branding.company_name}|{branding.logo_square_url}</output>;
}

test('PortalBrandingProvider starts from fallback then applies the anonymous hostname result', async () => {
  let resolve!: (value: PublicPortalBranding) => void;
  const load = () => new Promise<PublicPortalBranding>(done => { resolve = done; });
  const fallback: PublicPortalBranding = {
    portal: 'dealer',
    company_name: 'Dealer Portal',
    logo_url: null,
    logo_on_dark_url: null,
    logo_square_url: '/neutral.png',
    favicon_url: null,
    logo_has_alpha: null,
    logo_is_light: null,
  };
  const view = render(
    <PortalBrandingProvider
      load={load}
      fallback={fallback}
      documentTitle={branding => `${branding.company_name} Dealer Portal`}
    >
      <Probe />
    </PortalBrandingProvider>,
  );
  assert.equal(view.container.querySelector('output')?.textContent, 'Dealer Portal|/neutral.png');
  assert.equal(view.container.querySelector('output')?.getAttribute('data-loading'), 'true');

  await act(async () => {
    resolve({ ...fallback, company_name: 'INOVIT Pty Ltd', logo_square_url: '/tenant.png', favicon_url: '/favicon.png' });
    await Promise.resolve();
  });
  assert.equal(view.container.querySelector('output')?.textContent, 'INOVIT Pty Ltd|/tenant.png');
  assert.equal(view.container.querySelector('output')?.getAttribute('data-loading'), 'false');
  assert.equal(document.head.querySelector<HTMLLinkElement>('link[data-portal-branding="favicon"]')?.href.endsWith('/favicon.png'), true);
  assert.equal(document.title, 'INOVIT Pty Ltd Dealer Portal');
  view.unmount();
});

test('PortalBrandingProvider keeps fallback identity when public branding fails', async () => {
  const fallback: PublicPortalBranding = {
    portal: 'supplier', company_name: 'Supplier Portal', logo_url: null,
    logo_on_dark_url: null, logo_square_url: null, favicon_url: null,
    logo_has_alpha: null, logo_is_light: null,
  };
  const view = render(
    <PortalBrandingProvider load={async () => { throw new Error('offline'); }} fallback={fallback}>
      <Probe />
    </PortalBrandingProvider>,
  );
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  assert.equal(view.container.querySelector('output')?.textContent, 'Supplier Portal|');
  assert.equal(view.container.querySelector('output')?.getAttribute('data-loading'), 'false');
  view.unmount();
});
