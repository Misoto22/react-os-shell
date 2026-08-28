import { useEffect, useState, type CSSProperties } from 'react';

export type BrandMarkSlot = 'favicon' | 'compact' | 'wordmark';
export type BrandMarkSurface = 'light' | 'dark';
export type BrandMarkTreatment = 'plate-light' | 'plate-dark' | 'framed' | 'bare';

export interface BrandMarkProps {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  slot?: BrandMarkSlot;
  surface?: BrandMarkSurface;
  /** Override the square slot size in pixels for compact shell chrome. */
  size?: number;
  /** Mark the image decorative when the adjacent text already names it. */
  decorative?: boolean;
  /** Keep an arbitrary tenant mark readable without recolouring the artwork. */
  adaptive?: boolean;
  /** Server-detected transparency hint for the primary tenant mark. */
  hasAlpha?: boolean | null;
  /** Server-detected tone hint for the primary tenant mark. */
  isLight?: boolean | null;
  className?: string;
}

const SLOT_CLASS: Record<BrandMarkSlot, string> = {
  favicon: 'h-8 w-8',
  compact: 'h-10 w-10',
  wordmark: 'h-10 w-40',
};

function monogram(alt: string) {
  return alt.trim().charAt(0).toLocaleUpperCase() || '·';
}

/**
 * Chooses the smallest backing needed to preserve contrast. Opaque artwork
 * carries its own background; transparent artwork only needs a plate when its
 * tone would disappear into the current surface. Unknown artwork gets the
 * conservative light plate used by every portal.
 */
export function resolveBrandMarkTreatment(
  hasAlpha: boolean | null,
  isLight: boolean | null,
  surface: BrandMarkSurface,
): BrandMarkTreatment {
  if (hasAlpha === false) return 'framed';
  if (hasAlpha == null || isLight == null) return 'plate-light';
  if (isLight) return surface === 'light' ? 'plate-dark' : 'bare';
  return surface === 'dark' ? 'plate-light' : 'bare';
}

function treatmentStyle(treatment: BrandMarkTreatment): CSSProperties {
  switch (treatment) {
    case 'plate-light':
      return {
        background: '#ffffff',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
      };
    case 'plate-dark':
      return {
        background: '#1f1f1f',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
      };
    case 'framed':
      return {
        borderRadius: 8,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
      };
    case 'bare':
      return {};
  }
}

/**
 * Renders a brand asset inside a stable portal slot without ever cropping or
 * stretching the source. Raster normalisation belongs to the server; this
 * component owns only the presentation contract shared by portal surfaces.
 */
export default function BrandMark({
  src,
  fallbackSrc,
  alt,
  slot = 'compact',
  surface = 'light',
  size,
  decorative = false,
  adaptive = false,
  hasAlpha = null,
  isLight = null,
  className = '',
}: BrandMarkProps) {
  const [activeSrc, setActiveSrc] = useState(src || fallbackSrc || '');

  useEffect(() => {
    setActiveSrc(src || fallbackSrc || '');
  }, [src, fallbackSrc]);

  const frameClass = [
    'inline-flex shrink-0 items-center justify-center overflow-hidden',
    size == null ? SLOT_CLASS[slot] : '',
    surface === 'dark' ? 'text-white' : 'text-gray-700',
    className,
  ].filter(Boolean).join(' ');
  const treatment = adaptive
    ? resolveBrandMarkTreatment(hasAlpha, isLight, surface)
    : 'bare';
  const frameStyle: CSSProperties = {
    ...(size == null ? {} : { width: size, height: size }),
    ...treatmentStyle(treatment),
  };

  if (!activeSrc) {
    return (
      <span
        data-brand-fallback
        data-brand-slot={slot}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : 'img'}
        className={`${frameClass} rounded-md bg-gray-100 font-semibold`}
        style={frameStyle}
      >
        {decorative ? null : monogram(alt)}
      </span>
    );
  }

  return (
    <span className={frameClass} data-brand-treatment={treatment} style={frameStyle}>
      <img
        src={activeSrc}
        alt={decorative ? '' : alt}
        data-brand-slot={slot}
        className="block max-h-full max-w-full"
        style={{ objectFit: 'contain' }}
        onError={() => setActiveSrc(current => (
          fallbackSrc && current !== fallbackSrc ? fallbackSrc : ''
        ))}
      />
    </span>
  );
}
