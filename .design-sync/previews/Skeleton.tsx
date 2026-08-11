import { Skeleton, Card, Stack, Inline } from 'react-os-shell';

// Skeleton — a placeholder shaped like what is loading, so the page does not
// jump when data lands.

export function Shapes() {
  return (
    <Stack gap={4} className="max-w-md p-5">
      <Skeleton lines={3} />
      <Inline gap={3} align="start">
        <Skeleton variant="circle" height={40} />
        <Skeleton lines={2} />
      </Inline>
      <Card><Skeleton variant="rect" height={80} /></Card>
    </Stack>
  );
}
