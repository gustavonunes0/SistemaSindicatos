import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues, type LoginInput } from '@sindprf/types';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useTenantStore } from '../../tenant/store';
import { useLogin } from '../hooks';
import { AuthLayout } from './AuthLayout';

function normalizarCampoLogin(valor: string): string {
  if (valor.includes('@') || /[a-zA-Z]/.test(valor)) {
    return valor;
  }
  return valor.replace(/\D/g, '').slice(0, 11);
}

export function LoginPage() {
  const tipo = useTenantStore((s) => s.tenant?.tipo);
  const ehPlataforma = tipo === 'PLATAFORMA';
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
      ? 'E-mail/CPF ou senha incorretos'
      : 'Erro ao entrar. Tente novamente.');

  return (
    <AuthLayout titulo={ehPlataforma ? 'Entrar na plataforma' : 'Entrar'}>
      <form onSubmit={handleSubmit((dados) => login.mutate(dados))} noValidate>
        <label>
          {ehPlataforma ? 'E-mail' : 'CPF'}
          <input
            type={ehPlataforma ? 'email' : 'text'}
            inputMode={ehPlataforma ? 'email' : 'numeric'}
            autoComplete="username"
            placeholder={ehPlataforma ? 'superadmin@sindigest.local' : '00000000000'}
            name={campoLogin.name}
            ref={campoLogin.ref}
            onBlur={campoLogin.onBlur}
            onChange={(evento) => {
              const normalizado = ehPlataforma
                ? evento.target.value.trim()
                : normalizarCampoLogin(evento.target.value);
              evento.target.value = normalizado;
              void campoLogin.onChange(evento);
              setValue('login', normalizado, { shouldDirty: true });
            }}
          />
          {errors.login && <span className="erro">{errors.login.message}</span>}
        </label>

        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            placeholder={ehPlataforma ? 'Senha do SUPERADMIN' : 'Matrícula SIAPE ou senha'}
            {...register('senha')}
          />
          {errors.senha && <span className="erro">{errors.senha.message}</span>}
        </label>

        <p className="auth-dica">
          {ehPlataforma
            ? 'Acesso exclusivo Stellar (SUPERADMIN). Use o e-mail e a senha definidos no seed.'
            : 'Afiliado: CPF só com números e matrícula. Admin do sindicato: e-mail no campo CPF e senha no campo abaixo.'}
        </p>

        {mensagemErro && <p className="erro">{mensagemErro}</p>}

        <button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {!ehPlataforma && (
        <>
          <p>
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </p>
          <p>
            Ainda não é afiliado? <Link to="/cadastro">Veja como se filiar</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
