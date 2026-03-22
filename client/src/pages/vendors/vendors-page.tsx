import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { TableActionButton, TableActionButtons, tableActionIcons } from '@/components/shared/table-action-buttons';
import { FormModal } from '@/components/shared/form-modal';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currency } from '@/lib/utils';
import { useCreateVendor, useDeleteVendor, useUpdateVendor, useVendors } from '@/hooks/use-vendors';
import { VendorForm } from './vendor-form';
import type { VendorPayload, VendorRecord, VendorStatus } from '@/types';

export const VendorsPage = () => {
  const [status, setStatus] = useState<VendorStatus | ''>('');
  const [query, setQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<VendorRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorRecord | null>(null);

  const { data = [], isLoading, error } = useVendors({ status, q: query.trim() || undefined });
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const rows = useMemo(() => data, [data]);

  const closeForm = () => {
    setShowForm(false);
    setSelectedVendor(null);
  };

  const handleSubmit = async (values: VendorPayload) => {
    if (selectedVendor) {
      await updateVendor.mutateAsync({ id: selectedVendor.id, payload: values });
    } else {
      await createVendor.mutateAsync(values);
    }
    closeForm();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vendor management"
        description="Manage supplier masters with live ERP data, onboarding controls, balances, and day-to-day CRUD operations."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add vendor
          </Button>
        }
      />

      <ModuleToolbar
        filters={(
          <>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by vendor name, code, city, phone, or contact" />
            <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as VendorStatus | '')}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_hold">On Hold</option>
            </select>
          </>
        )}
        meta={`${rows.length} vendors in view`}
      />

      {isLoading ? <div className="text-sm text-muted-foreground">Loading vendors...</div> : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load vendors.</div> : null}
      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState title="No vendors found" description="Add your first vendor or widen the current filters to see supplier records." />
      ) : null}
      {!isLoading && !error && rows.length > 0 ? (
        <DataTable<VendorRecord>
          rows={rows}
          columns={[
            { key: 'name', title: 'Vendor', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.vendorCode}</p></div> },
            { key: 'contactPerson', title: 'Contact', render: (row) => <div><p>{row.contactPerson || '—'}</p><p className="text-xs text-muted-foreground">{row.email || 'No email'}</p></div> },
            { key: 'city', title: 'Location', render: (row) => <div><p>{row.city || '—'}</p><p className="text-xs text-muted-foreground">{row.state || '—'}</p></div> },
            { key: 'gstin', title: 'GSTIN', render: (row) => row.gstin || '—' },
            { key: 'outstandingBalance', title: 'Outstanding', render: (row) => currency.format(row.outstandingBalance) },
            { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              title: 'Actions',
              className: 'w-24 text-center',
              render: (row) => (
                <TableActionButtons>
                  <TableActionButton label="Edit" icon={tableActionIcons.edit} onClick={() => { setSelectedVendor(row); setShowForm(true); }} />
                  <TableActionButton label="Delete" icon={tableActionIcons.delete} onClick={() => setVendorToDelete(row)} />
                </TableActionButtons>
              ),
            },
          ]}
        />
      ) : null}

      <FormModal
        open={showForm}
        onOpenChange={(open) => { if (!open) closeForm(); else setShowForm(open); }}
        title={selectedVendor ? 'Edit vendor' : 'Add vendor'}
        description={selectedVendor ? 'Update vendor master data and commercial details.' : 'Create a production-ready vendor master record.'}
      >
        <VendorForm
          vendor={selectedVendor}
          isSubmitting={createVendor.isPending || updateVendor.isPending}
          onCancel={closeForm}
          onSubmit={handleSubmit}
        />
      </FormModal>

      <ConfirmDeleteDialog
        open={Boolean(vendorToDelete)}
        onOpenChange={(open) => { if (!open) setVendorToDelete(null); }}
        title="Delete vendor"
        description={`This will permanently remove ${vendorToDelete?.name ?? 'this vendor'} from the ERP master data.`}
        isDeleting={deleteVendor.isPending}
        onConfirm={async () => {
          if (!vendorToDelete) return;
          await deleteVendor.mutateAsync(vendorToDelete.id);
          setVendorToDelete(null);
        }}
      />
    </div>
  );
};
