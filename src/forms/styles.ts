/**
 * Shared form-control styling — the single source of truth for the kit's
 * text-input look. Promoted out of SearchableSelect so every form control
 * (Input, Textarea, Select, SearchableSelect) renders identically and picks
 * up the same `[data-theme="dark"]` input remaps from styles.css.
 *
 * Keep this in the documented Tailwind vocabulary (see .design-sync/conventions.md)
 * so the classes survive both the dark-mode allow-list and the design-sync
 * compiled stylesheet.
 */

/**
 * The size axis is SWAPPED into the class string, never appended to it.
 *
 * That distinction is the whole reason this constant is assembled from parts
 * rather than written as one literal. Two competing utilities in one class
 * attribute — `px-3` and `px-4`, say — are not resolved by their order in the
 * string; they are resolved by their order in the COMPILED stylesheet, which
 * neither this file nor the caller controls. Appending a touch size to a base
 * that already bakes in `px-3 py-1.5 text-sm` would therefore render one size
 * or the other essentially at random, and look fine in review either way.
 *
 * Composed below in the original order, so `INPUT_BASE` is byte-identical to
 * what it has always been — it and `inputClasses` are public exports, so their
 * exact values are contract. `tests/touchPrimitives.test.tsx` pins that.
 */
const INPUT_SHAPE_PRE = 'block w-full rounded-md border border-gray-300 bg-white';
const INPUT_SHAPE_POST =
  'text-gray-800 placeholder:text-gray-400 shadow-sm ' +
  'focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30';

/** `sm`/`md`/`lg` are the desktop ladder; `touch` is a finger on glass. See
 *  ButtonSize for why touch is a separate rung rather than the top of this
 *  ladder — a till's idea of "large" is 56px, and one word cannot mean both. */
export type InputSize = 'sm' | 'md' | 'lg' | 'touch';

export const INPUT_SIZES: Record<InputSize, string> = {
  // The desktop rungs carry no explicit height: a text control's height should
  // follow its own font, or a long label wraps out of a box that was pinned.
  // The touch rung does carry one, for the same reason Button's does.
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-3.5 py-2 text-base',
  // 56px, matching Button's `touch`. `text-base` is 16px BY AGREEMENT with the
  // rule in ui.css that forces `font-size: 16px !important` on every form
  // control under `(pointer: coarse)` — the rule that stops iOS zooming the
  // viewport on focus. Picking anything else here would render one size on a
  // desktop and 16px on the device the size was chosen for.
  touch: 'h-14 px-4 text-base',
};

/** Base look for a text-bearing form control. Native <input>/<select>/<textarea>
 *  also receive dark styling for free via the global rule in styles.css. */
export const INPUT_BASE = `${INPUT_SHAPE_PRE} ${INPUT_SIZES.md} ${INPUT_SHAPE_POST}`;

/** Error-state ring/border, layered on top of INPUT_BASE. */
export const INPUT_INVALID =
  'border-red-300 focus:border-red-400 focus:ring-red-400/30';

/** Disabled affordance — opacity-based so it stays correct in every theme. */
export const INPUT_DISABLED = 'disabled:cursor-not-allowed disabled:opacity-60';

/** Compose the input classes for a control. Omitting `size` — or passing the
 *  default `md` — yields exactly `INPUT_BASE`, so every existing caller is
 *  unaffected. */
export function inputClasses(opts?: { invalid?: boolean; size?: InputSize; className?: string }): string {
  const shape = opts?.size && opts.size !== 'md'
    ? `${INPUT_SHAPE_PRE} ${INPUT_SIZES[opts.size]} ${INPUT_SHAPE_POST}`
    : INPUT_BASE;
  return [shape, opts?.invalid ? INPUT_INVALID : '', INPUT_DISABLED, opts?.className ?? '']
    .filter(Boolean)
    .join(' ');
}
