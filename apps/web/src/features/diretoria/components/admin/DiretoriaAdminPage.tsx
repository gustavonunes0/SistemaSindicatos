import { zodResolver } from '@hookform/resolvers/zod';
import {
  criarRecursoDiretoriaSchema,
  type CriarRecursoDiretoriaInput,
  type RecursoDiretoria,
} from '@sindprf/types';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import {
  useAfiliadosAdmin,
  useDefinirDiretorAfiliado,
} from '../../../afiliado/hooks';
import {
  useAtualizarRecursoDiretoria,
  useCriarRecursoDiretoria,
  useRecursosDiretoriaAdmin,
  useRemoverRecursoDiretoria,
} from '../../hooks';

type ValoresRecurso = z.input<typeof criarRecursoDiretoriaSchema>;

const valoresVazios: ValoresRecurso = {
  titulo: '',
  descricao: '',
  url: '',
  ordem: 0,
  ativo: true,
};

export function DiretoriaAdminPage() {
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [modalRecurso, setModalRecurso] = useState<RecursoDiretoria | 'novo' | null>(null);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  useEffect(() => {
    const timer = window.setTimeout(() => setBusca(buscaInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [buscaInput]);

  const diretores = useAfiliadosAdmin({
    diretor: true,
    status: 'APROVADO',
    page: 1,
    limit: 100,
    ordenar: 'nome',
    direcao: 'asc',
  });
  const buscaAfiliados = useAfiliadosAdmin({
    busca: busca || undefined,
    status: 'APROVADO',
    page: 1,
    limit: 15,
    ordenar: 'nome',
    direcao: 'asc',
    enabled: busca.length >= 2,
  });
  const definirDiretor = useDefinirDiretorAfiliado();
  const recursos = useRecursosDiretoriaAdmin();
  const criar = useCriarRecursoDiretoria();
  const atualizar = useAtualizarRecursoDiretoria();
  const remover = useRemoverRecursoDiretoria();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ValoresRecurso, unknown, CriarRecursoDiretoriaInput>({
    resolver: zodResolver(criarRecursoDiretoriaSchema),
    defaultValues: valoresVazios,
  });

  useEffect(() => {
    if (modalRecurso === 'novo') {
      reset(valoresVazios);
      return;
    }
    if (modalRecurso) {
      reset({
        titulo: modalRecurso.titulo,
        descricao: modalRecurso.descricao ?? '',
        url: modalRecurso.url,
        ordem: modalRecurso.ordem,
        ativo: modalRecurso.ativo,
      });
    }
  }, [modalRecurso, reset]);

  const onSalvarRecurso = (dados: CriarRecursoDiretoriaInput) => {
    const payload = {
      ...dados,
      descricao: dados.descricao?.trim() ? dados.descricao : null,
    };
    if (modalRecurso && modalRecurso !== 'novo') {
      atualizar.mutate(
        { id: modalRecurso.id, ...payload },
        { onSuccess: () => setModalRecurso(null) },
      );
      return;
    }
    criar.mutate(payload, { onSuccess: () => setModalRecurso(null) });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Diretoria"
      descricao="Defina quem é diretor e cadastre links exclusivos para esse grupo."
    >
      <section className="admin-bloco" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        <header className="admin-bloco-header">
          <div>
            <h2>Diretores</h2>
            <p>
              Busque filiados aprovados e marque-os como diretores. Eles passam a ver a seção
              Diretoria na área do filiado e formulários com público “Somente diretores”.
            </p>
          </div>
        </header>

        <label className="campo-busca-diretoria">
          Buscar filiado
          <input
            type="search"
            placeholder="Nome ou CPF"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
          />
        </label>

        {busca.length >= 2 && (
          <div className="tabela-wrapper" style={{ marginBottom: '1.5rem' }}>
            {buscaAfiliados.isLoading && <EstadoCarregando mensagem="Buscando…" />}
            {buscaAfiliados.data && buscaAfiliados.data.items.length === 0 && (
              <p className="estado-vazio-texto">Nenhum filiado encontrado.</p>
            )}
            {buscaAfiliados.data && buscaAfiliados.data.items.length > 0 && (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th aria-label="Ação" />
                  </tr>
                </thead>
                <tbody>
                  {buscaAfiliados.data.items.map((afiliado) => (
                    <tr key={afiliado.id}>
                      <td>
                        {afiliado.nome}
                        {afiliado.diretor ? (
                          <span className="badge badge-destaque" style={{ marginLeft: '0.5rem' }}>
                            Diretor
                          </span>
                        ) : null}
                      </td>
                      <td>{afiliado.matricula}</td>
                      <td className="tabela-acoes">
                        <button
                          type="button"
                          className={
                            afiliado.diretor
                              ? 'botao-tabela'
                              : 'botao-tabela botao-tabela--destaque'
                          }
                          disabled={definirDiretor.isPending}
                          onClick={() =>
                            definirDiretor.mutate({
                              id: afiliado.id,
                              diretor: !afiliado.diretor,
                            })
                          }
                        >
                          {afiliado.diretor ? 'Remover' : 'Tornar diretor'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <h3 className="painel-secao-titulo">Diretores atuais</h3>
        {diretores.isLoading && !diretores.data && <EstadoCarregando />}
        {diretores.data && diretores.data.items.length === 0 && (
          <p className="estado-vazio-texto">Nenhum diretor marcado ainda.</p>
        )}
        {diretores.data && diretores.data.items.length > 0 && (
          <ul className="lista-diretores">
            {diretores.data.items.map((afiliado) => (
              <li key={afiliado.id} className="lista-diretores-item">
                <div>
                  <strong>{afiliado.nome}</strong>
                  <span>Matrícula {afiliado.matricula}</span>
                </div>
                <button
                  type="button"
                  className="botao-tabela"
                  disabled={definirDiretor.isPending}
                  onClick={() => definirDiretor.mutate({ id: afiliado.id, diretor: false })}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-bloco">
        <header className="admin-bloco-header">
          <div>
            <h2>Links exclusivos</h2>
            <p>
              URLs externas (planilhas, pastas, sistemas) visíveis só para diretores. Para
              formulários do sistema, use Formulários → público “Somente diretores”.
            </p>
          </div>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModalRecurso('novo')}
          >
            Novo link
          </button>
        </header>

        {recursos.isLoading && !recursos.data && <EstadoCarregando />}
        {recursos.data && recursos.data.length === 0 && (
          <p className="estado-vazio-texto">Nenhum link cadastrado.</p>
        )}
        {recursos.data && recursos.data.length > 0 && (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Ordem</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {recursos.data.map((recurso) => (
                  <tr key={recurso.id}>
                    <td>
                      <div>{recurso.titulo}</div>
                      <a href={recurso.url} target="_blank" rel="noreferrer" className="texto-secundario">
                        {recurso.url}
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${recurso.ativo ? 'badge-publicado' : 'badge-rascunho'}`}>
                        {recurso.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{recurso.ordem}</td>
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        className="botao-tabela"
                        onClick={() => setModalRecurso(recurso)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="botao-tabela botao-tabela--perigo"
                        onClick={() =>
                          pedirConfirmacao({
                            titulo: 'Excluir link?',
                            descricao: `O link “${recurso.titulo}” será removido.`,
                            confirmarRotulo: 'Excluir',
                            onConfirmar: () => remover.mutateAsync(recurso.id),
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
      </section>

      <Modal
        aberto={modalRecurso !== null}
        onFechar={() => setModalRecurso(null)}
        titulo={modalRecurso === 'novo' ? 'Novo link' : 'Editar link'}
        descricao="Informe um título e a URL que os diretores poderão abrir."
      >
        <form className="form-stack" onSubmit={handleSubmit(onSalvarRecurso)}>
          <label>
            Título
            <input type="text" {...register('titulo')} />
            {errors.titulo && <span className="erro">{errors.titulo.message}</span>}
          </label>
          <label>
            URL
            <input type="url" placeholder="https://" {...register('url')} />
            {errors.url && <span className="erro">{errors.url.message}</span>}
          </label>
          <label>
            Descrição (opcional)
            <textarea rows={3} {...register('descricao')} />
          </label>
          <label>
            Ordem
            <input type="number" min={0} {...register('ordem', { valueAsNumber: true })} />
          </label>
          <label className="campo-checkbox">
            <input type="checkbox" {...register('ativo')} />
            Ativo
          </label>
          {(criar.isError || atualizar.isError) && (
            <p className="erro">Não foi possível salvar. Verifique os dados.</p>
          )}
          <div className="form-acoes">
            <button type="button" className="botao-secundario" onClick={() => setModalRecurso(null)}>
              Cancelar
            </button>
            <button
              type="submit"
              className="botao-primario"
              disabled={criar.isPending || atualizar.isPending}
            >
              {criar.isPending || atualizar.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {modalConfirmacao}
    </AreaLayout>
  );
}
