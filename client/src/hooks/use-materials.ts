import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MaterialPayload, MaterialRecord, ModuleStatus } from '@/types';

interface MaterialFilters {
  status?: ModuleStatus | '';
  q?: string;
  category?: string;
}

export const useMaterials = (filters: MaterialFilters) =>
  useQuery({
    queryKey: ['materials', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.q) params.set('q', filters.q);
      if (filters.category) params.set('category', filters.category);
      return api<MaterialRecord[]>(`/materials${params.toString() ? `?${params.toString()}` : ''}`);
    },
  });

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialPayload) => api<MaterialRecord>('/materials', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Material created successfully');
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MaterialPayload }) =>
      api<MaterialRecord>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Material updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<MaterialRecord>(`/materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Material deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
};
