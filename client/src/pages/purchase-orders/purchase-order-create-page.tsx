import { Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/purchase-orders/purchase-order-form';
import { PurchaseOrderPageLayout } from '@/components/purchase-orders/purchase-order-layout';
import { buttonVariants } from '@/components/ui/button';
import { useMaterials } from '@/hooks/use-materials';
import { useCreatePurchaseOrder } from '@/hooks/use-purchase-orders';
import { useSites } from '@/hooks/use-sites';
import { useVendors } from '@/hooks/use-vendors';
import { cn } from '@/lib/utils';
import type { PurchaseOrderPayload } from '@/types';

export const PurchaseOrderCreatePage = () => {
  const navigate = useNavigate();
  const vendors = useVendors({ status: '', q: undefined });
  const sites = useSites({ status: '', q: undefined });
  const materials = useMaterials({ status: '', q: undefined, category: undefined, vendorId: undefined });
  const createPurchaseOrder = useCreatePurchaseOrder();

  const handleSubmit = async (payload: PurchaseOrderPayload) => {
    const purchaseOrder = await createPurchaseOrder.mutateAsync(payload);
    await navigate({ to: '/purchase-orders/$purchaseOrderId', params: { purchaseOrderId: purchaseOrder.id } });
  };

  return (
    <PurchaseOrderPageLayout
      eyebrow="Purchase order"
      title="Create purchase order"
      description="Build a production-ready purchase order using live vendor, site, and material masters in a full-width ERP workspace."
      actions={(
        <>
          <Link to="/purchase-orders" className={buttonVariants({ variant: 'outline' })}>Cancel</Link>
          <div className={cn(buttonVariants(), 'pointer-events-none opacity-70')}><Plus className="mr-2 h-4 w-4" />New PO</div>
        </>
      )}
    >
      {vendors.data && sites.data && materials.data ? (
        <PurchaseOrderForm
          vendors={vendors.data}
          sites={sites.data}
          materials={materials.data}
          isSubmitting={createPurchaseOrder.isPending}
          onCancel={() => navigate({ to: '/purchase-orders' })}
          onSubmit={handleSubmit}
        />
      ) : <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading form dependencies...</div>}
    </PurchaseOrderPageLayout>
  );
};
