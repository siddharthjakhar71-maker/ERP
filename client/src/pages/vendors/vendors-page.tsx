import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { currency } from '@/lib/utils';
import { useVendors } from '@/hooks/use-vendors';
import { VendorForm } from './vendor-form';
import type { VendorRecord } from '@/types';

export const VendorsPage = () => {
  const [status, setStatus] = useState<string>('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data = [], isLoading } = useVendors(status || undefined);

  const rows = useMemo(
    () => data.filter((vendor) => [vendor.name, vendor.code, vendor.city].join(' ').toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vendor management"
        description="Centralize supplier onboarding, commercial terms, payment exposure, and recent procurement touchpoints."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Close form' : 'Add vendor'}
          </Button>
        }
      />
      {showForm ? (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Create vendor</h3>
            <p className="text-sm text-muted-foreground">Store essential vendor, contact, and payment configuration data.</p>
          </div>
          <VendorForm />
        </Card>
      ) : null}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by vendor name, code, or city" />
            <select
              className="h-11 rounded-2xl border border-input bg-background px-4 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{rows.length} vendors in view</div>
        </div>
      </Card>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading vendors...</div>
      ) : (
        <DataTable<VendorRecord>
          rows={rows}
          columns={[
            { key: 'name', title: 'Vendor', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.code}</p></div> },
            { key: 'contactPerson', title: 'Contact', render: (row) => <div><p>{row.contactPerson}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
            { key: 'city', title: 'Location' },
            { key: 'paymentTermsDays', title: 'Payment Terms', render: (row) => `${row.paymentTermsDays} days` },
            { key: 'outstandingBalance', title: 'Outstanding', render: (row) => currency.format(row.outstandingBalance) },
            { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      )}
    </div>
  );
};
