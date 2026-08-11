import { useState } from 'react';
import { Dialog, Button } from 'react-os-shell';

// Dialog — a modal sheet that interrupts, is answered, and goes away. NOT a
// shell window: no title bar, no minimise, no drag, not in the window manager's
// activation order. Focus is trapped inside it and the page behind cannot
// scroll while it is open.

export function Confirm() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-5">
      <Button onClick={() => setOpen(true)}>Delete invoice</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this invoice?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setOpen(false)}>Delete</Button>
          </>
        }
      >
        INV-00421 will be removed and its allocations reversed. This cannot be undone.
      </Dialog>
    </div>
  );
}

export function Blocking() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-5">
      <Button onClick={() => setOpen(true)}>Show blocking state</Button>
      <Dialog
        open={open}
        blocking
        onClose={() => setOpen(false)}
        title="This sale may have gone through"
        size="lg"
        footer={<Button onClick={() => setOpen(false)}>Check again</Button>}
      >
        Escape and the backdrop do nothing here — the operator has to resolve
        the state, not dismiss it.
      </Dialog>
    </div>
  );
}
