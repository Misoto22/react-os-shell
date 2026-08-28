import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PublicPortal = 'dealer' | 'customer' | 'supplier';

export interface PublicPortalBranding {
  portal: PublicPortal;
  company_name: string | null;
  logo_url: string | null;
  logo_on_dark_url: string | null;
  logo_square_url: string | null;
  favicon_url: string | null;
  logo_has_alpha: boolean | null;
  logo_is_light: boolean | null;
  logo_square_has_alpha: boolean | null;
  logo_square_is_light: boolean | null;
}

export interface ResolvedPortalBrandAsset {
  src: string | null;
  hasAlpha: boolean | null;
  isLight: boolean | null;
  adaptive: boolean;
}

/**
 * Select one tenant-owned asset and its matching display metadata. Compact
 * hints must never be borrowed from the primary wordmark; a dedicated dark
 * variant is authoritative for that surface and therefore needs no treatment.
 */
export function resolvePortalBrandAsset(
  branding: PublicPortalBranding,
  options: { preferSquare?: boolean; surface?: 'light' | 'dark' } = {},
): ResolvedPortalBrandAsset {
  if (options.preferSquare && branding.logo_square_url) {
    return {
      src: branding.logo_square_url,
      hasAlpha: branding.logo_square_has_alpha,
      isLight: branding.logo_square_is_light,
      adaptive: true,
    };
  }
  if (options.surface === 'dark' && branding.logo_on_dark_url) {
    return {
      src: branding.logo_on_dark_url,
      hasAlpha: null,
      isLight: null,
      adaptive: false,
    };
  }
  return {
    src: branding.logo_url,
    hasAlpha: branding.logo_has_alpha,
    isLight: branding.logo_is_light,
    adaptive: true,
  };
}

export interface PortalBrandingContextValue {
  branding: PublicPortalBranding;
  loading: boolean;
  error: Error | null;
}

export interface PortalBrandingProviderProps {
  load: (signal?: AbortSignal) => Promise<PublicPortalBranding>;
  fallback: PublicPortalBranding;
  /** Consistent browser title derived from the hostname-scoped public identity. */
  documentTitle?: (branding: PublicPortalBranding) => string;
  children: ReactNode;
}

const PortalBrandingContext = createContext<PortalBrandingContextValue | null>(null);

function applyFavicon(url: string | null) {
  const selector = 'link[data-portal-branding="favicon"]';
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  if (!url) {
    existing?.remove();
    return;
  }
  const link = existing ?? document.createElement('link');
  link.rel = 'icon';
  link.href = url;
  link.dataset.portalBranding = 'favicon';
  if (!existing) document.head.appendChild(link);
}

/**
 * Loads pre-auth, hostname-scoped identity without reading or mutating the
 * signed-in session. Consumers inject the HTTP adapter; the shared lifecycle,
 * fallback and document favicon behaviour stay consistent across portals.
 */
export function PortalBrandingProvider({
  load,
  fallback,
  documentTitle,
  children,
}: PortalBrandingProviderProps) {
  const [branding, setBranding] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Held in refs, not in the dependency list. `load` and `fallback` come from
  // the consumer, and the natural way to mount this provider passes an inline
  // arrow and an inline object literal — new identities on every render of the
  // app root. Depending on them made ANY unrelated ancestor render (a route
  // change, an auth refresh) abort the in-flight request and start another,
  // resetting `branding` to the fallback on the way: the tenant's title,
  // favicon and logo visibly reverted and re-resolved each time. Measured at
  // 4 loads and 3 aborts for 3 ancestor renders.
  const loadRef = useRef(load);
  const fallbackRef = useRef(fallback);
  loadRef.current = load;
  fallbackRef.current = fallback;

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setBranding(fallbackRef.current);
    setLoading(true);
    setError(null);
    loadRef.current(controller.signal).then(
      result => {
        if (!current) return;
        setBranding(result);
        setLoading(false);
      },
      cause => {
        if (!current) return;
        setError(cause instanceof Error ? cause : new Error('Could not load portal branding.'));
        setLoading(false);
      },
    );
    return () => {
      current = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    applyFavicon(branding.favicon_url);
    // Only the link this provider owns is removed — the host's own static
    // <link rel="icon"> is never touched, so unmounting restores it.
    return () => applyFavicon(null);
  }, [branding.favicon_url]);

  useEffect(() => {
    if (documentTitle) document.title = documentTitle(branding);
  }, [branding, documentTitle]);

  const value = useMemo(() => ({ branding, loading, error }), [branding, loading, error]);
  return <PortalBrandingContext.Provider value={value}>{children}</PortalBrandingContext.Provider>;
}

export function usePortalBranding() {
  const value = useContext(PortalBrandingContext);
  if (!value) throw new Error('usePortalBranding must be used inside PortalBrandingProvider.');
  return value;
}
