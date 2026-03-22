import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PurchaseOrderItemsTable, type PurchaseOrderItemDraft } from './purchase-order-items-table';
import { StatusSelect } from './status-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaterialRecord, PurchaseOrderPayload, PurchaseOrderRecord, SiteRecord, VendorRecord } from '@/types';

const numberField = z.coerce.number().finite().min(0);
const formSchema = z.object({
  poNumber: z.string().trim().min(2),
  vendorId: z.string().trim().min(1),
  siteId: z.string().trim().min(1),
  poDate: z.string().min(1),
  expectedDeliveryDate: z.string().optional().default(''),
  billingAddress: z.string().optional().default(''),
  shippingAddress: z.string().optional().default(''),
  discountAmount: numberField,
  status: z.enum(['draft', 'approved', 'partial', 'completed', 'cancelled']),
  remarks: z.string().optional().default(''),
});

type FormValues = z.infer<typeof formSchema>;

const emptyItem = (): PurchaseOrderItemDraft => ({ materialId: '', description: '', qty: 1, unit: '', rate: 0, taxPercent: 0, receivedQty: 0 });
const defaults: FormValues = { poNumber: '', vendorId: '', siteId: '', poDate: new Date().toISOString().slice(0, 10), expectedDeliveryDate: '', billingAddress: '', shippingAddress: '', discountAmount: 0, status: 'draft', remarks: '' };
const round = (value: number) => Number(value.toFixed(2));

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrderRecord | null;
  vendors: VendorRecord[];
  sites: SiteRecord[];
  materials: MaterialRecord[];
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: PurchaseOrderPayload) => Promise<void> | void;
}

export const PurchaseOrderForm = ({ purchaseOrder, vendors, sites, materials, isSubmitting, onCancel, onSubmit }: PurchaseOrderFormProps) => {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });
  const [items, setItems] = useState<PurchaseOrderItemDraft[]>([emptyItem()]);

  useEffect(() => {
    reset(purchaseOrder ? {
      poNumber: purchaseOrder.poNumber,
      vendorId: purchaseOrder.vendorId,
      siteId: purchaseOrder.siteId,
      poDate: new Date(purchaseOrder.poDate).toISOString().slice(0, 10),
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().slice(0, 10) : '',
      billingAddress: purchaseOrder.billingAddress ?? '',
      shippingAddress: purchaseOrder.shippingAddress ?? '',
      discountAmount: purchaseOrder.discountAmount,
      status: purchaseOrder.status,
      remarks: purchaseOrder.remarks ?? '',
    } : defaults);
    setItems(purchaseOrder?.items.map((item) => ({
      materialId: item.materialId,
      description: item.description,
      qty: item.qty,
      unit: item.unit,
      rate: item.rate,
      taxPercent: item.taxPercent,
      receivedQty: item.receivedQty,
    })) ?? [emptyItem()]);
  }, [purchaseOrder, reset]);

  const totals = useMemo(() => {
    const subtotal = round(items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0));
    const taxAmount = round(items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0) * (item.taxPercent || 0)) / 100, 0));
    const discountAmount = Number(watch('discountAmount') || 0);
    const totalAmount = round(Math.max(subtotal + taxAmount - discountAmount, 0));
    return { subtotal, taxAmount, discountAmount, totalAmount };
  }, [items, watch]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit(async (values) => {
      await onSubmit({
        ...values,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
        items,
      });
    })}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="poNumber">PO Number</Label>
          <Input id="poNumber" {...register('poNumber')} />
          {errors.poNumber ? <p className="text-sm text-destructive">{errors.poNumber.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <StatusSelect value={watch('status')} onChange={(value) => setValue('status', value)} disabled={isSubmitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor</Label>
          <select id="vendorId" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('vendorId')}>
            <option value="">Select vendor</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} • {vendor.vendorCode}</option>)}
          </select>
          {errors.vendorId ? <p className="text-sm text-destructive">{errors.vendorId.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="siteId">Site</Label>
          <select id="siteId" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('siteId')}>
            <option value="">Select site</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name} • {site.siteCode}</option>)}
          </select>
          {errors.siteId ? <p className="text-sm text-destructive">{errors.siteId.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="poDate">PO Date</Label>
          <Input id="poDate" type="date" {...register('poDate')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
          <Input id="expectedDeliveryDate" type="date" {...register('expectedDeliveryDate')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="billingAddress">Billing Address</Label>
          <textarea id="billingAddress" className="min-h-24 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register('billingAddress')} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="shippingAddress">Shipping Address</Label>
          <textarea id="shippingAddress" className="min-h-24 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register('shippingAddress')} />
        </div>
      </div>

      <PurchaseOrderItemsTable
        items={items}
        materials={materials}
        disabled={isSubmitting}
        onAdd={() => setItems((current) => [...current, emptyItem()])}
        onRemove={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
        onChange={(index, field, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))}
      />
      {items.some((item) => !item.materialId || !item.description || !item.unit || item.qty <= 0) ? <p className="text-sm text-destructive">Each line item needs a material, description, unit, and quantity above zero.</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <textarea id="remarks" className="min-h-28 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register('remarks')} />
        </div>
        <div className="rounded-3xl border border-border bg-muted/40 p-5">
          <h3 className="text-sm font-semibold">Order summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax</span><span>{totals.taxAmount.toFixed(2)}</span></div>
            <div className="space-y-2">
              <Label htmlFor="discountAmount">Discount</Label>
              <Input id="discountAmount" type="number" min="0" step="0.01" {...register('discountAmount', { valueAsNumber: true })} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span>{totals.totalAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || items.some((item) => !item.materialId || !item.description || !item.unit || item.qty <= 0)}>{isSubmitting ? 'Saving...' : purchaseOrder ? 'Save changes' : 'Create purchase order'}</Button>
      </div>
    </form>
  );
};
