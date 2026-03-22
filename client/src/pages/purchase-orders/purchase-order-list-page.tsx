import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { TableActionButton, TableActionButtons, TableActionLink, tableActionIcons } from '@/components/shared/table-action-buttons';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeletePurchaseOrder, usePurchaseOrders } from '@/hooks/use-purchase-orders';
import { currency } from '@/lib/utils';
import type { PurchaseOrderListRecord, PurchaseOrderStatus } from '@/types';

export const PurchaseOrderListPage = () => {
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderListRecord | null>(null);

  const purchaseOrders = usePurchaseOrders({ status, q: query.trim() || undefined });
  const deletePurchaseOrder = useDeletePurchaseOrder();
  const rows = useMemo(() => purchaseOrders.data ?? [], [purchaseOrders.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Purchase orders"
        description="Create, review, and maintain multi-line purchase orders with vendor, site, and material master integration."
        actions={(
          <Link to="/purchase-orders/new" className={buttonVariants()}><Plus className="mr-2 h-4 w-4" />Create PO</Link>
        )}
      />

      <ModuleToolbar
        filters={(
          <>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by PO number, vendor, or site" />
            <select className="h-11 rounded-2xl border border-input bg-background px-4 text-sm" value={status} onChange={(event) => setStatus(event.target.value as PurchaseOrderStatus | '')}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </>
        )}
        meta={`${rows.length} purchase orders in view`}
      />

      {purchaseOrders.isLoading ? <div className="text-sm text-muted-foreground">Loading purchase orders...</div> : null}
      {purchaseOrders.error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Failed to load purchase orders.</div> : null}
      {!purchaseOrders.isLoading && !purchaseOrders.error && rows.length === 0 ? <EmptyState title="No purchase orders found" description="Create the first purchase order or clear filters to widen the result set." /> : null}
      {!purchaseOrders.isLoading && !purchaseOrders.error && rows.length > 0 ? (
        <DataTable<PurchaseOrderListRecord>
          rows={rows}
          columns={[
            { key: 'poNumber', title: 'PO Number', render: (row) => <div><p className="font-medium">{row.poNumber}</p><p className="text-xs text-muted-foreground">{row.itemCount} items</p></div> },
            { key: 'vendor', title: 'Vendor', render: (row) => <div><p>{row.vendor.name}</p><p className="text-xs text-muted-foreground">{row.vendor.vendorCode}</p></div> },
            { key: 'site', title: 'Site', render: (row) => <div><p>{row.site.name}</p><p className="text-xs text-muted-foreground">{row.site.siteCode}</p></div> },
            { key: 'poDate', title: 'Date', render: (row) => new Date(row.poDate).toLocaleDateString() },
            { key: 'totalAmount', title: 'Amount', render: (row) => currency.format(row.totalAmount) },
            { key: 'status', title: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              title: 'Actions',
              className: 'w-32 text-center',
              render: (row) => (
                <TableActionButtons>
                  <TableActionLink label="View" to="/purchase-orders/$purchaseOrderId" params={{ purchaseOrderId: row.id }} icon={tableActionIcons.view} />
                  <TableActionLink label="Edit" to="/purchase-orders/$purchaseOrderId/edit" params={{ purchaseOrderId: row.id }} icon={tableActionIcons.edit} />
                  <TableActionButton label="Delete" icon={tableActionIcons.delete} onClick={() => setDeleteTarget(row)} />
                </TableActionButtons>
              ),
            },
          ]}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete purchase order"
        description={`This will permanently remove ${deleteTarget?.poNumber ?? 'this purchase order'} and all of its line items.`}
        isDeleting={deletePurchaseOrder.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deletePurchaseOrder.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
