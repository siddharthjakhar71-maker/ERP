import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaterialPayload, MaterialRecord } from '@/types';

const materialSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
  description: z.string().optional().default(''),
  reorderLevel: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive']),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

const defaults: MaterialFormValues = { sku: '', name: '', category: '', unit: '', description: '', reorderLevel: 0, status: 'active' };

export const MaterialForm = ({ material, isSubmitting, onCancel, onSubmit }: { material?: MaterialRecord | null; isSubmitting?: boolean; onCancel: () => void; onSubmit: (values: MaterialPayload) => Promise<void> | void }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaterialFormValues>({ resolver: zodResolver(materialSchema), defaultValues: defaults });

  useEffect(() => {
    reset(material ? {
      sku: material.sku,
      name: material.name,
      category: material.category,
      unit: material.unit,
      description: material.description ?? '',
      reorderLevel: material.reorderLevel,
      status: material.status,
    } : defaults);
  }, [material, reset]);

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(async (values) => { await onSubmit(values); })}>
      {[['sku', 'SKU'], ['name', 'Material Name'], ['category', 'Category'], ['unit', 'Unit']].map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input id={field} {...register(field as keyof MaterialFormValues)} />
          {errors[field as keyof MaterialFormValues] ? <p className="text-sm text-destructive">{String(errors[field as keyof MaterialFormValues]?.message ?? '')}</p> : null}
        </div>
      ))}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reorderLevel">Reorder Level</Label>
        <Input id="reorderLevel" type="number" step="0.01" {...register('reorderLevel')} />
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
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : material ? 'Save changes' : 'Add material'}</Button>
      </div>
    </form>
  );
};
