import { Link, useParams } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { PurchaseOrderPageLayout } from '@/components/purchase-orders/purchase-order-layout';
import { PurchaseOrderDownloadPdfButton } from '@/components/purchase-orders/purchase-order-download-pdf-button';
import { PurchaseOrderView } from '@/components/purchase-orders/purchase-order-view';
import { buttonVariants } from '@/components/ui/button';
import { usePurchaseOrder } from '@/hooks/use-purchase-orders';

export const PurchaseOrderViewPage = () => {
  const { purchaseOrderId } = useParams({ from: '/app/purchase-orders/$purchaseOrderId' });
  const purchaseOrder = usePurchaseOrder(purchaseOrderId, true);

  return (
    <PurchaseOrderPageLayout
      eyebrow="Purchase order"
      title={purchaseOrder.data ? purchaseOrder.data.poNumber : 'Purchase order details'}
      description="Review vendor, site, address, line-item, and financial details in a dedicated ERP detail page."
      actions={purchaseOrder.data ? <div className="flex flex-wrap gap-3"><PurchaseOrderDownloadPdfButton purchaseOrder={purchaseOrder.data} /><Link to="/purchase-orders/$purchaseOrderId/edit" params={{ purchaseOrderId }} className={buttonVariants()}><Pencil className="mr-2 h-4 w-4" />Edit purchase order</Link></div> : null}
    >
      {purchaseOrder.isLoading ? <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading purchase order...</div> : null}
      {purchaseOrder.error ? <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load purchase order.</div> : null}
      {purchaseOrder.data ? <PurchaseOrderView purchaseOrder={purchaseOrder.data} /> : null}
    </PurchaseOrderPageLayout>
  );
};
