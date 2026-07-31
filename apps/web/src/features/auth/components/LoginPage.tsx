import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mensagemErro =
    login.isError &&
    (isAxiosError(login.error) && login.error.response?.status === 401
      ? 'CPF/e-mail ou senha incorretos'
      : 'Erro ao entrar. Tente novamente.');

  return (
    <AuthLayout titulo="Entrar">
      <form onSubmit={handleSubmit((dados) => login.mutate(dados))} noValidate>
        <label>
          CPF
          <input
            type="text"
            inputMode="numeric"
            autoComplete="username"
            placeholder="Somente números"
            {...register('login')}
          />
          {errors.login && <span className="erro">{errors.login.message}</span>}
        </label>

        <label>
          Matrícula
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Sua matrícula SIAPE"
            {...register('senha')}
          />
          {errors.senha && <span className="erro">{errors.senha.message}</span>}
        </label>

        <p className="auth-dica">
          Afiliado: CPF e matrícula. Administrador: informe o e-mail no campo CPF e a senha no
          campo matrícula.
        </p>

        {mensagemErro && <p className="erro">{mensagemErro}</p>}

        <button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p>
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
      </p>
      <p>
        Ainda não é afiliado? <Link to="/cadastro">Veja como se filiar</Link>
      </p>
    </AuthLayout>
  );
}
