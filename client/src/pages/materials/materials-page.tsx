import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { FormModal } from '@/components/shared/form-modal';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateMaterial, useDeleteMaterial, useMaterials, useUpdateMaterial } from '@/hooks/use-materials';
import type { MaterialPayload, MaterialRecord, ModuleStatus } from '@/types';
import { MaterialForm } from './material-form';

export const MaterialsPage = () => {
  const [status, setStatus] = useState<ModuleStatus | ''>('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<MaterialRecord | null>(null);

  const { data = [], isLoading, error } = useMaterials({ status, q: query.trim() || undefined, category: category.trim() || undefined });
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const categories = useMemo(() => [...new Set(data.map((item) => item.category))].sort(), [data]);

  const closeForm = () => {
    setShowForm(false);
    setSelectedMaterial(null);
  };

  const handleSubmit = async (values: MaterialPayload) => {
    if (selectedMaterial) {
      await updateMaterial.mutateAsync({ id: selectedMaterial.id, payload: values });
    } else {
      await createMaterial.mutateAsync(values);
    }
    closeForm();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Materials"
        description="Maintain material masters with live CRUD, category-level search, tax code controls, and reusable ERP records."
        actions={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Add material</Button>}
      />
      <ModuleToolbar
        filters={(
          <>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by material name, code, category, subcategory, unit, or HSN" />
            <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as ModuleStatus | '')}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        )}
        meta={`${data.length} materials in view`}
      />
      {isLoading ? <div className="text-sm text-muted-foreground">Loading materials...</div> : null}
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load materials.</div> : null}
      {!isLoading && !error && data.length === 0 ? <EmptyState title="No materials found" description="Add materials to start procurement planning and stock operations." /> : null}
      {!isLoading && !error && data.length > 0 ? (
        <DataTable<MaterialRecord>
          rows={data}
          columns={[
            { key: 'name', title: 'Material', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.materialCode}</p></div> },
            { key: 'category', title: 'Category', render: (row) => <div><p>{row.category}</p><p className="text-xs text-muted-foreground">{row.subcategory || '—'}</p></div> },
            { key: 'unit', title: 'Unit' },
            { key: 'hsnCode', title: 'HSN', render: (row) => row.hsnCode || '—' },
            { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'actions', title: 'Actions', className: 'w-36', render: (row) => <div className="flex gap-2"><Button type="button" variant="outline" className="h-9 px-3" onClick={() => { setSelectedMaterial(row); setShowForm(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Button type="button" variant="outline" className="h-9 px-3 text-destructive hover:text-destructive" onClick={() => setMaterialToDelete(row)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div> },
          ]}
        />
      ) : null}
      <FormModal open={showForm} onOpenChange={(open) => { if (!open) closeForm(); else setShowForm(open); }} title={selectedMaterial ? 'Edit material' : 'Add material'} description="Maintain material master data used across procurement and stock flows.">
        <MaterialForm material={selectedMaterial} isSubmitting={createMaterial.isPending || updateMaterial.isPending} onCancel={closeForm} onSubmit={handleSubmit} />
      </FormModal>
      <ConfirmDeleteDialog open={Boolean(materialToDelete)} onOpenChange={(open) => { if (!open) setMaterialToDelete(null); }} title="Delete material" description={`This will permanently remove ${materialToDelete?.name ?? 'this material'} from the material master.`} isDeleting={deleteMaterial.isPending} onConfirm={async () => { if (!materialToDelete) return; await deleteMaterial.mutateAsync(materialToDelete.id); setMaterialToDelete(null); }} />
    </div>
  );
};
