import { authResponseSchema } from '@sindprf/types';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../features/auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight: várias requisições com 401 simultâneas disparam um único refresh.
let refreshEmAndamento: Promise<string> | null = null;

async function renovarSessao(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('Sem refresh token');
  }

  // Instância crua para não entrar nos interceptors e evitar loop.
  const { data } = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const sessao = authResponseSchema.parse(data);
  useAuthStore.getState().setSession(sessao);
  return sessao.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const ehRotaDeAuth = config?.url?.startsWith('/auth/');

    if (error.response?.status !== 401 || !config || config._retry || ehRotaDeAuth) {
      throw error;
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
      useAuthStore.getState().clearSession();
      window.location.assign('/login');
      throw error;
    }
  },
);
