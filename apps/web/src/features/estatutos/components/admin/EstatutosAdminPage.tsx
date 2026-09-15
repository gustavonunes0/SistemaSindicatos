import { zodResolver } from '@hookform/resolvers/zod';
import {
  atualizarEstatutoSchema,
  criarEstatutoSchema,
  type AtualizarEstatutoInput,
  type CriarEstatutoInput,
  type Estatuto,
} from '@sindprf/types';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import * as estatutosApi from '../../api';
import {
  useAtualizarEstatuto,
  useCriarEstatuto,
  useEstatutosAdmin,
  useRemoverEstatuto,
} from '../../hooks';

type ValoresCriar = z.input<typeof criarEstatutoSchema>;
type ValoresEditar = z.input<typeof atualizarEstatutoSchema>;

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EstatutosAdminPage() {
  const { data: estatutos, isLoading, isError } = useEstatutosAdmin();
  const criar = useCriarEstatuto();
  const atualizar = useAtualizarEstatuto();
  const remover = useRemoverEstatuto();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modalCriar, setModalCriar] = useState(false);
  const [editando, setEditando] = useState<Estatuto | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const formCriar = useForm<ValoresCriar, unknown, CriarEstatutoInput>({
    resolver: zodResolver(criarEstatutoSchema),
    defaultValues: { titulo: '', ordem: 0, ativo: true },
  });

  const formEditar = useForm<ValoresEditar, unknown, AtualizarEstatutoInput>({
    resolver: zodResolver(atualizarEstatutoSchema),
  });

  useEffect(() => {
    if (!editando) return;
    formEditar.reset({
      titulo: editando.titulo,
      ordem: editando.ordem,
      ativo: editando.ativo,
    });
  }, [editando, formEditar]);

  const onCriar = (dados: CriarEstatutoInput) => {
    if (!arquivo) {
      formCriar.setError('titulo', { message: 'Selecione o PDF do estatuto' });
      return;
    }
    criar.mutate(
      { input: dados, arquivo },
      {
        onSuccess: () => {
          setModalCriar(false);
          setArquivo(null);
          formCriar.reset({ titulo: '', ordem: 0, ativo: true });
          if (inputArquivoRef.current) inputArquivoRef.current.value = '';
        },
      },
    );
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Estatutos"
      descricao="Cadastre os documentos do estatuto para os filiados consultarem na área logada."
      acoes={
        <button type="button" className="botao-primario" onClick={() => setModalCriar(true)}>
          Novo estatuto
        </button>
      }
    >
      {isLoading && !estatutos && <EstadoCarregando />}
      {isError && !estatutos && <p className="erro">Erro ao carregar os estatutos.</p>}

      {estatutos && estatutos.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum estatuto cadastrado ainda.</p>
          <button type="button" className="botao-primario" onClick={() => setModalCriar(true)}>
            Cadastrar o primeiro
          </button>
        </div>
      )}

      {estatutos && estatutos.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Arquivo</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {estatutos.map((item) => (
                <tr key={item.id}>
                  <td>{item.titulo}</td>
                  <td>
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => void estatutosApi.abrirEstatuto(item.id, item.nomeOriginal, 'admin')}
                    >
                      {item.nomeOriginal}
                    </button>
                    <span className="texto-secundario"> ({formatarTamanho(item.tamanhoBytes)})</span>
                  </td>
                  <td>
                    <span className={`badge ${item.ativo ? 'badge-publicado' : 'badge-rascunho'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>{formatarData(item.updatedAt)}</td>
                  <td className="tabela-acoes">
                    <button type="button" className="botao-tabela" onClick={() => setEditando(item)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: 'Excluir estatuto?',
                          descricao: `O documento “${item.titulo}” será removido permanentemente.`,
                          confirmarRotulo: 'Excluir',
                          onConfirmar: () => remover.mutateAsync(item.id),
                        })
                      }
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        aberto={modalCriar}
        onFechar={() => setModalCriar(false)}
        titulo="Novo estatuto"
        descricao="Informe o título e envie o PDF do documento."
      >
        <form className="form-stack" onSubmit={formCriar.handleSubmit(onCriar)}>
          <label>
            Título
            <input type="text" {...formCriar.register('titulo')} />
            {formCriar.formState.errors.titulo && (
              <span className="erro">{formCriar.formState.errors.titulo.message}</span>
            )}
          </label>
          <label>
            Arquivo PDF
            <input
              ref={inputArquivoRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
            {arquivo && <small className="texto-secundario">{arquivo.name}</small>}
          </label>
          <label className="campo-checkbox">
            <input type="checkbox" {...formCriar.register('ativo')} />
            Ativo (visível para filiados)
          </label>
          {criar.isError && <p className="erro">Não foi possível salvar. Verifique o PDF e o título.</p>}
          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={() => setModalCriar(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={criar.isPending}>
              {criar.isPending ? 'Enviando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        aberto={editando !== null}
        onFechar={() => setEditando(null)}
        titulo="Editar estatuto"
        descricao="Altere o título ou a visibilidade. Para trocar o PDF, exclua e cadastre de novo."
      >
        <form
          className="form-stack"
          onSubmit={formEditar.handleSubmit((dados) => {
            if (!editando) return;
            atualizar.mutate(
              { id: editando.id, ...dados },
              { onSuccess: () => setEditando(null) },
            );
          })}
        >
          <label>
            Título
            <input type="text" {...formEditar.register('titulo')} />
          </label>
          <label className="campo-checkbox">
            <input type="checkbox" {...formEditar.register('ativo')} />
            Ativo (visível para filiados)
          </label>
          {atualizar.isError && <p className="erro">Não foi possível salvar.</p>}
          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={atualizar.isPending}>
              {atualizar.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {modalConfirmacao}
    </AreaLayout>
  );
}
