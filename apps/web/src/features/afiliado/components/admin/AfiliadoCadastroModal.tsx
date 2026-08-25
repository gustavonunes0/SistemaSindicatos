import { zodResolver } from '@hookform/resolvers/zod';
import { cadastroAfiliadoAdminSchema, type CadastroAfiliadoAdminInput } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useCadastrarAfiliadoAdmin } from '../../hooks';

const formularioCadastroSchema = cadastroAfiliadoAdminSchema
  .extend({
    telefone: z
      .string()
      .optional()
      .transform((valor) => valor?.trim() || undefined),
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type FormularioCadastro = z.input<typeof formularioCadastroSchema>;

type AfiliadoCadastroModalProps = {
  aberto: boolean;
  onFechar: () => void;
};

function mensagemDeErro(erro: unknown): string {
  const resposta = (erro as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (typeof resposta === 'string') {
    return resposta;
  }
  if (Array.isArray(resposta) && typeof resposta[0] === 'string') {
    return resposta[0];
  }
  return 'Não foi possível cadastrar o filiado. Tente novamente.';
}

export function AfiliadoCadastroModal({ aberto, onFechar }: AfiliadoCadastroModalProps) {
  const cadastrar = useCadastrarAfiliadoAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormularioCadastro, unknown, CadastroAfiliadoAdminInput & { confirmarSenha: string }>(
    {
      resolver: zodResolver(formularioCadastroSchema),
      defaultValues: {
        nome: '',
        cpf: '',
        matricula: '',
        telefone: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        status: 'APROVADO',
      },
    },
  );

  useEffect(() => {
    if (!aberto) return;
    reset({
      nome: '',
      cpf: '',
      matricula: '',
      telefone: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      status: 'APROVADO',
    });
  }, [aberto, reset]);

  const fechar = () => {
    cadastrar.reset();
    onFechar();
  };

  const onSubmit = (dados: CadastroAfiliadoAdminInput & { confirmarSenha: string }) => {
    const { confirmarSenha: _confirmar, ...input } = dados;
    cadastrar.mutate(input, { onSuccess: onFechar });
  };

  return (
    <Modal
      aberto={aberto}
      titulo="Cadastrar filiado"
      descricao="Cria o acesso do sindicalizado. Informe a senha inicial e entregue a ele."
      onFechar={fechar}
      tamanho="lg"
    >
      <form className="form-area form-area--modal" noValidate onSubmit={handleSubmit(onSubmit)}>
        <label className="campo">
          <span className="campo-rotulo">Nome completo</span>
          <input type="text" autoComplete="name" {...register('nome')} />
          {errors.nome && <span className="erro">{errors.nome.message}</span>}
        </label>

        <div className="form-grid">
          <label className="campo">
            <span className="campo-rotulo">CPF</span>
            <input type="text" inputMode="numeric" autoComplete="off" {...register('cpf')} />
            {errors.cpf && <span className="erro">{errors.cpf.message}</span>}
          </label>
          <label className="campo">
            <span className="campo-rotulo">Matrícula</span>
            <input type="text" autoComplete="off" {...register('matricula')} />
            {errors.matricula && <span className="erro">{errors.matricula.message}</span>}
          </label>
        </div>

        <div className="form-grid">
          <label className="campo">
            <span className="campo-rotulo">E-mail</span>
            <input type="email" autoComplete="off" {...register('email')} />
            {errors.email && <span className="erro">{errors.email.message}</span>}
          </label>
          <label className="campo">
            <span className="campo-rotulo">Telefone (opcional)</span>
            <input type="tel" autoComplete="off" {...register('telefone')} />
            {errors.telefone && <span className="erro">{errors.telefone.message}</span>}
          </label>
        </div>

        <div className="form-grid">
          <label className="campo">
            <span className="campo-rotulo">Senha inicial</span>
            <input type="password" autoComplete="new-password" {...register('senha')} />
            {errors.senha && <span className="erro">{errors.senha.message}</span>}
          </label>
          <label className="campo">
            <span className="campo-rotulo">Confirmar senha</span>
            <input type="password" autoComplete="new-password" {...register('confirmarSenha')} />
            {errors.confirmarSenha && (
              <span className="erro">{errors.confirmarSenha.message}</span>
            )}
          </label>
        </div>

        <label className="campo">
          <span className="campo-rotulo">Situação</span>
          <select {...register('status')}>
            <option value="APROVADO">Aprovado — já pode entrar no sistema</option>
            <option value="PENDENTE">Pendente — aguarda aprovação</option>
          </select>
        </label>

        {cadastrar.isError && <p className="erro">{mensagemDeErro(cadastrar.error)}</p>}

        <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={cadastrar.isPending}>
            {cadastrar.isPending ? 'Cadastrando…' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
