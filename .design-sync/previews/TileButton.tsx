import { TileButton } from 'react-os-shell';

// TileButton — a large self-labelling tile for a grid of choices. Fixed height
// so a grid lines up whether or not each tile has a subtitle; left-aligned
// because the eye scans down the left edge looking for a name.

export function Catalogue() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-3 p-5">
      <TileButton title="Wheel 18in Alloy" subtitle="$420.00" />
      <TileButton title="Wheel 20in Forged" subtitle="$780.00" selected />
      <TileButton title="Centre Cap" subtitle="$24.00" />
      <TileButton title="Lug Nut Set" subtitle="$36.00" />
      <TileButton title="Tyre 245/40R18" subtitle="No price" disabled />
      <TileButton title="Valve Stem" subtitle="$4.50" />
    </div>
  );
}

export function Sizes() {
  return (
    <div className="grid max-w-md grid-cols-2 gap-3 p-5">
      <TileButton size="md" title="Medium" subtitle="96px tall" />
      <TileButton size="lg" title="Large" subtitle="128px tall" />
    </div>
  );
}
