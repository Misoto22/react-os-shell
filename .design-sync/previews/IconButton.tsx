import { IconButton, Inline, Card } from 'react-os-shell';

// IconButton — a button that is only an icon, so `aria-label` is required:
// there is no text to name it. Defaults to `ghost`, since an unlabelled button
// is nearly always a secondary action.

const Dots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);

const Trash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);

export function RowActions() {
  return (
    <Card className="max-w-sm p-4">
      <Inline gap={4} className="items-center justify-between">
        <span className="text-sm font-medium text-gray-800">Sales order SO-21371</span>
        <Inline gap={1}>
          <IconButton aria-label="More actions for SO-21371"><Dots /></IconButton>
          <IconButton variant="ghost-danger" aria-label="Delete SO-21371"><Trash /></IconButton>
        </Inline>
      </Inline>
    </Card>
  );
}

export function TouchSizes() {
  return (
    <Inline gap={3} className="items-center p-5">
      <IconButton size="md" aria-label="Menu"><Dots /></IconButton>
      <IconButton size="touch-sm" aria-label="Menu"><Dots /></IconButton>
      <IconButton size="touch" variant="primary" aria-label="Menu"><Dots /></IconButton>
    </Inline>
  );
}
