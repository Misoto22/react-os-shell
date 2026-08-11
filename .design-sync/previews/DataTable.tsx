import { useState } from 'react';
import { DataTable, StatusBadge } from 'react-os-shell';

// DataTable — renders and reports. It never sorts or paginates its own data:
// against a paginated endpoint that would sort ONE PAGE, which looks perfect
// on page one and silently disagrees on page two.

interface Order { id: string; number: string; customer: string; status: string; total: string }

const rows: Order[] = [
  { id: '1', number: 'SO-10241', customer: 'Regis Design', status: 'shipped', total: '$4,280.00' },
  { id: '2', number: 'SO-10242', customer: 'Inovit AU', status: 'pending', total: '$1,150.50' },
  { id: '3', number: 'SO-10243', customer: 'Northline Wheels', status: 'draft', total: '$780.00' },
  { id: '4', number: 'SO-10244', customer: 'Apex Automotive', status: 'shipped', total: '$12,400.00' },
];

export function Orders() {
  const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  return (
    <div className="p-5">
      <DataTable
        columns={[
          { key: 'number', title: 'Order', dataIndex: 'number', sortable: true, sortField: 'order_number', width: 140 },
          { key: 'customer', title: 'Customer', dataIndex: 'customer', sortable: true, ellipsis: true },
          { key: 'status', title: 'Status', render: r => <StatusBadge status={r.status} /> },
          { key: 'total', title: 'Total', dataIndex: 'total', align: 'right', sortable: true, sortField: 'grand_total' },
        ]}
        data={rows}
        rowKey="id"
        bordered
        sort={sort}
        onSortChange={setSort}
        pagination={{ page, pageCount: 6, onPageChange: setPage }}
        onRow={() => ({ onClick: () => {} })}
      />
    </div>
  );
}

export function Empty() {
  return (
    <div className="p-5">
      <DataTable
        columns={[{ key: 'number', title: 'Order', dataIndex: 'number' }, { key: 'customer', title: 'Customer', dataIndex: 'customer' }]}
        data={[]}
        rowKey="id"
        bordered
        emptyText="No orders match those filters"
      />
    </div>
  );
}
