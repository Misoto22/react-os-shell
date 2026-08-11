import { Divider, Stack, Inline, Text } from 'react-os-shell';

// Divider — a rule between sections, optionally labelled.

export function Rules() {
  return (
    <Stack gap={0} className="max-w-md p-5">
      <Text>Billing address</Text>
      <Divider />
      <Text>Delivery address</Text>
      <Divider>OR</Divider>
      <Text>Collect in store</Text>
      <Divider align="left">Advanced</Divider>
      <Inline gap={3}>
        <Text tone="secondary">Draft</Text>
        <Divider orientation="vertical" />
        <Text tone="secondary">Edited 2h ago</Text>
      </Inline>
    </Stack>
  );
}
