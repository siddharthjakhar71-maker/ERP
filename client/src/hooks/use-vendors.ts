import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { VendorRecord } from '@/types';

export const useVendors = (status?: string) =>
  useQuery({
    queryKey: ['vendors', status],
    queryFn: () => api<VendorRecord[]>(`/vendors${status ? `?status=${status}` : ''}`),
  });

export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<VendorRecord, 'id' | 'openingBalance' | 'outstandingBalance' | 'recentTransactions'>) =>
      api<VendorRecord>('/vendors', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};
