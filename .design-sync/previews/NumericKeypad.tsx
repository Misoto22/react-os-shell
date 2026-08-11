import { useState } from 'react';
import { NumericKeypad } from 'react-os-shell';

// NumericKeypad — on-screen amount entry for a touch device, so the OS keyboard
// never covers the screen. Keys are the 80px touch rung: this is the control a
// cashier hits most often, usually without looking.

export function Entry() {
  const [value, setValue] = useState('12.50');
  return (
    <div className="max-w-xs space-y-4 p-5">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-right text-3xl font-semibold text-gray-900">
        {value || '0'}
      </div>
      <NumericKeypad value={value} onChange={setValue} onEnter={() => {}} enterLabel="Tender" />
    </div>
  );
}

export function WithoutEnter() {
  const [value, setValue] = useState('');
  return (
    <div className="max-w-xs p-5">
      <NumericKeypad value={value} onChange={setValue} />
    </div>
  );
}
