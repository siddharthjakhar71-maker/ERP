import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { PurchaseOrderSummaryCard } from './purchase-order-summary-card';
import { currency } from '@/lib/utils';
import type { PurchaseOrderRecord } from '@/types';

export const PurchaseOrderView = ({ purchaseOrder }: { purchaseOrder: PurchaseOrderRecord }) => (
  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
    <div className="space-y-8">
      <Card className="border-border bg-card/80 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Purchase Order</p>
            <h2 className="mt-2 text-2xl font-semibold">{purchaseOrder.poNumber}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Issued on {new Date(purchaseOrder.poDate).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={purchaseOrder.status} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card/80 p-6">
          <p className="text-lg font-semibold">Vendor / Site / Dates / Status</p>
          <div className="mt-5 space-y-5 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Vendor</p>
              <p className="mt-1">{purchaseOrder.vendor.name}</p>
              <p>{purchaseOrder.vendor.vendorCode}</p>
              <p>{purchaseOrder.vendor.address || 'No vendor address'}</p>
              <p>{purchaseOrder.vendor.phone || 'No phone'}</p>
              <p>{purchaseOrder.vendor.email || 'No email'}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Site</p>
              <p className="mt-1">{purchaseOrder.site.name}</p>
              <p>{purchaseOrder.site.siteCode}</p>
              <p>{purchaseOrder.site.address || 'No site address'}</p>
              <p>{purchaseOrder.site.location || 'No site location'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">Expected delivery</p>
                <p className="mt-1">{purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Status</p>
                <div className="mt-2"><StatusBadge status={purchaseOrder.status} /></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card/80 p-6">
          <p className="text-lg font-semibold">Billing and shipping addresses</p>
          <div className="mt-5 space-y-5 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Billing address</p>
              <p className="mt-1 whitespace-pre-wrap">{purchaseOrder.billingAddress || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Shipping address</p>
              <p className="mt-1 whitespace-pre-wrap">{purchaseOrder.shippingAddress || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Remarks / Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{purchaseOrder.remarks || 'No remarks'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card/80 p-6">
        <div className="mb-6">
          <p className="text-lg font-semibold">Line items</p>
          <p className="mt-2 text-sm text-muted-foreground">Complete purchase order line breakdown with scroll-safe tabular presentation for dense procurement data.</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] divide-y divide-border text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Material', 'Description', 'Qty', 'Unit', 'Rate', 'Amount', 'Received', 'Pending'].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {purchaseOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td className="min-w-[220px] px-4 py-3"><div><p className="font-medium">{item.material.name}</p><p className="text-xs text-muted-foreground">{item.material.materialCode}</p></div></td>
                    <td className="min-w-[280px] px-4 py-3 text-muted-foreground">{item.description}</td>
                    <td className="px-4 py-3">{item.qty}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3">{currency.format(item.rate)}</td>
                    <td className="px-4 py-3 font-medium">{currency.format(item.lineTotal)}</td>
                    <td className="px-4 py-3">{item.receivedQty}</td>
                    <td className="px-4 py-3">{item.pendingQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>

    <div className="space-y-6 xl:sticky xl:top-6">
      <PurchaseOrderSummaryCard
        subtotal={purchaseOrder.subtotal}
        taxAmount={purchaseOrder.taxAmount}
        discountAmount={purchaseOrder.discountAmount}
        totalAmount={purchaseOrder.totalAmount}
        status={purchaseOrder.status}
      />
    </div>
  </div>
);
