import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Role } from '@sindprf/types';
import { useNavigate } from 'react-router-dom';
import * as afiliadosApi from '../afiliado/api';
import * as adminApi from '../admin/api';
import {
  gravarCacheAfiliadosAdmin,
  gravarCacheConveniosAdmin,
  gravarCacheNoticiasAdmin,
} from '../admin/cache-admin';
import * as conveniosApi from '../convenios/api';
import * as noticiasApi from '../noticias/api';
import * as authApi from './api';
import { useAuthStore } from './store';

export function areaPorRole(role: Role): string {
  if (role === 'SUPERADMIN') return '/plataforma';
  if (role === 'ADMIN') return '/admin';
  return '/afiliado';
}

function prefetchPainelAdmin(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ['noticias', 'admin'],
    queryFn: async () => {
      const data = await noticiasApi.listarNoticiasAdmin();
      gravarCacheNoticiasAdmin(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  void queryClient.prefetchQuery({
    queryKey: ['convenios', 'admin'],
    queryFn: async () => {
      const data = await conveniosApi.listarConveniosAdmin();
      gravarCacheConveniosAdmin(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  void queryClient.prefetchQuery({
    queryKey: ['afiliados', 'admin', { status: 'todos', busca: '', page: 1, limit: 20 }],
    queryFn: async () => {
      const data = await afiliadosApi.listarAfiliadosAdmin({ page: 1, limit: 20 });
      gravarCacheAfiliadosAdmin('todos||1|20', data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
  void queryClient.prefetchQuery({
    queryKey: ['admin', 'metricas'],
    queryFn: adminApi.buscarMetricasAdmin,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (sessao) => {
      setSession(sessao);
      // Evita invalidar o cache inteiro (notícias, convênios, etc.) no login.
      void queryClient.prefetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: authApi.buscarMe,
      });
      if (sessao.user.role === 'ADMIN') {
        prefetchPainelAdmin(queryClient);
      }
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
