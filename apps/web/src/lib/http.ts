import { authResponseSchema } from '@sindprf/types';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../features/auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

function tenantHostHeader(): string {
  if (typeof window === 'undefined') {
    return 'localhost';
  }
  return window.location.hostname;
}

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Tenant-Host'] = tenantHostHeader();
  return config;
});

// Single-flight: várias requisições com 401 simultâneas disparam um único refresh.
let refreshEmAndamento: Promise<string> | null = null;

/** Rotas em que 401 é esperado e não deve disparar refresh (evita loop). */
const ROTAS_SEM_RENOVACAO = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot',
  '/auth/reset',
] as const;

function pularRenovacao(url: string | undefined): boolean {
  if (!url) return false;
  return ROTAS_SEM_RENOVACAO.some((rota) => url.startsWith(rota));
}

function encerrarSessaoELogin(): void {
  useAuthStore.getState().clearSession();
  window.location.assign('/login');
}

async function renovarSessao(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('Sem refresh token');
  }

  // Instância crua para não entrar nos interceptors e evitar loop.
  const { data } = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Host': tenantHostHeader(),
      },
    },
  );
  const sessao = authResponseSchema.parse(data);
  useAuthStore.getState().setSession(sessao);
  return sessao.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status !== 401 || !config || pularRenovacao(config.url)) {
      throw error;
    }

    if (config._retry) {
      encerrarSessaoELogin();
      return new Promise(() => undefined);
    }

    config._retry = true;
    try {
      refreshEmAndamento ??= renovarSessao().finally(() => {
        refreshEmAndamento = null;
      });
      const novoAccessToken = await refreshEmAndamento;
      config.headers.Authorization = `Bearer ${novoAccessToken}`;
      return api(config);
    } catch {
      encerrarSessaoELogin();
      return new Promise(() => undefined);
    }
  },
);
