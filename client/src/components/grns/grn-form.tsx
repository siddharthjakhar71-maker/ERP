import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GrnPayload, GrnReceiptOptions, GrnRecord } from '@/types';

const schema = z.object({
  grnNumber: z.string().trim().min(2),
  purchaseOrderId: z.string().trim().min(1),
  vendorId: z.string().trim().min(1),
  siteId: z.string().trim().min(1),
  grnDate: z.string().min(1),
  receivedAt: z.string().min(1),
  invoiceNumber: z.string().optional().default(''),
  invoiceDate: z.string().optional().default(''),
  status: z.enum(['draft', 'posted']),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;
type ItemDraft = GrnPayload['items'][number];
const textareaClassName = 'min-h-28 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const GrnForm = ({ receiptOptions, grn, isSubmitting, onCancel, onSubmit }: { receiptOptions: GrnReceiptOptions; grn?: GrnRecord | null; isSubmitting?: boolean; onCancel: () => void; onSubmit: (payload: GrnPayload) => Promise<void> | void }) => {
  const defaultValues: FormValues = {
    grnNumber: grn?.grnNumber ?? '',
    purchaseOrderId: receiptOptions.id,
    vendorId: receiptOptions.vendorId,
    siteId: receiptOptions.siteId,
    grnDate: grn ? new Date(grn.grnDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    receivedAt: grn ? new Date(grn.receivedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    invoiceNumber: grn?.invoiceNumber ?? '',
    invoiceDate: grn?.invoiceDate ? new Date(grn.invoiceDate).toISOString().slice(0, 10) : '',
    status: grn?.status ?? 'posted',
    notes: grn?.notes ?? '',
  };
  const { register, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });
  const [items, setItems] = useState<ItemDraft[]>([]);

  useEffect(() => {
    reset(defaultValues);
    setItems(grn?.items.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      materialId: item.materialId,
      description: item.description,
      orderedQty: item.orderedQty,
      previouslyReceivedQty: item.previouslyReceivedQty,
      pendingQty: item.pendingQty,
      receivedQty: item.receivedQty,
      unit: item.unit,
      remarks: item.remarks ?? '',
    })) ?? receiptOptions.receiptEligibleItems.map((item) => ({
      purchaseOrderItemId: item.id,
      materialId: item.materialId,
      description: item.description,
      orderedQty: item.qty,
      previouslyReceivedQty: item.receivedQty,
      pendingQty: item.pendingQty,
      receivedQty: item.pendingQty,
      unit: item.unit,
      remarks: '',
    })));
  }, [defaultValues, grn, receiptOptions, reset]);

  const selectedCount = items.filter((item) => item.receivedQty > 0).length;
  const totalReceived = useMemo(() => items.reduce((sum, item) => sum + Number(item.receivedQty || 0), 0), [items]);
  const invalidItems = items.length === 0 || items.some((item) => item.receivedQty < 0 || item.receivedQty > item.pendingQty) || selectedCount === 0;

  return (
    <form className="space-y-8" onSubmit={handleSubmit(async (values) => {
      await onSubmit({ ...values, invoiceDate: values.invoiceDate || undefined, items: items.filter((item) => item.receivedQty > 0) });
    })}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-8">
          <Card className="border-border bg-card/80 p-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="grnNumber">GRN Number</Label><Input id="grnNumber" {...register('grnNumber')} /></div>
              <div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('status')}><option value="draft">Draft</option><option value="posted">Posted</option></select></div>
              <div className="space-y-2"><Label htmlFor="grnDate">GRN Date</Label><Input id="grnDate" type="date" {...register('grnDate')} /></div>
              <div className="space-y-2"><Label htmlFor="receivedAt">Received Date</Label><Input id="receivedAt" type="date" {...register('receivedAt')} /></div>
              <div className="space-y-2"><Label htmlFor="invoiceNumber">Invoice Number</Label><Input id="invoiceNumber" {...register('invoiceNumber')} /></div>
              <div className="space-y-2"><Label htmlFor="invoiceDate">Invoice Date</Label><Input id="invoiceDate" type="date" {...register('invoiceDate')} /></div>
            </div>
            <input type="hidden" {...register('purchaseOrderId')} />
            <input type="hidden" {...register('vendorId')} />
            <input type="hidden" {...register('siteId')} />
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">PO receipt lines</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enter current receipt quantities line by line. Partial and full receipt posting are both supported.</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-border"><div className="overflow-x-auto"><table className="min-w-[1200px] divide-y divide-border text-sm"><thead className="bg-muted/60"><tr>{['Material', 'Description', 'Ordered', 'Prev. received', 'Pending', 'Receive now', 'Unit', 'Remarks'].map((label) => <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border bg-card">{items.map((item, index) => {
              const source = receiptOptions.items.find((entry) => entry.id === item.purchaseOrderItemId);
              return <tr key={item.purchaseOrderItemId}><td className="px-4 py-3"><div><p className="font-medium">{source?.material.name}</p><p className="text-xs text-muted-foreground">{source?.material.materialCode}</p></div></td><td className="px-4 py-3 text-muted-foreground">{item.description}</td><td className="px-4 py-3">{item.orderedQty}</td><td className="px-4 py-3">{item.previouslyReceivedQty}</td><td className="px-4 py-3">{item.pendingQty}</td><td className="w-[180px] px-4 py-3"><Input type="number" min="0" max={item.pendingQty} step="0.01" value={item.receivedQty} disabled={isSubmitting} onChange={(event) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, receivedQty: Number(event.target.value) } : entry))} /></td><td className="px-4 py-3">{item.unit}</td><td className="w-[240px] px-4 py-3"><Input value={item.remarks} disabled={isSubmitting} onChange={(event) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, remarks: event.target.value } : entry))} /></td></tr>;
            })}</tbody></table></div></div>
            {invalidItems ? <p className="mt-4 text-sm text-destructive">At least one line must have a positive quantity, and no line can exceed its current pending quantity.</p> : null}
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <div className="space-y-2"><Label htmlFor="notes">Notes</Label><textarea id="notes" className={textareaClassName} {...register('notes')} /></div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Card className="border-border bg-card/80 p-6">
            <p className="text-lg font-semibold">Receipt summary</p>
            <div className="mt-5 space-y-4 text-sm">
              <div><p className="text-muted-foreground">Purchase order</p><p className="font-medium">{receiptOptions.poNumber}</p></div>
              <div><p className="text-muted-foreground">Vendor</p><p className="font-medium">{receiptOptions.vendor.name}</p></div>
              <div><p className="text-muted-foreground">Site</p><p className="font-medium">{receiptOptions.site.name}</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-muted-foreground">Lines selected</p><p className="font-medium">{selectedCount}</p></div><div><p className="text-muted-foreground">Qty to post</p><p className="font-medium">{totalReceived}</p></div></div>
              <div className="space-y-3 pt-3"><Button type="submit" className="w-full" disabled={isSubmitting || invalidItems}>{isSubmitting ? 'Saving...' : grn ? 'Update GRN' : 'Save GRN'}</Button><Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={isSubmitting}>Cancel</Button></div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
};
