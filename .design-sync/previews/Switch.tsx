import { useState } from 'react';
import { Switch, Stack } from 'react-os-shell';

// Switch — takes effect immediately. Use Checkbox inside a form, where the
// meaning is "this will be true when you save".

export function Settings() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  return (
    <Stack gap={4} className="max-w-md p-5">
      <Switch checked={a} onChange={setA} label="Default delivery address" hint="Used automatically at checkout." />
      <Switch checked={b} onChange={setB} label="Email me order updates" />
      <Switch checked={false} onChange={() => {}} disabled label="Managed by your administrator" />
    </Stack>
  );
}
