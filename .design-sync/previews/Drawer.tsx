import { useState } from 'react';
import { Drawer, Button, FormField, Input, Stack } from 'react-os-shell';

// Drawer — Dialog's modal contract in a different shape. Reach for it when the
// content is a list or a long form that wants height; reach for Dialog when it
// is a question that wants answering and dismissing.

export function EditPanel() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-5">
      <Button onClick={() => setOpen(true)}>Edit address</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit delivery address"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </>
        }
      >
        <Stack gap={3}>
          <FormField label="Nickname"><Input defaultValue="Warehouse" /></FormField>
          <FormField label="Street"><Input defaultValue="14 Kembla St" /></FormField>
          <FormField label="Suburb"><Input defaultValue="Fyshwick" /></FormField>
          <FormField label="Postcode"><Input defaultValue="2609" /></FormField>
        </Stack>
      </Drawer>
    </div>
  );
}
