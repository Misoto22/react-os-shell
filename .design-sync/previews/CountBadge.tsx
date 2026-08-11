import { CountBadge, Button, Inline } from 'react-os-shell';

// CountBadge — a count pinned to the corner of something. Zero renders nothing
// by default: a badge reading "0" trains people to stop looking.

export function Counts() {
  return (
    <Inline gap={6} className="p-5">
      <CountBadge count={3}><Button variant="secondary">Cart</Button></CountBadge>
      <CountBadge count={250} max={99}><Button variant="secondary">Inbox</Button></CountBadge>
      <CountBadge dot tone="accent"><Button variant="secondary">Updates</Button></CountBadge>
      <CountBadge count={0}><Button variant="secondary">Empty (hidden)</Button></CountBadge>
    </Inline>
  );
}
