import { z } from 'zod';
import { afiliadoSchema } from './afiliado';
import { validarCpf } from './cpf';
import { userSchema } from './user';

/** Remove . e - do CPF; preserva e-mail de admin. */
function normalizarLogin(valor: string): string {
  const bruto = valor.trim();
  if (!bruto) return bruto;
  // E-mail (admin) não é normalizado como CPF.
  if (bruto.includes('@') || /[a-zA-Z]/.test(bruto)) {
    return bruto.toLowerCase();
  }
  const digitos = bruto.replace(/\D/g, '');
  if (digitos.length === 11 && validarCpf(digitos)) {
    return digitos;
  }
  // Ainda em digitação ou matrícula/ID: mantém só dígitos se for numérico.
  if (/^[\d.\-\s]+$/.test(bruto)) {
    return digitos;
  }
  return bruto;
}

/** Afiliado: CPF + matrícula. Admin: e-mail + senha. */
export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Informe o CPF ou e-mail')
    .transform(normalizarLogin)
    .pipe(z.string().min(1, 'Informe o CPF ou e-mail')),
  senha: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFormValues = z.input<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const meResponseSchema = z.object({
  user: userSchema,
  afiliado: afiliadoSchema.nullable(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
