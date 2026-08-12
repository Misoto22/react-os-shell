import { Avatar } from 'react-os-shell';

// Avatar — circular image with initials fallback, sizes, and a status dot.

export function SizesAndStatus() {
  return (
    <div className="flex items-center gap-4 p-5">
      <Avatar size="xs" name="Alice Nguyen" />
      <Avatar size="sm" name="Marco Reyes" status="online" />
      <Avatar size="md" name="Priya Patel" status="busy" />
      <Avatar size="lg" name="Tom Becker" status="away" />
    </div>
  );
}

export function ImageThatFails() {
  // The URL 404s on purpose: this is what a deleted upload or an expired CDN
  // link looks like now, and it is the same frame as the no-photo case.
  return (
    <div className="flex items-center gap-4 p-5">
      <Avatar size="lg" src="/does-not-exist.png" name="Henry Chen" />
      <Avatar size="lg" name="Henry Chen" />
    </div>
  );
}
