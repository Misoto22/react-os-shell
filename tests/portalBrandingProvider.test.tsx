import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, render } from './dom';
import { useState } from 'react';
import {
  PortalBrandingProvider,
  resolvePortalBrandAsset,
  usePortalBranding,
  type PublicPortalBranding,
} from '../src/contexts/PortalBrandingProvider';

const BLANK: PublicPortalBranding = {
  portal: 'dealer',
  company_name: null,
  logo_url: null,
  logo_on_dark_url: null,
  logo_square_url: null,
  favicon_url: null,
  logo_has_alpha: null,
  logo_is_light: null,
  logo_square_has_alpha: null,
  logo_square_is_light: null,
};

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
    logo_square_has_alpha: null,
    logo_square_is_light: null,
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
    logo_square_has_alpha: null, logo_square_is_light: null,
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

test('resolvePortalBrandAsset keeps compact metadata with the compact asset', () => {
  const branding: PublicPortalBranding = {
    portal: 'dealer', company_name: 'Dealer', logo_url: '/primary.png',
    logo_on_dark_url: '/dark.png', logo_square_url: '/compact.png',
    favicon_url: '/favicon.png', logo_has_alpha: true, logo_is_light: true,
    logo_square_has_alpha: true, logo_square_is_light: false,
  };
  assert.deepEqual(resolvePortalBrandAsset(branding, {
    preferSquare: true, surface: 'dark',
  }), {
    src: '/compact.png', hasAlpha: true, isLight: false, adaptive: true,
  });
  assert.deepEqual(resolvePortalBrandAsset(branding, { surface: 'dark' }), {
    src: '/dark.png', hasAlpha: null, isLight: null, adaptive: false,
  });
});


test('an unrelated ancestor render does not restart the branding load', () => {
  // `load` and `fallback` come from the consumer, and the natural way to mount
  // this passes an inline arrow and an inline object — new identities every
  // render of the app root. With those in the dependency list, any ancestor
  // render (a route change, an auth refresh) aborted the in-flight request and
  // started another, resetting `branding` to the fallback on the way: the
  // tenant's title, favicon and logo visibly reverted and re-resolved. Three
  // ancestor renders used to mean four loads and three aborts.
  let loads = 0;
  let aborts = 0;
  let bump: (n: number) => void = () => {};

  const App = () => {
    const [tick, setTick] = useState(0);
    bump = setTick;
    return (
      <PortalBrandingProvider
        load={async signal => {
          loads += 1;
          signal?.addEventListener('abort', () => { aborts += 1; });
          return { ...BLANK, company_name: 'INOVIT' };
        }}
        fallback={{ ...BLANK }}
      >
        <span>{tick}</span>
      </PortalBrandingProvider>
    );
  };

  const view = render(<App />);
  try {
    for (const n of [1, 2, 3]) act(() => { bump(n); });
    assert.equal(loads, 1, 'the identity is loaded once');
    assert.equal(aborts, 0, 'and nothing in flight is thrown away');
  } finally {
    view.unmount();
  }
});
