import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { currency } from '@/lib/utils';
import type { PurchaseOrderRecord } from '@/types';

export const PurchaseOrderView = ({ purchaseOrder }: { purchaseOrder: PurchaseOrderRecord }) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Purchase Order</p>
        <h2 className="mt-2 text-2xl font-semibold">{purchaseOrder.poNumber}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Issued on {new Date(purchaseOrder.poDate).toLocaleDateString()}</p>
      </div>
      <StatusBadge status={purchaseOrder.status} />
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <p className="text-sm font-semibold">Vendor details</p>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{purchaseOrder.vendor.name}</p>
          <p>{purchaseOrder.vendor.vendorCode}</p>
          <p>{purchaseOrder.vendor.address || 'No vendor address'}</p>
          <p>{purchaseOrder.vendor.phone || 'No phone'}</p>
          <p>{purchaseOrder.vendor.email || 'No email'}</p>
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-sm font-semibold">Site details</p>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{purchaseOrder.site.name}</p>
          <p>{purchaseOrder.site.siteCode}</p>
          <p>{purchaseOrder.site.address || 'No site address'}</p>
          <p>{purchaseOrder.site.location || 'No site location'}</p>
          <p>Expected delivery: {purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</p>
        </div>
      </Card>
    </div>

    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60">
            <tr>
              {['Material', 'Description', 'Qty', 'Unit', 'Rate', 'Tax', 'Received', 'Pending', 'Line total'].map((label) => (
                <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {purchaseOrder.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3"><div><p className="font-medium">{item.material.name}</p><p className="text-xs text-muted-foreground">{item.material.materialCode}</p></div></td>
                <td className="px-4 py-3 text-muted-foreground">{item.description}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">{currency.format(item.rate)}</td>
                <td className="px-4 py-3">{item.taxPercent}% / {currency.format(item.taxAmount)}</td>
                <td className="px-4 py-3">{item.receivedQty}</td>
                <td className="px-4 py-3">{item.pendingQty}</td>
                <td className="px-4 py-3 font-medium">{currency.format(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <p className="text-sm font-semibold">Addresses & remarks</p>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <div><p className="font-medium text-foreground">Billing address</p><p>{purchaseOrder.billingAddress || 'Not provided'}</p></div>
          <div><p className="font-medium text-foreground">Shipping address</p><p>{purchaseOrder.shippingAddress || 'Not provided'}</p></div>
          <div><p className="font-medium text-foreground">Remarks</p><p>{purchaseOrder.remarks || 'No remarks'}</p></div>
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-sm font-semibold">Financial summary</p>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{currency.format(purchaseOrder.subtotal)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax</span><span>{currency.format(purchaseOrder.taxAmount)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Discount</span><span>{currency.format(purchaseOrder.discountAmount)}</span></div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold"><span>Total amount</span><span>{currency.format(purchaseOrder.totalAmount)}</span></div>
        </div>
      </Card>
    </div>
  </div>
);
