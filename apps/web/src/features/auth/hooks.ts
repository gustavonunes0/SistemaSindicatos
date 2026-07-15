import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@sindprf/types';
import { useNavigate } from 'react-router-dom';
import * as authApi from './api';
import { useAuthStore } from './store';

export function areaPorRole(role: Role): string {
  return role === 'ADMIN' ? '/admin' : '/afiliado';
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (sessao) => {
      setSession(sessao);
      await queryClient.invalidateQueries();
      navigate(areaPorRole(sessao.user.role), { replace: true });
    },
  });
}

export function useLogout() {
  const { refreshToken, clearSession } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => undefined);
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

export function useMe() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.buscarMe,
    enabled: Boolean(accessToken),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.afiliado?.status === 'PENDENTE' ? 20_000 : false,
  });
}

export function useEsqueciSenha() {
  return useMutation({ mutationFn: authApi.esqueciSenha });
}

export function useRedefinirSenha() {
  return useMutation({ mutationFn: authApi.redefinirSenha });
}
