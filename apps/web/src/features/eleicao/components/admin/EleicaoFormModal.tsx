import { zodResolver } from '@hookform/resolvers/zod';
import { criarEleicaoSchema, type CriarEleicaoInput } from '@sindprf/types';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { paraInputDataHora } from '../../../../lib/datas';
import { useAtualizarEleicao, useCriarEleicao, useEleicaoAdmin } from '../../hooks';

type EleicaoFormValues = z.input<typeof criarEleicaoSchema>;

type EleicaoFormModalProps = {
  aberto: boolean;
  id?: string;
  onFechar: () => void;
};

const valoresIniciais: EleicaoFormValues = {
  titulo: '',
  descricao: '',
  inicio: '' as unknown as Date,
  fim: '' as unknown as Date,
  inscricaoInicio: null,
  inscricaoFim: null,
};

export function EleicaoFormModal({ aberto, id, onFechar }: EleicaoFormModalProps) {
  const { data: eleicaoExistente, isLoading } = useEleicaoAdmin(aberto ? id : undefined);
  const criar = useCriarEleicao();
  const atualizar = useAtualizarEleicao();
  const editando = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EleicaoFormValues, unknown, CriarEleicaoInput>({
    resolver: zodResolver(criarEleicaoSchema),
    defaultValues: valoresIniciais,
  });

  // Só popula a partir de dados existentes (edição). O estado em branco de
  // criação já vem de `defaultValues` — não repita o reset aqui (ver `fechar`).
  useEffect(() => {
    if (!aberto || !eleicaoExistente) return;
    reset({
      titulo: eleicaoExistente.titulo,
      descricao: eleicaoExistente.descricao ?? '',
      inicio: paraInputDataHora(eleicaoExistente.inicio) as unknown as Date,
      fim: paraInputDataHora(eleicaoExistente.fim) as unknown as Date,
      inscricaoInicio: paraInputDataHora(eleicaoExistente.inscricaoInicio) as unknown as Date,
      inscricaoFim: paraInputDataHora(eleicaoExistente.inscricaoFim) as unknown as Date,
    });
  }, [aberto, eleicaoExistente, reset]);

  const salvando = criar.isPending || atualizar.isPending;

  // Limpa o formulário ao fechar (cancelar ou salvar), em vez de ao abrir —
  // evita reaplicar valores em branco enquanto o usuário já está digitando.
  const fechar = () => {
    reset(valoresIniciais);
    onFechar();
  };

  const onSubmit = (dados: CriarEleicaoInput) => {
    const opcoes = { onSuccess: fechar };
    if (id) {
      atualizar.mutate({ id, ...dados }, opcoes);
    } else {
      criar.mutate(dados, opcoes);
    }
  };

  return (
    <Modal
      aberto={aberto}
      onFechar={fechar}
      titulo={editando ? 'Editar eleição' : 'Nova eleição'}
      descricao="Defina o período de votação eletrônica. Chapas e candidatos são cadastrados depois, na tela de detalhe."
      tamanho="lg"
    >
      {editando && isLoading ? (
        <EstadoCarregando mensagem="Carregando eleição…" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-area form-area--modal">
          <label>
            Título
            <input
              type="text"
              {...register('titulo')}
              placeholder="Ex.: Eleição da Diretoria — Triênio 2028/2030"
              autoComplete="off"
            />
            {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
          </label>

          <label>
            Descrição (opcional)
            <textarea rows={3} {...register('descricao')} />
            {errors.descricao && <span className="erro">{errors.descricao.message}</span>}
          </label>

          <div className="form-grid">
            <label>
              Início da votação
              <input type="datetime-local" {...register('inicio')} />
              {errors.inicio && <span className="erro">{errors.inicio.message}</span>}
            </label>

            <label>
              Fim da votação
              <input type="datetime-local" {...register('fim')} />
              {errors.fim && <span className="erro">{errors.fim.message}</span>}
            </label>
          </div>

          <div className="form-grid">
            <label>
              Início da inscrição de chapas (opcional)
              <input type="datetime-local" {...register('inscricaoInicio')} />
            </label>

            <label>
              Fim da inscrição de chapas (opcional)
              <input type="datetime-local" {...register('inscricaoFim')} />
            </label>
          </div>

          {(criar.isError || atualizar.isError) && (
            <p className="erro">Erro ao salvar a eleição. Tente novamente.</p>
          )}

          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={fechar}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar eleição'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
