import { useState } from 'react';
import { Download } from 'lucide-react';
import { adaptPurchaseOrderToPdfDocument } from '@/features/purchase-orders/purchase-order-pdf-adapter';
import { downloadPurchaseOrderPdf } from '@/features/purchase-orders/purchase-order-pdf';
import { useSettings } from '@/hooks/use-settings';
import type { PurchaseOrderRecord } from '@/types';
import { Button } from '@/components/ui/button';

export const PurchaseOrderDownloadPdfButton = ({ purchaseOrder }: { purchaseOrder: PurchaseOrderRecord }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: settings } = useSettings();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isGenerating || !settings}
      onClick={() => {
        if (!settings) return;
        setIsGenerating(true);
        try {
          downloadPurchaseOrderPdf(adaptPurchaseOrderToPdfDocument(purchaseOrder, {
            theme: settings.poTheme,
            template: settings.poTemplate,
            layout: settings.poLayout,
          }));
        } finally {
          setTimeout(() => setIsGenerating(false), 300);
        }
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? 'Generating PDF...' : 'Download PDF'}
    </Button>
  );
};
