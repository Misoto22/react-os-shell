import { Text, Title, Paragraph, Stack } from 'react-os-shell';

// Text / Title / Paragraph — typography. Tones are SEMANTIC and resolve to
// utility classes the dark-mode remaps know, so text stays legible in both
// themes without the caller thinking about it.

export function Tones() {
  return (
    <Stack gap={2} className="p-5">
      <Text>Default — the thing itself</Text>
      <Text tone="secondary">Secondary — supporting detail</Text>
      <Text tone="tertiary">Tertiary — metadata, timestamps</Text>
      <Text tone="danger">Danger — this failed</Text>
      <Text tone="success">Success — this worked</Text>
      <Text tone="warning">Warning — check this</Text>
      <Text tone="link">Link — go somewhere</Text>
    </Stack>
  );
}

export function Headings() {
  return (
    <Stack gap={3} className="p-5">
      <Title level={1}>Order INV-00421</Title>
      <Title level={2}>Shipment details</Title>
      <Title level={3}>Line items</Title>
      <Paragraph>
        Body copy sits at the secondary tone by default, because it is almost
        always supporting the heading above it rather than competing with it.
      </Paragraph>
    </Stack>
  );
}
