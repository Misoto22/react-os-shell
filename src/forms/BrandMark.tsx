import { useEffect, useState } from 'react';

export type BrandMarkSlot = 'favicon' | 'compact' | 'wordmark';
export type BrandMarkSurface = 'light' | 'dark';

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

  if (!activeSrc) {
    return (
      <span
        data-brand-fallback
        data-brand-slot={slot}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : 'img'}
        className={`${frameClass} rounded-md bg-gray-100 font-semibold`}
        style={size == null ? undefined : { width: size, height: size }}
      >
        {decorative ? null : monogram(alt)}
      </span>
    );
  }

  return (
    <span className={frameClass} style={size == null ? undefined : { width: size, height: size }}>
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
