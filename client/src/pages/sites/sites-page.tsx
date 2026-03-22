import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { TableActionButton, TableActionButtons, tableActionIcons } from '@/components/shared/table-action-buttons';
import { EmptyState } from '@/components/shared/empty-state';
import { FormModal } from '@/components/shared/form-modal';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSite, useDeleteSite, useSites, useUpdateSite } from '@/hooks/use-sites';
import type { ModuleStatus, SitePayload, SiteRecord } from '@/types';
import { SiteForm } from './site-form';

export const SitesPage = () => {
  const [status, setStatus] = useState<ModuleStatus | ''>('');
  const [query, setQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<SiteRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<SiteRecord | null>(null);

  const { data = [], isLoading, error } = useSites({ status, q: query.trim() || undefined });
  const createSite = useCreateSite();
  const updateSite = useUpdateSite();
  const deleteSite = useDeleteSite();

  const closeForm = () => {
    setShowForm(false);
    setSelectedSite(null);
  };

  const handleSubmit = async (values: SitePayload) => {
    if (selectedSite) {
      await updateSite.mutateAsync({ id: selectedSite.id, payload: values });
    } else {
      await createSite.mutateAsync(values);
    }
    closeForm();
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Sites" description="Track project sites with production-ready CRUD, searchable addresses, and deployment-ready master data." actions={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Add site</Button>} />
      <ModuleToolbar
        filters={(
          <>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by site name, code, location, or address" />
            <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as ModuleStatus | '')}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        )}
        meta={`${data.length} sites in view`}
      />
      {isLoading ? <div className="text-sm text-muted-foreground">Loading sites...</div> : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load sites.</div> : null}
      {!isLoading && !error && data.length === 0 ? <EmptyState title="No sites found" description="Add sites to map procurement and inventory operations to live projects." /> : null}
      {!isLoading && !error && data.length > 0 ? (
        <DataTable<SiteRecord>
          rows={data}
          columns={[
            { key: 'name', title: 'Site', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.siteCode}</p></div> },
            { key: 'location', title: 'Location', render: (row) => row.location || '—' },
            { key: 'address', title: 'Address', render: (row) => row.address || '—' },
            { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'actions', title: 'Actions', className: 'w-24 text-center', render: (row) => <TableActionButtons><TableActionButton label="Edit" icon={tableActionIcons.edit} onClick={() => { setSelectedSite(row); setShowForm(true); }} /><TableActionButton label="Delete" icon={tableActionIcons.delete} onClick={() => setSiteToDelete(row)} /></TableActionButtons> },
          ]}
        />
      ) : null}
      <FormModal open={showForm} onOpenChange={(open) => { if (!open) closeForm(); else setShowForm(open); }} title={selectedSite ? 'Edit site' : 'Add site'} description="Maintain project site master data with location and address controls.">
        <SiteForm site={selectedSite} isSubmitting={createSite.isPending || updateSite.isPending} onCancel={closeForm} onSubmit={handleSubmit} />
      </FormModal>
      <ConfirmDeleteDialog open={Boolean(siteToDelete)} onOpenChange={(open) => { if (!open) setSiteToDelete(null); }} title="Delete site" description={`This will permanently remove ${siteToDelete?.name ?? 'this site'} from the site master.`} isDeleting={deleteSite.isPending} onConfirm={async () => { if (!siteToDelete) return; await deleteSite.mutateAsync(siteToDelete.id); setSiteToDelete(null); }} />
    </div>
  );
};
