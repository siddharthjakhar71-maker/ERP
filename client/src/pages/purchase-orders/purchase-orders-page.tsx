import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form';
import { PurchaseOrderView } from '@/components/purchase-orders/purchase-order-view';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { TableActionButton, TableActionButtons, tableActionIcons } from '@/components/shared/table-action-buttons';
import { FormModal } from '@/components/shared/form-modal';
import { ModuleToolbar } from '@/components/shared/module-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMaterials } from '@/hooks/use-materials';
import { useCreatePurchaseOrder, useDeletePurchaseOrder, usePurchaseOrder, usePurchaseOrders, useUpdatePurchaseOrder } from '@/hooks/use-purchase-orders';
import { useSites } from '@/hooks/use-sites';
import { useVendors } from '@/hooks/use-vendors';
import { currency } from '@/lib/utils';
import type { PurchaseOrderListRecord, PurchaseOrderPayload, PurchaseOrderStatus } from '@/types';

export const PurchaseOrdersPage = () => {
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderListRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const purchaseOrders = usePurchaseOrders({ status, q: query.trim() || undefined });
  const purchaseOrderDetail = usePurchaseOrder(selectedId, showForm && Boolean(selectedId));
  const purchaseOrderView = usePurchaseOrder(viewId, Boolean(viewId));
  const vendors = useVendors({ status: '', q: undefined });
  const sites = useSites({ status: '', q: undefined });
  const materials = useMaterials({ status: '', q: undefined, category: undefined });
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  const rows = useMemo(() => purchaseOrders.data ?? [], [purchaseOrders.data]);

  const closeForm = () => {
    setShowForm(false);
    setSelectedId(null);
  };

  const openCreate = () => {
    setSelectedId(null);
    setShowForm(true);
  };

  const handleSubmit = async (payload: PurchaseOrderPayload) => {
    if (selectedId) {
      await updatePurchaseOrder.mutateAsync({ id: selectedId, payload });
    } else {
      await createPurchaseOrder.mutateAsync(payload);
    }
    closeForm();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Purchase orders"
        description="Create, review, and maintain multi-line purchase orders with vendor, site, and material master integration."
        actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create PO</Button>}
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
                  <TableActionButton label="View" icon={tableActionIcons.view} onClick={() => setViewId(row.id)} />
                  <TableActionButton label="Edit" icon={tableActionIcons.edit} onClick={() => { setSelectedId(row.id); setShowForm(true); }} />
                  <TableActionButton label="Delete" icon={tableActionIcons.delete} onClick={() => setDeleteTarget(row)} />
                </TableActionButtons>
              ),
            },
          ]}
        />
      ) : null}

      <FormModal
        open={showForm}
        onOpenChange={(open) => { if (!open) closeForm(); else setShowForm(open); }}
        title={selectedId ? 'Edit purchase order' : 'Create purchase order'}
        description={selectedId ? 'Update order header, line items, totals, and procurement status.' : 'Build a multi-item purchase order using live vendor, site, and material masters.'}
      >
        {vendors.data && sites.data && materials.data ? (
          <PurchaseOrderForm
            purchaseOrder={selectedId ? purchaseOrderDetail.data : null}
            vendors={vendors.data}
            sites={sites.data}
            materials={materials.data}
            isSubmitting={createPurchaseOrder.isPending || updatePurchaseOrder.isPending || purchaseOrderDetail.isLoading}
            onCancel={closeForm}
            onSubmit={handleSubmit}
          />
        ) : <div className="text-sm text-muted-foreground">Loading form dependencies...</div>}
      </FormModal>

      <Dialog open={Boolean(viewId)} onOpenChange={(open) => { if (!open) setViewId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase order details</DialogTitle>
            <DialogDescription>Print-friendly procurement document view with line-level financial breakdown.</DialogDescription>
          </DialogHeader>
          {purchaseOrderView.isLoading ? <div className="text-sm text-muted-foreground">Loading purchase order...</div> : null}
          {purchaseOrderView.data ? <PurchaseOrderView purchaseOrder={purchaseOrderView.data} /> : null}
        </DialogContent>
      </Dialog>

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
