import { Card, Button } from 'react-os-shell';

// Card — the kit's standard surface, with optional header/footer rows.

export function Variants() {
  return (
    <div className="max-w-md space-y-4 p-5">
      <Card header="Team plan">
        <p className="text-sm text-gray-600">Unlimited projects, priority support, and SSO.</p>
      </Card>
      <Card
        header="Invite teammates"
        footer={<div className="flex justify-end"><Button size="sm">Send invites</Button></div>}
      >
        <p className="text-sm text-gray-600">Add members to your workspace by email.</p>
      </Card>
    </div>
  );
}

export function TitledRegion() {
  // Visually identical to the plain header form — the difference is entirely
  // in the document outline, which is the point worth reviewing: the title is
  // a real heading and the card is a region named by it.
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2">
      <Card header="Plain header">A bold div, and a card that is a div.</Card>
      <Card header="Titled region" headingLevel={2}>
        An h2, and a section named by it.
      </Card>
    </div>
  );
}
