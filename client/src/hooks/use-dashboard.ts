import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardSnapshot } from '@/types';

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardSnapshot>('/dashboard'),
  });
