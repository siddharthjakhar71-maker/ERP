import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { PurchaseOrderListRecord, PurchaseOrderPayload, PurchaseOrderRecord, PurchaseOrderStatus } from '@/types';

interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus | '';
  q?: string;
}

const purchaseOrderQueryKey = (filters: PurchaseOrderFilters) => ['purchase-orders', filters];

export const usePurchaseOrders = (filters: PurchaseOrderFilters) =>
  useQuery({
    queryKey: purchaseOrderQueryKey(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.q) params.set('q', filters.q);
      const query = params.toString();
      return api<PurchaseOrderListRecord[]>(`/purchase-orders${query ? `?${query}` : ''}`);
    },
  });

export const usePurchaseOrder = (id?: string | null, enabled = true) =>
  useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => api<PurchaseOrderRecord>(`/purchase-orders/${id}`),
    enabled: Boolean(id) && enabled,
  });

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PurchaseOrderPayload) => api<PurchaseOrderRecord>('/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success('Purchase order created successfully');
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PurchaseOrderPayload }) =>
      api<PurchaseOrderRecord>(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (_data, variables) => {
      toast.success('Purchase order updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
    },
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<PurchaseOrderRecord>(`/purchase-orders/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      toast.success('Purchase order deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      void queryClient.removeQueries({ queryKey: ['purchase-orders', id] });
    },
  });
};
