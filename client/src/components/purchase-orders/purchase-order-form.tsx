import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { PurchaseOrderItemsTable, type PurchaseOrderItemDraft } from './purchase-order-items-table';
import { PurchaseOrderSummaryCard } from './purchase-order-summary-card';
import { StatusSelect } from './status-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

const emptyItem = (): PurchaseOrderItemDraft => ({ materialId: '', description: '', qty: 1, unit: '', rate: 0, taxPercent: 0, receivedQty: 0, unitTouched: false, rateTouched: false, descriptionTouched: false });
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

const textareaClassName = 'min-h-28 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
      unitTouched: Boolean(item.unit),
      rateTouched: true,
      descriptionTouched: Boolean(item.description),
    })) ?? [emptyItem()]);
  }, [purchaseOrder, reset]);

  const currentStatus = watch('status');
  const currentVendorId = watch('vendorId');
  const discountAmount = Number(watch('discountAmount') || 0);

  const handleItemChange = <K extends keyof PurchaseOrderItemDraft>(index: number, field: K, value: PurchaseOrderItemDraft[K]) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, [field]: value } as PurchaseOrderItemDraft;
      if (field === 'description') updated.descriptionTouched = true;
      if (field === 'unit') updated.unitTouched = true;
      if (field === 'rate') updated.rateTouched = true;
      return updated;
    }));
  };

  const handleMaterialSelect = (index: number, materialId: string) => {
    const material = materials.find((entry) => entry.id === materialId);
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (!material) return { ...item, materialId };
      const shouldReplaceDescription = !item.descriptionTouched || !item.description.trim() || item.materialId !== materialId;
      const shouldReplaceUnit = !item.unitTouched || !item.unit.trim() || item.materialId !== materialId;
      const shouldReplaceRate = !item.rateTouched || item.rate === 0 || item.materialId !== materialId;
      return {
        ...item,
        materialId,
        description: shouldReplaceDescription ? (material.description || material.name) : item.description,
        unit: shouldReplaceUnit ? material.unit : item.unit,
        rate: shouldReplaceRate ? Number(material.defaultRate ?? 0) : item.rate,
        descriptionTouched: item.descriptionTouched && !shouldReplaceDescription,
        unitTouched: item.unitTouched && !shouldReplaceUnit,
        rateTouched: item.rateTouched && !shouldReplaceRate,
      };
    }));
  };

  const invalidItems = items.some((item) => !item.materialId || item.qty <= 0 || item.rate < 0);

  const totals = useMemo(() => {
    const subtotal = round(items.reduce((sum, item) => sum + (item.qty || 0) * (item.rate || 0), 0));
    const taxAmount = round(items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0) * (item.taxPercent || 0)) / 100, 0));
    const totalAmount = round(Math.max(subtotal + taxAmount - discountAmount, 0));
    return { subtotal, taxAmount, discountAmount, totalAmount };
  }, [discountAmount, items]);

  return (
    <form className="space-y-8" onSubmit={handleSubmit(async (values) => {
      await onSubmit({
        ...values,
        expectedDeliveryDate: values.expectedDeliveryDate || undefined,
        items: items.map(({ unitTouched: _unitTouched, rateTouched: _rateTouched, descriptionTouched: _descriptionTouched, ...item }) => item),
      });
    })}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-8">
          <Card className="border-border bg-card/80 p-6">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">Basic details</h2>
              <p className="text-sm text-muted-foreground">Configure the header, vendor linkage, site allocation, schedule, and addresses for this purchase order.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poNumber">PO Number</Label>
                <Input id="poNumber" {...register('poNumber')} />
                {errors.poNumber ? <p className="text-sm text-destructive">{errors.poNumber.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <StatusSelect value={currentStatus} onChange={(value) => setValue('status', value)} disabled={isSubmitting} />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">Vendor, site, and dates</h2>
              <p className="text-sm text-muted-foreground">Keep procurement ownership, destination site, and expected delivery dates visible in one responsive section.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
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
            </div>
            {!currentVendorId ? <p className="mt-4 text-xs text-muted-foreground">Select a vendor first to load preferred material rates for auto-fill.</p> : null}
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">Billing and shipping addresses</h2>
              <p className="text-sm text-muted-foreground">Maintain site-facing delivery details and vendor-facing billing information without constraining multiline content.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <textarea id="billingAddress" className={textareaClassName} {...register('billingAddress')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <textarea id="shippingAddress" className={textareaClassName} {...register('shippingAddress')} />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <PurchaseOrderItemsTable
              items={items}
              materials={materials}
              disabled={isSubmitting}
              onAdd={() => setItems((current) => [...current, emptyItem()])}
              onRemove={(index) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              onChange={handleItemChange}
              onMaterialSelect={handleMaterialSelect}
            />
            {invalidItems ? <p className="mt-4 text-sm text-destructive">Each line item needs a material, quantity above zero, and a non-negative rate. Unit and description auto-fill when available.</p> : null}
          </Card>

          <Card className="border-border bg-card/80 p-6">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-foreground">Remarks and notes</h2>
              <p className="text-sm text-muted-foreground">Capture commercial notes, delivery instructions, or approval context for downstream procurement workflows.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks / Notes</Label>
              <textarea id="remarks" className={textareaClassName} {...register('remarks')} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <PurchaseOrderSummaryCard
            subtotal={totals.subtotal}
            taxAmount={totals.taxAmount}
            discountAmount={totals.discountAmount}
            totalAmount={totals.totalAmount}
            status={currentStatus}
            footer={(
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Discount</Label>
                  <Input id="discountAmount" type="number" min="0" step="0.01" {...register('discountAmount', { valueAsNumber: true })} />
                </div>
                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={isSubmitting || invalidItems}>{isSubmitting ? 'Saving...' : purchaseOrder ? 'Update purchase order' : 'Save purchase order'}</Button>
                  <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </form>
  );
};
