/**
 * The open-submenu path of a hover menu — the whole state machine <StartMenu>
 * uses to decide which flyouts are open, at any depth.
 *
 * ## Why this exists
 *
 * The menu used to have TWO mechanisms: one that opened a section's flyout
 * (`hoveredSection` + its timer) and a second, separately written one that
 * opened a flyout under an item inside that flyout (`hoveredChild` + its own
 * timer). They looked alike but behaved differently, and the second one had
 * the bugs — a stale close-timer from a sibling row could fire *after* a
 * submenu had opened and shut it under the cursor, which is what "the next
 * level is slow, or sometimes doesn't open at all" actually was. There was
 * also no third mechanism, so a 4th level simply never rendered.
 *
 * One path, one set of rules, any depth. Panels are numbered from the root
 * menu: panel 0 is the menu itself, and `path[i]` is the row that opened panel
 * `i + 1`. So `path.length` is the number of open flyouts, and closing
 * everything under panel `d` is just truncating the path to `d`.
 *
 * All of it is pure: hover geometry comes in as numbers, so the rules can be
 * tested without a DOM.
 */

/** One open flyout: which row opened it, and where it goes. */
export interface MenuAnchor {
  /** Identity of the row that opened this panel — a section label or an item
   *  route. Also what marks that row as the open one. */
  key: string;
  /** Viewport Y of the opening row's centre; the panel is centred on it. */
  y: number;
  /** Viewport X of the panel's left edge. Resolved when the row is hovered,
   *  because it depends on where the panel that owns the row ended up. */
  left: number;
  /** Whether this panel had to open to the LEFT of the one that owns its row.
   *  Carried so the next level down can keep going the same way. */
  flipped: boolean;
}

/**
 * Open `anchor` as the submenu of a row in panel `depth`, closing anything
 * deeper (the previous branch the user was down).
 *
 * Returns the SAME array when that panel is already open for that key and
 * nothing deeper is open, so a repeated `mouseenter` on a row the user is
 * already on can't re-render the menu — and can't reset the panel's open
 * animation.
 */
export function openMenuLevel(path: MenuAnchor[], depth: number, anchor: MenuAnchor): MenuAnchor[] {
  if (path.length === depth + 1 && path[depth].key === anchor.key) return path;
  return [...path.slice(0, depth), anchor];
}

/**
 * Close panel `depth + 1` and everything under it — what hovering a row with
 * no submenu, or leaving a panel, eventually leads to.
 *
 * Also identity-stable: nothing to close means the same array back.
 */
export function closeMenuBelow(path: MenuAnchor[], depth: number): MenuAnchor[] {
  const keep = Math.max(0, depth);
  return path.length > keep ? path.slice(0, keep) : path;
}

/**
 * The items each open panel shows: `[0]` is the flyout the root row opened,
 * `[1]` its child, and so on for as long as the path keeps resolving.
 *
 * Stops early rather than rendering an empty panel, so a path left over from a
 * branch that has since disappeared (a permission change, nav data swapped
 * under the menu) degrades to the levels that still exist.
 */
export function resolveMenuLevels<T extends { to: string }>(
  rootItems: T[],
  path: MenuAnchor[],
  childrenOf: (item: T) => T[],
): T[][] {
  if (path.length === 0 || rootItems.length === 0) return [];
  const levels: T[][] = [rootItems];
  for (let i = 1; i < path.length; i++) {
    const parent = levels[i - 1].find(item => item.to === path[i].key);
    const kids = parent ? childrenOf(parent) : [];
    if (kids.length === 0) break;
    levels.push(kids);
  }
  return levels;
}

/**
 * Where a panel of height `height` sits when centred on `anchorY`, kept inside
 * the usable vertical span (`minTop`..`maxBottom` — the viewport minus the
 * taskbar edge and a gutter).
 *
 * A panel taller than the span is pinned to the top of it and scrolls; that is
 * why the height is clamped before it is centred, and not after.
 */
export function clampMenuTop(anchorY: number, height: number, minTop: number, maxBottom: number): number {
  const span = Math.max(0, maxBottom - minTop);
  const h = Math.min(height, span);
  const top = anchorY - h / 2;
  if (top < minTop) return minTop;
  if (top + h > maxBottom) return Math.max(minTop, maxBottom - h);
  return top;
}

/**
 * Where a panel of width `width` sits horizontally: to the right of the panel
 * that owns the hovered row, or flipped to its left when there isn't room.
 *
 * The flip is what makes depth open-ended. Every level costs another panel
 * width, so a deep enough branch always runs out of screen — and a menu opened
 * from a right-hand taskbar runs out on the very first one.
 *
 * `preferLeft` keeps a branch that has already turned around going the same
 * way. Without it the levels ping-pong: one flips left over its grandparent,
 * the next finds room on the right again and lands back on top of its
 * grandparent, and the chain folds into two stacks of panels.
 */
export function menuPanelLeft(
  ownerLeft: number,
  ownerRight: number,
  width: number,
  viewportW: number,
  gap: number,
  preferLeft = false,
  margin = 8,
): { left: number; flipped: boolean } {
  const onRight = ownerRight + gap;
  const onLeft = ownerLeft - gap - width;
  const rightFits = onRight + width <= viewportW - margin;
  const leftFits = onLeft >= margin;
  if (preferLeft && leftFits) return { left: onLeft, flipped: true };
  if (rightFits) return { left: onRight, flipped: false };
  if (leftFits) return { left: onLeft, flipped: true };
  // Neither side fits: hug the edge the panel was heading for rather than
  // hang off the screen.
  return preferLeft
    ? { left: margin, flipped: true }
    : { left: Math.max(margin, viewportW - margin - width), flipped: false };
}
