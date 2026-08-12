import { useState } from 'react';
import { DatePicker, FormField, Stack } from 'react-os-shell';

// DatePicker — one date, on the platform's own date input. DateRangePicker is
// the other one: two dates and a rendered calendar. Values may be a Date or a
// `YYYY-MM-DD` string; onChange always hands back local midnight, or null.

export function DeliveryDate() {
  const [date, setDate] = useState<Date | null>(null);
  return (
    <Stack gap={4} className="max-w-sm p-5">
      <FormField label="Delivery date" hint="We ship on business days only.">
        <DatePicker value={date} onChange={setDate} min="2026-08-12" />
      </FormField>
      <FormField label="Invoice date" error="Choose a date on or before today.">
        <DatePicker value="2026-12-31" max={new Date()} invalid />
      </FormField>
    </Stack>
  );
}
