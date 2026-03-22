import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async () => {
    useAuthStore.getState().clearAuth();
    await queryClient.cancelQueries();
    queryClient.clear();
    await navigate({ to: '/login', replace: true });

    void api('/auth/logout', { method: 'POST' }).catch(() => undefined);
  };
};
