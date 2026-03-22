import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import type { GrnRecord } from '@/types';

export const GrnView = ({ grn }: { grn: GrnRecord }) => (
  <div className="space-y-8">
    <Card className="border-border bg-card/80 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Goods Receipt Note</p>
          <h2 className="mt-2 text-2xl font-semibold">{grn.grnNumber}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Against PO {grn.purchaseOrder.poNumber} • received on {new Date(grn.receivedAt).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={grn.status} />
      </div>
    </Card>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-border bg-card/80 p-6"><p className="text-lg font-semibold">Vendor</p><div className="mt-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{grn.vendor.name}</p><p>{grn.vendor.vendorCode}</p><p>{grn.vendor.address || 'No address'}</p><p>{grn.vendor.phone || 'No phone'}</p><p>{grn.vendor.email || 'No email'}</p></div></Card>
      <Card className="border-border bg-card/80 p-6"><p className="text-lg font-semibold">Site / PO</p><div className="mt-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">{grn.site.name}</p><p>{grn.site.siteCode}</p><p>{grn.site.address || 'No address'}</p><p className="mt-3 font-medium text-foreground">Purchase order</p><p>{grn.purchaseOrder.poNumber}</p><div className="mt-2"><StatusBadge status={grn.purchaseOrder.status} /></div></div></Card>
      <Card className="border-border bg-card/80 p-6"><p className="text-lg font-semibold">Receipt details</p><div className="mt-4 text-sm text-muted-foreground"><p><span className="font-medium text-foreground">GRN Date:</span> {new Date(grn.grnDate).toLocaleDateString()}</p><p><span className="font-medium text-foreground">Received Date:</span> {new Date(grn.receivedAt).toLocaleDateString()}</p><p><span className="font-medium text-foreground">Invoice:</span> {grn.invoiceNumber || 'Not linked'}</p><p><span className="font-medium text-foreground">Invoice Date:</span> {grn.invoiceDate ? new Date(grn.invoiceDate).toLocaleDateString() : 'Not set'}</p><p className="mt-3 whitespace-pre-wrap">{grn.notes || 'No notes'}</p></div></Card>
    </div>

    <Card className="border-border bg-card/80 p-6">
      <div className="mb-6"><p className="text-lg font-semibold">GRN items</p><p className="mt-2 text-sm text-muted-foreground">Item-wise ordered, previously received, pending, and current receipt quantities for this posting.</p></div>
      <div className="overflow-hidden rounded-3xl border border-border"><div className="overflow-x-auto"><table className="min-w-[1100px] divide-y divide-border text-sm"><thead className="bg-muted/60"><tr>{['Material', 'Description', 'Ordered', 'Prev. received', 'Pending before', 'Received now', 'Unit', 'Remarks'].map((label) => <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border bg-card">{grn.items.map((item) => <tr key={item.id}><td className="px-4 py-3"><div><p className="font-medium">{item.material.name}</p><p className="text-xs text-muted-foreground">{item.material.materialCode}</p></div></td><td className="px-4 py-3 text-muted-foreground">{item.description}</td><td className="px-4 py-3">{item.orderedQty}</td><td className="px-4 py-3">{item.previouslyReceivedQty}</td><td className="px-4 py-3">{item.pendingQty}</td><td className="px-4 py-3 font-medium">{item.receivedQty}</td><td className="px-4 py-3">{item.unit}</td><td className="px-4 py-3 text-muted-foreground">{item.remarks || '—'}</td></tr>)}</tbody></table></div></div>
    </Card>
  </div>
);
