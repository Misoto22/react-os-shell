import { Result, Button } from 'react-os-shell';

// Result — a full-page outcome. EmptyState means "nothing here yet"; this
// means something ended: succeeded, failed, or was refused.

export function NotFound() {
  return <Result status="404" subTitle="The page you followed may have moved." extra={<Button>Back to dashboard</Button>} />;
}

export function Success() {
  return <Result status="success" title="Order placed" subTitle="INV-00421 is confirmed. A copy is on its way to you." extra={<Button>View order</Button>} />;
}

export function Failed() {
  return <Result status="500" subTitle="The request did not complete. Nothing was charged." extra={<Button variant="secondary">Try again</Button>} />;
}
