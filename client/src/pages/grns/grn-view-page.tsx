import { Link, useParams } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { GrnPageLayout } from '@/components/grns/grn-layout';
import { GrnView } from '@/components/grns/grn-view';
import { buttonVariants } from '@/components/ui/button';
import { useGrn } from '@/hooks/use-grns';

export const GrnViewPage = () => {
  const { grnId } = useParams({ from: '/app/grn/$grnId' });
  const grn = useGrn(grnId, true);

  return (
    <GrnPageLayout eyebrow="GRN" title={grn.data ? grn.data.grnNumber : 'GRN details'} description="Review item-wise receipt posting, PO linkage, and vendor/site context in a dedicated ERP detail page." actions={grn.data ? <Link to="/grn/$grnId/edit" params={{ grnId }} className={buttonVariants()}><Pencil className="mr-2 h-4 w-4" />Edit GRN</Link> : null}>
      {grn.isLoading ? <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading GRN...</div> : null}
      {grn.error ? <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Failed to load GRN.</div> : null}
      {grn.data ? <GrnView grn={grn.data} /> : null}
    </GrnPageLayout>
  );
};
