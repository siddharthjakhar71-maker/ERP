import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { AccountProfile, AccountProfilePayload, ChangePasswordPayload } from '@/types';
import { useAuthStore } from '@/store/auth-store';

export const useAccount = () => useQuery({
  queryKey: ['account', 'me'],
  queryFn: () => api<AccountProfile>('/account/me'),
});

export const useUpdateAccountProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AccountProfilePayload) => api<AccountProfile>('/account/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: (profile) => {
      useAuthStore.getState().updateUser({
        id: profile.id,
        fullName: profile.fullName,
        role: profile.role,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
      });
      queryClient.setQueryData(['account', 'me'], profile);
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => api<{ forceRelogin: boolean; message: string }>('/account/change-password', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async (result) => {
      toast.success(result.message);
      await queryClient.cancelQueries();
      queryClient.clear();
      useAuthStore.getState().clearAuth();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update password');
    },
  });
};
