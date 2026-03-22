import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VendorPayload, VendorRecord } from '@/types';

const vendorSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  city: z.string().min(2),
  state: z.string().optional().default(''),
  paymentTermsDays: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive', 'on_hold']),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

const defaultValues: VendorFormValues = {
  code: '',
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  paymentTermsDays: 30,
  status: 'active',
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
    reset(vendor ? {
      code: vendor.code,
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      email: vendor.email,
      phone: vendor.phone,
      city: vendor.city,
      state: vendor.state ?? '',
      paymentTermsDays: vendor.paymentTermsDays,
      status: vendor.status,
    } : defaultValues);
  }, [vendor, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { await onSubmit(values); })}>
      {[
        ['code', 'Vendor Code'],
        ['name', 'Vendor Name'],
        ['contactPerson', 'Contact Person'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['city', 'City'],
        ['state', 'State'],
      ].map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} {...register(field as keyof VendorFormValues)} />
          {errors[field as keyof VendorFormValues] ? <p className="text-sm text-destructive">{String(errors[field as keyof VendorFormValues]?.message ?? '')}</p> : null}
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
        <Input id="paymentTermsDays" type="number" {...register('paymentTermsDays')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>
      <div className="md:col-span-2 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : vendor ? 'Save changes' : 'Add vendor'}</Button>
      </div>
    </form>
  );
};
