import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { GrnForm } from '@/components/grns/grn-form';
import { GrnPageLayout } from '@/components/grns/grn-layout';
import { buttonVariants } from '@/components/ui/button';
import { useCreateGrn, useGrnReceiptOptions } from '@/hooks/use-grns';
import { cn } from '@/lib/utils';
import type { GrnPayload } from '@/types';

export const GrnCreatePage = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: '/app/grn/new' }) as { purchaseOrderId?: string };
  const receiptOptions = useGrnReceiptOptions(search.purchaseOrderId, Boolean(search.purchaseOrderId));
  const createGrn = useCreateGrn();

  const handleSubmit = async (payload: GrnPayload) => {
    const grn = await createGrn.mutateAsync(payload);
    await navigate({ to: '/grn/$grnId', params: { grnId: grn.id } });
  };

  return (
    <GrnPageLayout eyebrow="GRN" title="Create goods receipt note" description="Post material receipts against a purchase order with multi-item, partial, and full-receipt support." actions={<><Link to="/grn" className={buttonVariants({ variant: 'outline' })}>Cancel</Link><div className={cn(buttonVariants(), 'pointer-events-none opacity-70')}><Plus className="mr-2 h-4 w-4" />New GRN</div></>}>
      {!search.purchaseOrderId ? <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Open a GRN from a purchase order detail page so the form can preload pending receipt lines.</div> : receiptOptions.isLoading ? <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading purchase order receipt options...</div> : receiptOptions.error || !receiptOptions.data ? <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load purchase order receipt options.</div> : <GrnForm receiptOptions={receiptOptions.data} isSubmitting={createGrn.isPending} onCancel={() => navigate({ to: '/grn' })} onSubmit={handleSubmit} />}
    </GrnPageLayout>
  );
};
