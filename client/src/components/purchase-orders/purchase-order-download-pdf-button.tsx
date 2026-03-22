import { useState } from 'react';
import { Download } from 'lucide-react';
import { adaptPurchaseOrderToPdfDocument } from '@/features/purchase-orders/purchase-order-pdf-adapter';
import { downloadPurchaseOrderPdf } from '@/features/purchase-orders/purchase-order-pdf';
import type { PurchaseOrderRecord } from '@/types';
import { Button } from '@/components/ui/button';

export const PurchaseOrderDownloadPdfButton = ({ purchaseOrder }: { purchaseOrder: PurchaseOrderRecord }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isGenerating}
      onClick={() => {
        setIsGenerating(true);
        try {
          downloadPurchaseOrderPdf(adaptPurchaseOrderToPdfDocument(purchaseOrder));
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
