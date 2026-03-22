import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { GrnListRecord, GrnPayload, GrnReceiptOptions, GrnRecord, GrnStatus } from '@/types';

interface GrnFilters {
  status?: GrnStatus | '';
  purchaseOrderId?: string;
  q?: string;
}

const grnQueryKey = (filters: GrnFilters) => ['grns', filters];

export const useGrns = (filters: GrnFilters) => useQuery({
  queryKey: grnQueryKey(filters),
  queryFn: () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.purchaseOrderId) params.set('purchaseOrderId', filters.purchaseOrderId);
    if (filters.q) params.set('q', filters.q);
    const query = params.toString();
    return api<GrnListRecord[]>(`/grns${query ? `?${query}` : ''}`);
  },
});

export const useGrn = (id?: string | null, enabled = true) => useQuery({
  queryKey: ['grns', id],
  queryFn: () => api<GrnRecord>(`/grns/${id}`),
  enabled: Boolean(id) && enabled,
});

export const useGrnReceiptOptions = (purchaseOrderId?: string | null, enabled = true) => useQuery({
  queryKey: ['grns', 'purchase-order', purchaseOrderId, 'receipt-options'],
  queryFn: () => api<GrnReceiptOptions>(`/grns/purchase-orders/${purchaseOrderId}/receipt-options`),
  enabled: Boolean(purchaseOrderId) && enabled,
});

export const useCreateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GrnPayload) => api<GrnRecord>('/grns', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      toast.success('GRN created successfully');
      void queryClient.invalidateQueries({ queryKey: ['grns'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchaseOrderId] });
    },
  });
};

export const useUpdateGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GrnPayload }) => api<GrnRecord>(`/grns/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (data, variables) => {
      toast.success('GRN updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['grns'] });
      void queryClient.invalidateQueries({ queryKey: ['grns', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchaseOrderId] });
    },
  });
};

export const useDeleteGrn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<GrnRecord>(`/grns/${id}`, { method: 'DELETE' }),
    onSuccess: (data, id) => {
      toast.success('GRN deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['grns'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', data.purchaseOrderId] });
      void queryClient.removeQueries({ queryKey: ['grns', id] });
    },
  });
};
