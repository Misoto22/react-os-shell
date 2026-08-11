import { Stack, Inline, Grid, Card, Button } from 'react-os-shell';

// Stack / Inline / Grid — layout. Gaps and column counts are closed unions
// mapped to literal Tailwind classes: an interpolated `gap-${n}` compiles to
// nothing and silently renders flush.

export function Layouts() {
  const cell = (n: number) => (
    <Card key={n} padding="sm"><span className="text-sm text-gray-600">Cell {n}</span></Card>
  );
  return (
    <Stack gap={6} className="p-5">
      <Inline gap={2}>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost">Reset</Button>
      </Inline>
      <Grid cols={1} smCols={2} lgCols={4} gap={3}>
        {[1, 2, 3, 4].map(cell)}
      </Grid>
    </Stack>
  );
}
