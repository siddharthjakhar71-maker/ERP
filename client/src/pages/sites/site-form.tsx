import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SitePayload, SiteRecord } from '@/types';

const siteSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  location: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().min(2),
  state: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  projectManager: z.string().optional().default(''),
  status: z.enum(['active', 'inactive']),
});

type SiteFormValues = z.infer<typeof siteSchema>;

const defaults: SiteFormValues = { code: '', name: '', location: '', address: '', city: '', state: '', postalCode: '', projectManager: '', status: 'active' };

export const SiteForm = ({ site, isSubmitting, onCancel, onSubmit }: { site?: SiteRecord | null; isSubmitting?: boolean; onCancel: () => void; onSubmit: (values: SitePayload) => Promise<void> | void }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SiteFormValues>({ resolver: zodResolver(siteSchema), defaultValues: defaults });

  useEffect(() => {
    reset(site ? {
      code: site.code,
      name: site.name,
      location: site.location ?? '',
      address: site.address ?? '',
      city: site.city,
      state: site.state ?? '',
      postalCode: site.postalCode ?? '',
      projectManager: site.projectManager ?? '',
      status: site.status,
    } : defaults);
  }, [site, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { await onSubmit(values); })}>
      {[['code', 'Site Code'], ['name', 'Site Name'], ['location', 'Location'], ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal Code'], ['projectManager', 'Project Manager']].map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} {...register(field as keyof SiteFormValues)} />
          {errors[field as keyof SiteFormValues] ? <p className="text-sm text-destructive">{String(errors[field as keyof SiteFormValues]?.message ?? '')}</p> : null}
        </div>
      ))}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select id="status" className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="md:col-span-2 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : site ? 'Save changes' : 'Add site'}</Button>
      </div>
    </form>
  );
};
