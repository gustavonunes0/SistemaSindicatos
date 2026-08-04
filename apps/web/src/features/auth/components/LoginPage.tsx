import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues, type LoginInput } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks';
import { AuthLayout } from './AuthLayout';

function normalizarCampoLogin(valor: string): string {
  if (valor.includes('@') || /[a-zA-Z]/.test(valor)) {
    return valor;
  }
  return valor.replace(/\D/g, '').slice(0, 11);
}

export function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const campoLogin = register('login');

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
            placeholder="00000000000"
            name={campoLogin.name}
            ref={campoLogin.ref}
            onBlur={campoLogin.onBlur}
            onChange={(evento) => {
              const normalizado = normalizarCampoLogin(evento.target.value);
              evento.target.value = normalizado;
              void campoLogin.onChange(evento);
              setValue('login', normalizado, { shouldDirty: true });
            }}
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
          Afiliado: CPF só com números (sem pontos ou traço) e matrícula. Administrador: informe o
          e-mail no campo CPF e a senha no campo matrícula.
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
