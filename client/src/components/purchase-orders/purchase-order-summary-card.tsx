import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { currency } from '@/lib/utils';
import type { PurchaseOrderStatus } from '@/types';

interface PurchaseOrderSummaryCardProps {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  footer?: ReactNode;
}

export const PurchaseOrderSummaryCard = ({ subtotal, taxAmount, discountAmount, totalAmount, status, footer }: PurchaseOrderSummaryCardProps) => (
  <Card className="border-border bg-card/80 p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Order summary</p>
        <p className="mt-1 text-xs text-muted-foreground">Live financial totals with current procurement status.</p>
      </div>
      <StatusBadge status={status} />
    </div>

    <div className="mt-6 space-y-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{currency.format(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Tax</span>
        <span className="font-medium">{currency.format(taxAmount)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Discount</span>
        <span className="font-medium">{currency.format(discountAmount)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-4 text-base font-semibold">
        <span>Grand total</span>
        <span>{currency.format(totalAmount)}</span>
      </div>
    </div>

    {footer ? <div className="mt-6 border-t border-border pt-5">{footer}</div> : null}
  </Card>
);
