import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form';
import { PurchaseOrderPageLayout } from '@/components/purchase-orders/purchase-order-layout';
import { buttonVariants } from '@/components/ui/button';
import { useMaterials } from '@/hooks/use-materials';
import { usePurchaseOrder, useUpdatePurchaseOrder } from '@/hooks/use-purchase-orders';
import { useSites } from '@/hooks/use-sites';
import { useVendors } from '@/hooks/use-vendors';
import { cn } from '@/lib/utils';
import type { PurchaseOrderPayload } from '@/types';

export const PurchaseOrderEditPage = () => {
  const navigate = useNavigate();
  const { purchaseOrderId } = useParams({ from: '/app/purchase-orders/$purchaseOrderId/edit' });
  const purchaseOrder = usePurchaseOrder(purchaseOrderId, true);
  const vendors = useVendors({ status: '', q: undefined });
  const sites = useSites({ status: '', q: undefined });
  const materials = useMaterials({ status: '', q: undefined, category: undefined });
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  const handleSubmit = async (payload: PurchaseOrderPayload) => {
    await updatePurchaseOrder.mutateAsync({ id: purchaseOrderId, payload });
    await navigate({ to: '/purchase-orders/$purchaseOrderId', params: { purchaseOrderId } });
  };

  return (
    <PurchaseOrderPageLayout
      eyebrow="Purchase order"
      title={purchaseOrder.data ? `Edit ${purchaseOrder.data.poNumber}` : 'Edit purchase order'}
      description="Update order header, line items, addresses, notes, and procurement status without the constraints of a modal form."
      actions={(
        <>
          <Link to="/purchase-orders/$purchaseOrderId" params={{ purchaseOrderId }} className={buttonVariants({ variant: 'outline' })}>View order</Link>
          <div className={cn(buttonVariants(), 'pointer-events-none opacity-70')}><Save className="mr-2 h-4 w-4" />Editing</div>
        </>
      )}
    >
      {purchaseOrder.isLoading || !vendors.data || !sites.data || !materials.data ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading purchase order workspace...</div>
      ) : purchaseOrder.error || !purchaseOrder.data ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load purchase order.</div>
      ) : (
        <PurchaseOrderForm
          purchaseOrder={purchaseOrder.data}
          vendors={vendors.data}
          sites={sites.data}
          materials={materials.data}
          isSubmitting={updatePurchaseOrder.isPending}
          onCancel={() => navigate({ to: '/purchase-orders/$purchaseOrderId', params: { purchaseOrderId } })}
          onSubmit={handleSubmit}
        />
      )}
    </PurchaseOrderPageLayout>
  );
};
