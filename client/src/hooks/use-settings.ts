import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { PoLayoutSettings, PoTemplateSettings, PoThemeSettings, SettingsRecord } from '@/types';

const settingsQueryKey = ['settings'];

export const useSettings = () =>
  useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => api<SettingsRecord>('/settings'),
  });

export const useUpdateThemeSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PoThemeSettings) => api<SettingsRecord>('/settings/theme', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQueryKey, data);
      toast.success('Theme settings saved');
    },
  });
};

export const useUpdatePoTemplateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PoTemplateSettings) => api<SettingsRecord>('/settings/po-template', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQueryKey, data);
      toast.success('PO template settings saved');
    },
  });
};

export const useUpdatePoLayoutSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PoLayoutSettings) => api<SettingsRecord>('/settings/po-layout', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsQueryKey, data);
      toast.success('PO layout settings saved');
    },
  });
};
