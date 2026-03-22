import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VendorPayload, VendorRecord } from '@/types';

const vendorSchema = z.object({
  vendorCode: z.string().min(2),
  name: z.string().min(2),
  contactPerson: z.string().optional().default(''),
  email: z.union([z.string().email(), z.literal('')]).default(''),
  phone: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  address: z.string().optional().default(''),
  openingBalance: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive', 'on_hold']),
  remarks: z.string().optional().default(''),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

const defaultValues: VendorFormValues = {
  vendorCode: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  gstin: '',
  city: '',
  state: '',
  address: '',
  openingBalance: 0,
  status: 'active',
  remarks: '',
};

export const VendorForm = ({
  vendor,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  vendor?: VendorRecord | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: VendorPayload) => Promise<void> | void;
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(
      vendor
        ? {
            vendorCode: vendor.vendorCode,
            name: vendor.name,
            contactPerson: vendor.contactPerson ?? '',
            email: vendor.email ?? '',
            phone: vendor.phone ?? '',
            gstin: vendor.gstin ?? '',
            city: vendor.city ?? '',
            state: vendor.state ?? '',
            address: vendor.address ?? '',
            openingBalance: vendor.openingBalance,
            status: vendor.status,
            remarks: vendor.remarks ?? '',
          }
        : defaultValues,
    );
  }, [vendor, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { await onSubmit(values); })}>
      {[
        ['vendorCode', 'Vendor Code'],
        ['name', 'Vendor Name'],
        ['contactPerson', 'Contact Person'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['gstin', 'GSTIN'],
        ['city', 'City'],
        ['state', 'State'],
      ].map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} {...register(field as keyof VendorFormValues)} />
          {errors[field as keyof VendorFormValues] ? <p className="text-sm text-destructive">{String(errors[field as keyof VendorFormValues]?.message ?? '')}</p> : null}
        </div>
      ))}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="openingBalance">Opening Balance</Label>
        <Input id="openingBalance" type="number" step="0.01" {...register('openingBalance')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Input id="remarks" {...register('remarks')} />
      </div>
      <div className="md:col-span-2 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : vendor ? 'Save changes' : 'Add vendor'}</Button>
      </div>
    </form>
  );
};
