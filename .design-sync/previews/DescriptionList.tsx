import { DescriptionList } from 'react-os-shell';

// DescriptionList — label/value pairs for a record's detail panel. Renders
// dl/dt/dd, which is what this content actually is.

const items = [
  { label: 'Carrier', value: 'DHL Express' },
  { label: 'Tracking', value: '7712 4498 0031' },
  { label: 'Shipped', value: '8 Aug 2026' },
  { label: 'ETA', value: '14 Aug 2026' },
  { label: 'Incoterm', value: 'DAP' },
  { label: 'Weight', value: '412 kg' },
  { label: 'Delivery address', value: '14 Kembla St, Fyshwick ACT 2609, Australia', span: true },
];

export function Bordered() {
  return <div className="p-5"><DescriptionList title="Shipment" bordered columns={{ base: 1, sm: 2 }} items={items} /></div>;
}

export function Plain() {
  return <div className="p-5"><DescriptionList columns={{ base: 1, sm: 2, lg: 3 }} items={items} /></div>;
}
