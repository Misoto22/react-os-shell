/**
 * Squarified treemap layout, as a pure function.
 *
 * Kept out of the component for the reason the scales are: a layout is data →
 * geometry and nothing else, so it is the part worth testing directly and the
 * part a consumer with its own renderer can reuse.
 *
 * "Squarified" is the Bruls–Huizing–van Wijk algorithm, and the naive
 * alternative is why it exists. Slicing the rectangle strictly alternately
 * produces slivers — cells so long and thin their area is unreadable and their
 * label does not fit. Squarify instead grows a row only while doing so improves
 * the worst aspect ratio in it, then lays the row down and starts another. The
 * result is cells near square, which is what makes area comparable by eye.
 */

export interface TreemapItem {
  key: string;
  label: string;
  value: number;
}

export interface TreemapTile extends TreemapItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Frame { x: number; y: number; width: number; height: number }

/** Worst aspect ratio in a row, given the row's total and the side it sits on. */
function worst(row: number[], sum: number, side: number): number {
  if (row.length === 0 || sum <= 0 || side <= 0) return Infinity;
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

function layoutRow(row: TreemapItem[], sum: number, frame: Frame, vertical: boolean): { tiles: TreemapTile[]; rest: Frame } {
  const side = vertical ? frame.height : frame.width;
  const thickness = side > 0 ? sum / side : 0;
  let offset = 0;
  const tiles = row.map(item => {
    const length = sum > 0 ? (item.value / sum) * side : 0;
    const tile: TreemapTile = vertical
      ? { ...item, x: frame.x, y: frame.y + offset, width: thickness, height: length }
      : { ...item, x: frame.x + offset, y: frame.y, width: length, height: thickness };
    offset += length;
    return tile;
  });
  const rest: Frame = vertical
    ? { x: frame.x + thickness, y: frame.y, width: frame.width - thickness, height: frame.height }
    : { x: frame.x, y: frame.y + thickness, width: frame.width, height: frame.height - thickness };
  return { tiles, rest };
}

export function squarify(
  items: TreemapItem[],
  width: number,
  height: number,
): TreemapTile[] {
  const positive = items.filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  if (positive.length === 0 || width <= 0 || height <= 0) return [];

  const total = positive.reduce((n, i) => n + i.value, 0);
  const area = width * height;
  // Work in AREA units so the row test compares like with like.
  const scaled = positive.map(i => ({ ...i, value: (i.value / total) * area }));

  const tiles: TreemapTile[] = [];
  let frame: Frame = { x: 0, y: 0, width, height };
  let row: typeof scaled = [];
  let rowSum = 0;
  let queue = [...scaled];

  while (queue.length > 0) {
    const next = queue[0];
    const side = Math.min(frame.width, frame.height);
    const vertical = frame.width >= frame.height;
    const current = worst(row.map(r => r.value), rowSum, side);
    const candidate = worst([...row.map(r => r.value), next.value], rowSum + next.value, side);

    if (row.length === 0 || candidate <= current) {
      row.push(next);
      rowSum += next.value;
      queue = queue.slice(1);
    } else {
      const laid = layoutRow(row, rowSum, frame, vertical);
      tiles.push(...laid.tiles);
      frame = laid.rest;
      row = [];
      rowSum = 0;
    }
  }

  if (row.length > 0) {
    tiles.push(...layoutRow(row, rowSum, frame, frame.width >= frame.height).tiles);
  }

  // Hand back the ORIGINAL values; the area scaling was an implementation
  // detail and a caller labelling a tile wants the number it passed in.
  const byKey = new Map(items.map(i => [i.key, i.value]));
  return tiles.map(t => ({ ...t, value: byKey.get(t.key) ?? t.value }));
}
