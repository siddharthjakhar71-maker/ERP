import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateVendor } from '@/hooks/use-vendors';

const vendorSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  contactPerson: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  city: z.string().min(2),
  paymentTermsDays: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive', 'on_hold']),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

export const VendorForm = () => {
  const createVendor = useCreateVendor();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      status: 'active',
      paymentTermsDays: 30,
    },
  });

  const onSubmit = async (values: VendorFormValues) => {
    await createVendor.mutateAsync(values);
    reset();
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      {[
        ['code', 'Vendor Code'],
        ['name', 'Vendor Name'],
        ['contactPerson', 'Contact Person'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['city', 'City'],
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
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={createVendor.isPending}>{createVendor.isPending ? 'Saving...' : 'Add Vendor'}</Button>
      </div>
    </form>
  );
};
