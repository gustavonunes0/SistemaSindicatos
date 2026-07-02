import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@sindprf/types';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRedefinirSenha } from '../hooks';
import { AuthLayout } from './AuthLayout';

export function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const redefinir = useRedefinirSenha();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  if (!token) {
    return (
      <AuthLayout titulo="Redefinir senha">
        <p className="erro">Link inválido: token de recuperação ausente.</p>
        <p>
          <Link to="/esqueci-senha">Solicitar novo link</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout titulo="Redefinir senha">
      <form
        onSubmit={handleSubmit((dados) =>
          redefinir.mutate(dados, { onSuccess: () => navigate('/login', { replace: true }) }),
        )}
        noValidate
      >
        <input type="hidden" {...register('token')} />

        <label>
          Nova senha
          <input type="password" autoComplete="new-password" {...register('novaSenha')} />
          {errors.novaSenha && <span className="erro">{errors.novaSenha.message}</span>}
        </label>

        {redefinir.isError && (
          <p className="erro">Token inválido ou expirado. Solicite um novo link.</p>
        )}

        <button type="submit" disabled={redefinir.isPending}>
          {redefinir.isPending ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </form>

      <p>
        <Link to="/login">Voltar para o login</Link>
      </p>
    </AuthLayout>
  );
}
