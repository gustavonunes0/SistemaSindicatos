import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@sindprf/types';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useEsqueciSenha } from '../hooks';
import { AuthLayout } from './AuthLayout';

export function EsqueciSenhaPage() {
  const esqueciSenha = useEsqueciSenha();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  return (
    <AuthLayout titulo="Recuperar senha">
      {esqueciSenha.isSuccess ? (
        <p>Se o email existir, você receberá um link para redefinir a senha.</p>
      ) : (
        <form onSubmit={handleSubmit((dados) => esqueciSenha.mutate(dados))} noValidate>
          <label>
            Email
            <input type="email" autoComplete="email" {...register('email')} />
            {errors.email && <span className="erro">{errors.email.message}</span>}
          </label>

          {esqueciSenha.isError && <p className="erro">Erro ao enviar. Tente novamente.</p>}

          <button type="submit" disabled={esqueciSenha.isPending}>
            {esqueciSenha.isPending ? 'Enviando…' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}

      <p>
        <Link to="/login">Voltar para o login</Link>
      </p>
    </AuthLayout>
  );
}
