import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SettingsRecord } from '@/types';

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: () => api<SettingsRecord>('/settings'),
  });
