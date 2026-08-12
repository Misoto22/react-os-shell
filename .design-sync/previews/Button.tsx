import { Button } from 'react-os-shell';

// Button — variants (primary follows the active accent), sizes, loading and
// icon states. Controlled like a native button.

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-5">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Delete</Button>
    </div>
  );
}

export function SizesAndStates() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-5">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button loading>Saving…</Button>
      <Button disabled>Disabled</Button>
      <Button leftIcon={<span aria-hidden>＋</span>}>New item</Button>
    </div>
  );
}

export function DesktopLadderAndLink() {
  // The three desktop rungs together — the point of `lg` is the gap it fills,
  // which only reads next to its neighbours. `link` beside them shows what it
  // gives up: the box, not the scale.
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      <p className="text-sm text-gray-600">
        Signed in as henry@example.com. <Button variant="link">Use a different account</Button>
      </p>
    </div>
  );
}
