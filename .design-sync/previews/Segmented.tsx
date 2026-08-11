import { useState } from 'react';
import { Segmented, Stack, Text } from 'react-os-shell';

// Segmented — mutually exclusive options, all visible. WITH a `name` it is a
// real radio group that submits; without one it is a button group for a UI
// mode. They look identical, which is why they are one component.

export function Modes() {
  const [view, setView] = useState('grid');
  const [pay, setPay] = useState('card');
  return (
    <Stack gap={5} className="p-5">
      <Stack gap={2}>
        <Text tone="secondary">Button group — a view toggle</Text>
        <Segmented
          value={view}
          onChange={setView}
          options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }, { value: 'map', label: 'Map' }]}
        />
      </Stack>
      <Stack gap={2}>
        <Text tone="secondary">Radio group — submits as `payment`</Text>
        <Segmented
          name="payment"
          value={pay}
          onChange={setPay}
          options={[{ value: 'card', label: 'Card' }, { value: 'account', label: 'On account' }, { value: 'cod', label: 'On delivery', disabled: true }]}
        />
      </Stack>
    </Stack>
  );
}
