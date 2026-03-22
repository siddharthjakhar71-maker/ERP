import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableActionButton, TableActionButtons, TableActionLink, tableActionIcons } from '@/components/shared/table-action-buttons';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeleteGrn, useGrns } from '@/hooks/use-grns';
import type { GrnListRecord, GrnStatus } from '@/types';

export const GrnListPage = () => {
  const [status, setStatus] = useState<GrnStatus | ''>('');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GrnListRecord | null>(null);
  const grns = useGrns({ status, q: query.trim() || undefined });
  const deleteGrn = useDeleteGrn();
  const rows = useMemo(() => grns.data ?? [], [grns.data]);

  return (
    <div className="space-y-8">
      <PageHeader title="Goods receipt notes" description="Create, review, and maintain GRNs against purchase orders with partial and full receipt visibility." actions={<Link to="/grn/new" search={{ purchaseOrderId: undefined }} className={buttonVariants()}><Plus className="mr-2 h-4 w-4" />Create GRN</Link>} />
      <ModuleToolbar filters={<><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by GRN number, PO, vendor, or site" /><select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as GrnStatus | '')}><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option></select></>} meta={`${rows.length} GRNs in view`} />
      {grns.isLoading ? <div className="text-sm text-muted-foreground">Loading GRNs...</div> : null}
      {grns.error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load GRNs.</div> : null}
      {!grns.isLoading && !grns.error && rows.length === 0 ? <EmptyState title="No GRNs found" description="Create the first goods receipt note or clear filters to widen the result set." /> : null}
      {!grns.isLoading && !grns.error && rows.length > 0 ? <DataTable rows={rows} columns={[
        { key: 'grnNumber', title: 'GRN', render: (row: GrnListRecord) => <div><p className="font-medium">{row.grnNumber}</p><p className="text-xs text-muted-foreground">{row.itemCount} items • Qty {row.totalReceivedQty}</p></div> },
        { key: 'purchaseOrder', title: 'PO', render: (row: GrnListRecord) => row.purchaseOrder.poNumber },
        { key: 'vendor', title: 'Vendor', render: (row: GrnListRecord) => <div><p>{row.vendor.name}</p><p className="text-xs text-muted-foreground">{row.vendor.vendorCode}</p></div> },
        { key: 'site', title: 'Site', render: (row: GrnListRecord) => <div><p>{row.site.name}</p><p className="text-xs text-muted-foreground">{row.site.siteCode}</p></div> },
        { key: 'receivedAt', title: 'Received date', render: (row: GrnListRecord) => new Date(row.receivedAt).toLocaleDateString() },
        { key: 'status', title: 'Status', render: (row: GrnListRecord) => <StatusBadge status={row.status} /> },
        { key: 'actions', title: 'Actions', className: 'w-32 text-center', render: (row: GrnListRecord) => <TableActionButtons><TableActionLink label="View" to="/grn/$grnId" params={{ grnId: row.id }} icon={tableActionIcons.view} /><TableActionLink label="Edit" to="/grn/$grnId/edit" params={{ grnId: row.id }} icon={tableActionIcons.edit} /><TableActionButton label="Delete" icon={tableActionIcons.delete} onClick={() => setDeleteTarget(row)} /></TableActionButtons> },
      ]} /> : null}
      <ConfirmDeleteDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete GRN" description={`This will permanently remove ${deleteTarget?.grnNumber ?? 'this GRN'} and roll back its received quantities from the linked purchase order.`} isDeleting={deleteGrn.isPending} onConfirm={async () => { if (!deleteTarget) return; await deleteGrn.mutateAsync(deleteTarget.id); setDeleteTarget(null); }} />
    </div>
  );
};
