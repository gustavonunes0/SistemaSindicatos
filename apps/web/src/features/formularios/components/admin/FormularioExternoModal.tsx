import { zodResolver } from '@hookform/resolvers/zod';
import {
  formularioExternoSchema,
  type FormularioExternoInput,
  type FormularioListagem,
} from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useSalvarFormularioExterno } from '../../hooks';

type Props = {
  aberto: boolean;
  formulario: FormularioListagem | null;
  onFechar: () => void;
};

function mensagemErro(erro: unknown): string {
  const mensagem = (erro as { response?: { data?: { message?: unknown } } }).response?.data
    ?.message;
  if (typeof mensagem === 'string') return mensagem;
  if (Array.isArray(mensagem) && typeof mensagem[0] === 'string') return mensagem[0];
  return 'Não foi possível salvar o link. Verifique os dados e tente novamente.';
}

export function FormularioExternoModal({ aberto, formulario, onFechar }: Props) {
  const salvar = useSalvarFormularioExterno();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<
    z.input<typeof formularioExternoSchema>,
    unknown,
    FormularioExternoInput
  >({
    resolver: zodResolver(formularioExternoSchema),
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      titulo: formulario?.titulo ?? '',
      descricao: formulario?.descricao ?? null,
      urlExterna: formulario?.urlExterna ?? '',
      publico: formulario?.publico ?? 'FILIADOS',
      status: formulario?.status ?? 'PUBLICADO',
    });
    salvar.reset();
  }, [aberto, formulario, reset]);

  const fechar = () => {
    salvar.reset();
    onFechar();
  };

  const onSubmit = (dados: FormularioExternoInput) => {
    salvar.mutate(
      { ...dados, id: formulario?.id },
      {
        onSuccess: fechar,
      },
    );
  };

  return (
    <Modal
      aberto={aberto}
      titulo={formulario ? 'Editar link de formulário' : 'Cadastrar Google Forms'}
      descricao="Organize aqui os formulários que continuam sendo respondidos no Google."
      tamanho="lg"
      onFechar={fechar}
    >
      <form className="form-area form-area--modal" noValidate onSubmit={handleSubmit(onSubmit)}>
        <label className="campo">
          <span className="campo-rotulo">Título</span>
          <input type="text" {...register('titulo')} />
          {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
        </label>

        <label className="campo">
          <span className="campo-rotulo">Link do Google Forms</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://docs.google.com/forms/…"
            {...register('urlExterna')}
          />
          {errors.urlExterna && <span className="erro">{errors.urlExterna.message}</span>}
        </label>

        <label className="campo">
          <span className="campo-rotulo">Descrição (opcional)</span>
          <textarea rows={3} {...register('descricao')} />
          {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
        </label>

        <div className="form-grid">
          <label className="campo">
            <span className="campo-rotulo">Quem pode acessar</span>
            <select {...register('publico')}>
              <option value="FILIADOS">Somente filiados aprovados</option>
              <option value="TODOS">Qualquer pessoa com o link</option>
            </select>
          </label>

          <label className="campo">
            <span className="campo-rotulo">Situação</span>
            <select {...register('status')}>
              <option value="PUBLICADO">Publicado</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </label>
        </div>

        {salvar.isError && <p className="erro">{mensagemErro(salvar.error)}</p>}

        <div className="form-acoes">
          <button type="button" className="botao-secundario" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao-primario" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar link'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
