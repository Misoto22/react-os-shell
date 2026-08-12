import { PageHeader, Button, Card } from 'react-os-shell';

// PageHeader — title, optional icon and breadcrumb trail, right-aligned
// actions. The trail is the kit's own Breadcrumbs, so it collapses and marks
// the current crumb the same way one anywhere else does.

const Box = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
  </svg>
);

export function CatalogueHeader() {
  return (
    <div className="p-6">
      <PageHeader
        title="Catalogue"
        description="Browse and order wheels at your dealer price"
        icon={<Box />}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => {} },
          { label: 'Catalogue' },
        ]}
        actions={<Button variant="secondary">Download CSV</Button>}
      />
      <Card className="p-6 text-sm text-gray-500">Page content</Card>
    </div>
  );
}
