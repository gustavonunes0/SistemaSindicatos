import type { StatusAfiliado } from '@sindprf/types';
import { useEffect, useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import type { AfiliadoAdmin } from '../../api';
import { useAfiliadosAdmin, useAtualizarStatusAfiliado } from '../../hooks';
import { AfiliadoSenhaModal } from './AfiliadoSenhaModal';

const PAGE_SIZE = 20;

const filtros: { valor: StatusAfiliado | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'PENDENTE', rotulo: 'Pendentes' },
  { valor: 'APROVADO', rotulo: 'Aprovados' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

const rotuloStatus: Record<StatusAfiliado, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  INATIVO: 'Inativo',
};

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function AfiliadosAdminPage() {
  const [filtro, setFiltro] = useState<StatusAfiliado | ''>('');
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [afiliadoSenha, setAfiliadoSenha] = useState<Pick<AfiliadoAdmin, 'id' | 'nome'> | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusca(buscaInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscaInput]);

  const { data, isLoading, isError, isFetching } = useAfiliadosAdmin({
    status: filtro || undefined,
    busca: busca || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const atualizarStatus = useAtualizarStatusAfiliado();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const afiliados = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const onMudarStatus = (
    afiliado: AfiliadoAdmin,
    status: StatusAfiliado,
    opcoes: {
      titulo: string;
      descricao: string;
      confirmarRotulo: string;
      tom?: 'perigo' | 'primario';
    },
  ) => {
    pedirConfirmacao({
      titulo: opcoes.titulo,
      descricao: opcoes.descricao,
      confirmarRotulo: opcoes.confirmarRotulo,
      tom: opcoes.tom,
      onConfirmar: () => atualizarStatus.mutateAsync({ id: afiliado.id, status }),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Filiados"
      descricao="Aprove solicitações de cadastro e gerencie a situação da filiação."
    >
      <div className="afiliados-toolbar">
        <label className="afiliados-busca">
          <span className="visually-hidden">Buscar por nome ou CPF</span>
          <input
            type="search"
            value={buscaInput}
            onChange={(event) => setBuscaInput(event.target.value)}
            placeholder="Buscar por nome ou CPF…"
            autoComplete="off"
          />
        </label>

        <div className="filtros-linha filtros-linha--toolbar">
          {filtros.map((item) => (
            <button
              key={item.rotulo}
              type="button"
              className={
                filtro === item.valor ? 'botao-filtro botao-filtro--ativo' : 'botao-filtro'
              }
              onClick={() => {
                setFiltro(item.valor);
                setPage(1);
              }}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      {!isLoading && data && (
        <p className="afiliados-meta">
          {total === 0
            ? 'Nenhum afiliado encontrado'
            : `${total} afiliado${total === 1 ? '' : 's'}${busca ? ` para “${busca}”` : ''}`}
          {isFetching && !isLoading ? ' · atualizando…' : ''}
        </p>
      )}

      {isLoading && <EstadoCarregando mensagem="Carregando sindicalizados…" />}
      {isError && <p className="erro">Erro ao carregar sindicalizados.</p>}

      {!isLoading && afiliados.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum sindicalizado neste filtro.</p>
        </div>
      )}

      {afiliados.length > 0 && (
        <>
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Matrícula</th>
                  <th>Status</th>
                  <th>Desde</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {afiliados.map((afiliado) => (
                  <tr key={afiliado.id}>
                    <td>{afiliado.nome}</td>
                    <td>
                      <code className="afiliados-cpf">{formatarCpf(afiliado.cpf)}</code>
                    </td>
                    <td>{afiliado.user.email}</td>
                    <td>{afiliado.matricula}</td>
                    <td>
                      <span className={`badge badge-${afiliado.status.toLowerCase()}`}>
                        {rotuloStatus[afiliado.status]}
                      </span>
                    </td>
                    <td>{formatarData(afiliado.createdAt)}</td>
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        className="botao-link-acao"
                        onClick={() => setAfiliadoSenha({ id: afiliado.id, nome: afiliado.nome })}
                      >
                        Senha
                      </button>
                      {afiliado.status !== 'APROVADO' && (
                        <button
                          type="button"
                          className="botao-link-acao"
                          disabled={atualizarStatus.isPending}
                          onClick={() =>
                            onMudarStatus(afiliado, 'APROVADO', {
                              titulo: 'Aprovar sindicalizado?',
                              descricao: `${afiliado.nome} passará a ter acesso à área do sindicalizado.`,
                              confirmarRotulo: 'Aprovar',
                              tom: 'primario',
                            })
                          }
                        >
                          Aprovar
                        </button>
                      )}
                      {afiliado.status !== 'INATIVO' && (
                        <button
                          type="button"
                          className="botao-perigo"
                          disabled={atualizarStatus.isPending}
                          onClick={() =>
                            onMudarStatus(afiliado, 'INATIVO', {
                              titulo: 'Inativar sindicalizado?',
                              descricao: `${afiliado.nome} perderá o acesso à área do sindicalizado.`,
                              confirmarRotulo: 'Inativar',
                            })
                          }
                        >
                          Inativar
                        </button>
                      )}
                      {afiliado.status === 'INATIVO' && (
                        <button
                          type="button"
                          className="botao-link-acao"
                          disabled={atualizarStatus.isPending}
                          onClick={() =>
                            onMudarStatus(afiliado, 'PENDENTE', {
                              titulo: 'Reabrir afiliação?',
                              descricao: `${afiliado.nome} voltará para o status pendente.`,
                              confirmarRotulo: 'Reabrir',
                              tom: 'primario',
                            })
                          }
                        >
                          Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="paginacao" aria-label="Paginação de afiliados">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((atual) => Math.max(1, atual - 1))}
              >
                ← Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((atual) => Math.min(totalPages, atual + 1))}
              >
                Próxima →
              </button>
            </nav>
          )}
        </>
      )}

      <AfiliadoSenhaModal afiliado={afiliadoSenha} onFechar={() => setAfiliadoSenha(null)} />
      {modalConfirmacao}
    </AreaLayout>
  );
}
