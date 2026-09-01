import { zodResolver } from '@hookform/resolvers/zod';
import {
  formularioExternoSchema,
  type FormularioExternoInput,
  type FormularioListagem,
} from '@sindprf/types';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Modal } from '../../../../components/ui/Modal';
import { useSalvarFormularioExterno } from '../../hooks';
import {
  DISPONIBILIDADE_EXTERNA_ROTULO,
  paraCompartilhamento,
  paraDisponibilidade,
  type DisponibilidadeExterna,
} from './disponibilidade-externa';

type Props = {
  aberto: boolean;
  formulario: FormularioListagem | null;
  onFechar: () => void;
};

type CamposDoLink = Pick<FormularioExternoInput, 'titulo' | 'descricao' | 'urlExterna'>;

const AJUDA_DISPONIBILIDADE: Record<DisponibilidadeExterna, string> = {
  PAINEL: 'Fica guardado aqui. Nenhum filiado vê este link.',
  FILIADOS: 'Aparece em “Formulários” na área do filiado aprovado.',
  ABERTO: 'Qualquer pessoa com o endereço da plataforma chega ao formulário.',
};

const OPCOES: DisponibilidadeExterna[] = ['PAINEL', 'FILIADOS', 'ABERTO'];

function mensagemErro(erro: unknown): string {
  const mensagem = (erro as { response?: { data?: { message?: unknown } } }).response?.data
    ?.message;
  if (typeof mensagem === 'string') return mensagem;
  if (Array.isArray(mensagem) && typeof mensagem[0] === 'string') return mensagem[0];
  return 'Não foi possível salvar o link. Verifique os dados e tente novamente.';
}

export function FormularioExternoModal({ aberto, formulario, onFechar }: Props) {
  const salvar = useSalvarFormularioExterno();
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeExterna>('PAINEL');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof formularioExternoSchema>, unknown, FormularioExternoInput>({
    resolver: zodResolver(formularioExternoSchema),
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      titulo: formulario?.titulo ?? '',
      descricao: formulario?.descricao ?? null,
      urlExterna: formulario?.urlExterna ?? '',
    });
    setDisponibilidade(formulario ? paraDisponibilidade(formulario) : 'PAINEL');
    salvar.reset();
  }, [aberto, formulario, reset]);

  const fechar = () => {
    salvar.reset();
    onFechar();
  };

  const onSubmit = (dados: CamposDoLink) => {
    salvar.mutate(
      { ...dados, ...paraCompartilhamento(disponibilidade), id: formulario?.id },
      { onSuccess: fechar },
    );
  };

  return (
    <Modal
      aberto={aberto}
      titulo={formulario ? 'Editar link' : 'Adicionar link externo'}
      descricao="Guarde aqui os formulários que continuam sendo respondidos no Google."
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
          <span className="campo-rotulo">Link do formulário</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://docs.google.com/forms/…"
            {...register('urlExterna')}
          />
          {errors.urlExterna && <span className="erro">{errors.urlExterna.message}</span>}
        </label>

        <label className="campo">
          <span className="campo-rotulo">Anotação (opcional)</span>
          <textarea
            rows={2}
            placeholder="Para que serve, quem organiza, prazo…"
            {...register('descricao')}
          />
          {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
        </label>

        <label className="campo">
          <span className="campo-rotulo">Quem enxerga</span>
          <select
            value={disponibilidade}
            onChange={(evento) =>
              setDisponibilidade(evento.target.value as DisponibilidadeExterna)
            }
          >
            {OPCOES.map((opcao) => (
              <option key={opcao} value={opcao}>
                {DISPONIBILIDADE_EXTERNA_ROTULO[opcao]}
              </option>
            ))}
          </select>
          <span className="campo-ajuda">{AJUDA_DISPONIBILIDADE[disponibilidade]}</span>
        </label>

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
