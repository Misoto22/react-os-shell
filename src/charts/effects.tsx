/**
 * The expressive layer — fill variants, reveal masks, glow, and motion.
 *
 * The architecture here is taken from EvilCharts (MIT,
 * github.com/legions-developer/evilcharts), which is the current reference for
 * what a chart on a design system looks like when someone art-directs it. Three
 * ideas were worth borrowing wholesale:
 *
 *   1. **A fill is a named variant backed by a `<pattern>`, not a raw colour.**
 *      `gradient` · `gradient-reverse` · `solid` · `dotted` · `lines` ·
 *      `hatched` · `duotone` · `striped` · `blocks`. That makes texture a
 *      first-class option rather than a hack, which matters beyond looks: a
 *      texture is the fallback a colour-vision or forced-colors reader needs
 *      when hue alone stops separating two series, and SIX distinguishable
 *      textures separate six series with no colour at all. That is the reason
 *      to keep adding them past the point where they look like decoration.
 *
 *   2. **The intro reveal is an animated `<mask>`, not a stroke dash.** A dash
 *      offset only animates strokes, so the fill and the point markers arrive
 *      on their own schedule and the chart assembles in pieces. A mask wipes
 *      fill, stroke and dots together, in one gesture, because they are all
 *      under it.
 *
 *   3. **`animated-dashed` for a series that is a projection.** A marching dash
 *      says "this part is modelled, not measured" without a second legend
 *      entry.
 *
 * Two places this parts company with the reference, both deliberate:
 *
 *   - **EvilCharts drives its reveal per frame (motion.dev) and notes it is
 *     heavier than a static chart.** Here the mask is animated by a CSS
 *     transform instead — same wipe, no JavaScript in the frame loop, and the
 *     compositor does the work.
 *   - **EvilCharts defaults its gridlines to dashed.** They stay solid here. A
 *     dashed rule reads as a threshold or a projection, and a gridline is
 *     neither; `gridStyle="dashed"` is available for a caller who wants the
 *     look.
 *
 * Ids are derived from a caller-supplied `useId`, because two charts on one
 * page sharing a gradient or mask id is the classic SVG bug where the second
 * silently repaints the first.
 */
import type { ReactNode } from 'react';

import type {
  ChartBackgroundVariant,
  ChartFillVariant,
  ChartRevealDirection,
  ChartStrokeVariant,
} from './types';

/*
 * These names are re-exports, not second definitions.
 *
 * They started as a parallel copy of the unions in `types.ts`, which is exactly
 * the shape a drift bug takes: adding `duotone` in one place typechecked
 * everywhere except the one call site that crossed the boundary. One list, two
 * names.
 */
export type FillVariant = ChartFillVariant;
export type StrokeVariant = ChartStrokeVariant;
export type RevealDirection = ChartRevealDirection;
export type BackgroundVariant = ChartBackgroundVariant;

export const fillId = (id: string, index: number) => `${id}-fill-${index}`;
export const glowId = (id: string) => `${id}-glow`;
export const maskId = (id: string) => `${id}-reveal`;
export const groundId = (id: string) => `${id}-ground`;

/** The url() a mark should take for its fill, given the variant. */
export function fillFor(id: string, index: number, variant: FillVariant, colour: string): string {
  return variant === 'solid' ? colour : `url(#${fillId(id, index)})`;
}

/** Dash array for a stroke variant, or undefined for a solid one. */
export function dashFor(variant: StrokeVariant): string | undefined {
  return variant === 'solid' ? undefined : '4 3';
}

interface FillDefProps {
  id: string;
  index: number;
  colour: string;
  variant: FillVariant;
  /** Top-of-fill alpha. EvilCharts sits near 0.1; a stack wants more. */
  from: number;
  to: number;
}

function FillDef({ id, index, colour, variant, from, to }: FillDefProps): ReactNode {
  const key = fillId(id, index);

  // `solid` takes the colour directly (see `fillFor`), so it needs no def at
  // all. Falling through to the hatch default put an unreferenced pattern in
  // the defs of every chart that used it — invisible, and dead markup on every
  // render.
  if (variant === 'solid') return null;

  if (variant === 'gradient' || variant === 'gradient-reverse') {
    const reversed = variant === 'gradient-reverse';
    return (
      <linearGradient id={key} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colour} stopOpacity={reversed ? to : from} />
        <stop offset="100%" stopColor={colour} stopOpacity={reversed ? from : to} />
      </linearGradient>
    );
  }

  // The textured variants paint their motif over a faint wash of the same hue,
  // so a sparse pattern still reads as belonging to its series.
  const wash = <rect width="100%" height="100%" fill={colour} fillOpacity={from * 0.45} />;

  if (variant === 'duotone') {
    // Two bands with a HARD stop, not a fade: the edge is the point. It reads
    // as a filled region with a lighter shoulder, which separates two stacked
    // areas that a smooth gradient would blur into each other.
    return (
      <linearGradient id={key} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colour} stopOpacity={from} />
        <stop offset="45%" stopColor={colour} stopOpacity={from} />
        <stop offset="45%" stopColor={colour} stopOpacity={from * 0.35} />
        <stop offset="100%" stopColor={colour} stopOpacity={from * 0.35} />
      </linearGradient>
    );
  }

  if (variant === 'striped') {
    // Wider than `hatched` and at the opposite angle, so the two are
    // distinguishable from each other rather than merely from a flat fill.
    return (
      <pattern id={key} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        {wash}
        <rect width="5" height="10" fill={colour} fillOpacity={0.7} />
      </pattern>
    );
  }

  if (variant === 'blocks') {
    return (
      <pattern id={key} width="10" height="10" patternUnits="userSpaceOnUse">
        {wash}
        <rect x="1" y="1" width="4" height="4" rx="1" fill={colour} fillOpacity={0.8} />
        <rect x="6" y="6" width="4" height="4" rx="1" fill={colour} fillOpacity={0.8} />
      </pattern>
    );
  }

  if (variant === 'dotted') {
    return (
      <pattern id={key} width="8" height="8" patternUnits="userSpaceOnUse">
        {wash}
        <circle cx="2" cy="2" r="1.2" fill={colour} fillOpacity={0.85} />
      </pattern>
    );
  }
  if (variant === 'lines') {
    return (
      <pattern id={key} width="6" height="6" patternUnits="userSpaceOnUse">
        {wash}
        <line x1="0" y1="0" x2="0" y2="6" stroke={colour} strokeWidth="1.5" strokeOpacity={0.8} />
      </pattern>
    );
  }
  // hatched — 45°, the direction the texture rule reserves for value scales.
  return (
    <pattern id={key} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      {wash}
      <line x1="0" y1="0" x2="0" y2="6" stroke={colour} strokeWidth="2" strokeOpacity={0.75} />
    </pattern>
  );
}

/**
 * The intro wipe. A plain white rect inside a mask, scaled from nothing to full
 * by CSS — everything under the mask appears as it passes.
 */
function RevealMask({ id, direction }: { id: string; direction: RevealDirection }): ReactNode {
  const className = direction === 'center-out'
    ? 'rosh-viz-wipe-center'
    : direction === 'right-to-left'
      ? 'rosh-viz-wipe-rtl'
      : 'rosh-viz-wipe';
  return (
    <mask id={maskId(id)} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
      <rect x="0" y="0" width="1" height="1" fill="white" className={className} />
    </mask>
  );
}

export interface ChartDefsProps {
  /** Unique per chart instance — pass `useId()`. */
  id: string;
  /** One entry per series needing a fill. */
  fills?: { colour: string; variant?: FillVariant }[];
  fadeFrom?: number;
  fadeTo?: number;
  /** Soft outer bloom. Off by default — it is an accent, not a default. */
  glow?: boolean;
  /** Emit the intro wipe mask. */
  reveal?: RevealDirection | false;
  /** The ground behind the plot. */
  background?: BackgroundVariant;
}

export function ChartDefs({
  id, fills = [], fadeFrom = 0.3, fadeTo = 0,
  glow = false, reveal = false, background = 'none',
}: ChartDefsProps): ReactNode {
  return (
    <defs>
      {fills.map((fill, i) => (
        <FillDef
          key={i} id={id} index={i} colour={fill.colour}
          variant={fill.variant ?? 'gradient'} from={fadeFrom} to={fadeTo}
        />
      ))}
      {reveal && <RevealMask id={id} direction={reveal} />}
      {glow && (
        <filter id={glowId(id)} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
      {background !== 'none' && <GroundPattern id={groundId(id)} variant={background} />}
    </defs>
  );
}

function GroundPattern({ id, variant }: { id: string; variant: BackgroundVariant }): ReactNode {
  // `currentColor` throughout, so the ground follows whatever ink the plot
  // group sets rather than pinning a grey that only works in one theme.
  if (variant === 'dots') {
    return (
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="currentColor" />
      </pattern>
    );
  }
  if (variant === 'grid') {
    return (
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
    );
  }
  if (variant === 'cross-hatch') {
    return (
      <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 0 0 L 20 20 M 20 0 L 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
    );
  }
  if (variant === 'plus') {
    return (
      <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M 8 4 L 8 12 M 4 8 L 12 8" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" />
      </pattern>
    );
  }
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.5" />
    </pattern>
  );
}

/**
 * Class names for the motion, so a chart never writes an animation itself and
 * therefore cannot forget the reduced-motion rule in `ui.css`.
 */
export const MOTION = {
  /** A bar growing from its baseline. Needs `transform-box: fill-box`. */
  rise: 'rosh-viz-rise',
  /** A horizontal bar growing from its label edge. */
  grow: 'rosh-viz-grow',
  /** A wedge arriving from twelve o'clock. */
  sweep: 'rosh-viz-sweep',
  /** A marching dash, for a series that is a projection. */
  march: 'rosh-viz-march',
  /** A fill arriving with the line that bounds it. */
  fade: 'rosh-viz-fade',
} as const;

/** Stagger successive marks so a chart assembles rather than appearing. */
export const stagger = (index: number, step = 60): { animationDelay: string } => ({
  animationDelay: `${index * step}ms`,
});
