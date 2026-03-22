import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { VendorPayload, VendorRecord, VendorStatus } from '@/types';

interface VendorFilters {
  status?: VendorStatus | '';
  q?: string;
}

const vendorsQueryKey = (filters: VendorFilters) => ['vendors', filters];

export const useVendors = (filters: VendorFilters) =>
  useQuery({
    queryKey: vendorsQueryKey(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.q) params.set('q', filters.q);
      const query = params.toString();
      return api<VendorRecord[]>(`/vendors${query ? `?${query}` : ''}`);
    },
  });

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VendorPayload) => api<VendorRecord>('/vendors', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Vendor created successfully');
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VendorPayload }) =>
      api<VendorRecord>(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Vendor updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<VendorRecord>(`/vendors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Vendor deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};
