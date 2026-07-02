import {
  authResponseSchema,
  meResponseSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MeResponse,
  type ResetPasswordInput,
} from '@sindprf/types';
import { api } from '../../lib/http';

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', input);
  return authResponseSchema.parse(data);
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function buscarMe(): Promise<MeResponse> {
  const { data } = await api.get('/auth/me');
  return meResponseSchema.parse(data);
}

export async function esqueciSenha(input: ForgotPasswordInput): Promise<void> {
  await api.post('/auth/forgot', input);
}

export async function redefinirSenha(input: ResetPasswordInput): Promise<void> {
  await api.post('/auth/reset', input);
}
