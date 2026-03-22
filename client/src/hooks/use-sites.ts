import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { ModuleStatus, SitePayload, SiteRecord } from '@/types';

interface SiteFilters {
  status?: ModuleStatus | '';
  q?: string;
  city?: string;
}

export const useSites = (filters: SiteFilters) =>
  useQuery({
    queryKey: ['sites', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.q) params.set('q', filters.q);
      if (filters.city) params.set('city', filters.city);
      return api<SiteRecord[]>(`/sites${params.toString() ? `?${params.toString()}` : ''}`);
    },
  });

export const useCreateSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SitePayload) => api<SiteRecord>('/sites', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Site created successfully');
      void queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
};

export const useUpdateSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SitePayload }) =>
      api<SiteRecord>(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Site updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
};

export const useDeleteSite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<SiteRecord>(`/sites/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Site deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
};
