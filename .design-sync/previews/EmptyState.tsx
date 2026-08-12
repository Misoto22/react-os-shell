import { EmptyState, Button } from 'react-os-shell';

// EmptyState — placeholder for empty lists/panes. One component, configurable
// frame (dashed | card | none) and an optional action slot.

export function Dashed() {
  return (
    <div className="p-5">
      <EmptyState message="No invoices match these filters." hint="Try clearing the date range." />
    </div>
  );
}

export function Card() {
  return (
    <div className="p-5">
      <EmptyState variant="card" title="No sales orders yet" description="Create your first order to see it here." />
    </div>
  );
}

export function WithAction() {
  return (
    <div className="p-5">
      <EmptyState title="No warehouses" message="You haven't added any warehouses.">
        <Button variant="primary">Add warehouse</Button>
      </EmptyState>
    </div>
  );
}

export function WithItsOwnIcon() {
  // The point of the change: the icon says what the page is, instead of every
  // empty state in every app being the same inbox.
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2">
      <EmptyState title="No orders yet" description="Orders you place appear here." />
      <EmptyState
        title="No wheels match"
        description="Try widening the size range."
        icon={
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
        }
      />
    </div>
  );
}
