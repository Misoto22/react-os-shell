import { Statistic, Card, Grid } from 'react-os-shell';

// Statistic — one measured number with its label. StatCard is this plus a
// surface; use this when something else already provides the container.

export function Summary() {
  return (
    <Card className="m-5">
      <Grid cols={2} smCols={4} gap={6}>
        <Statistic title="Orders" value={128} />
        <Statistic title="Open value" value={48250.5} precision={2} prefix="$" />
        <Statistic title="Overdue" value={3} tone="danger" />
        <Statistic title="On time" value={97} suffix="%" tone="success" />
      </Grid>
    </Card>
  );
}
