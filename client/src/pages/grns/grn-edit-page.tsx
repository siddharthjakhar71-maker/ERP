import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import { GrnForm } from '@/components/grns/grn-form';
import { GrnPageLayout } from '@/components/grns/grn-layout';
import { buttonVariants } from '@/components/ui/button';
import { useGrn, useGrnReceiptOptions, useUpdateGrn } from '@/hooks/use-grns';
import { cn } from '@/lib/utils';
import type { GrnPayload } from '@/types';

export const GrnEditPage = () => {
  const navigate = useNavigate();
  const { grnId } = useParams({ from: '/app/grn/$grnId/edit' });
  const grn = useGrn(grnId, true);
  const receiptOptions = useGrnReceiptOptions(grn.data?.purchaseOrderId, Boolean(grn.data?.purchaseOrderId));
  const updateGrn = useUpdateGrn();

  const handleSubmit = async (payload: GrnPayload) => {
    await updateGrn.mutateAsync({ id: grnId, payload });
    await navigate({ to: '/grn/$grnId', params: { grnId } });
  };

  return (
    <GrnPageLayout eyebrow="GRN" title={grn.data ? `Edit ${grn.data.grnNumber}` : 'Edit GRN'} description="Update receipt headers and item-wise receipt quantities while preserving PO quantity controls." actions={<><Link to="/grn/$grnId" params={{ grnId }} className={buttonVariants({ variant: 'outline' })}>View GRN</Link><div className={cn(buttonVariants(), 'pointer-events-none opacity-70')}><Save className="mr-2 h-4 w-4" />Editing</div></>}>
      {grn.isLoading || receiptOptions.isLoading ? <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading GRN workspace...</div> : grn.error || receiptOptions.error || !grn.data || !receiptOptions.data ? <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load GRN.</div> : <GrnForm grn={grn.data} receiptOptions={receiptOptions.data} isSubmitting={updateGrn.isPending} onCancel={() => navigate({ to: '/grn/$grnId', params: { grnId } })} onSubmit={handleSubmit} />}
    </GrnPageLayout>
  );
};
