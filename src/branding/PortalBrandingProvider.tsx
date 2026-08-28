import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setBranding(fallback);
    setLoading(true);
    setError(null);
    load(controller.signal).then(
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
  }, [load, fallback]);

  useEffect(() => {
    applyFavicon(branding.favicon_url);
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
