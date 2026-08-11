import { useState } from 'react';
import { InputNumber, FormField, Stack } from 'react-os-shell';

// InputNumber — reports `number | null`. Keeps the raw text while you type, so
// "1." and a trailing zero survive the keystroke that follows them.

export function Quantities() {
  const [qty, setQty] = useState<number | null>(4);
  const [price, setPrice] = useState<number | null>(129.5);
  return (
    <Stack gap={4} className="max-w-xs p-5">
      <FormField label="Quantity"><InputNumber value={qty} onChange={setQty} min={1} max={999} precision={0} /></FormField>
      <FormField label="Unit price"><InputNumber value={price} onChange={setPrice} precision={2} prefix="$" /></FormField>
    </Stack>
  );
}
