import { ordenacaoAfiliadoSchema, type StatusAfiliado } from '@sindprf/types';
import type { OnChangeFn, SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { TabelaDados, type ColunaTabela } from '../../../../components/ui/TabelaDados';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import type { AfiliadoAdmin } from '../../api';
import { useAfiliadosAdmin, useAtualizarStatusAfiliado } from '../../hooks';
import { AfiliadoCadastroModal } from './AfiliadoCadastroModal';
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
  const [ordenacao, setOrdenacao] = useState<SortingState>([{ id: 'nome', desc: false }]);
  const [afiliadoSenha, setAfiliadoSenha] = useState<Pick<AfiliadoAdmin, 'id' | 'nome'> | null>(
    null,
  );
  const [cadastroAberto, setCadastroAberto] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusca(buscaInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [buscaInput]);

  // O banco ordena junto com a paginação, então o id da coluna precisa ser uma
  // coluna que a API aceita — o schema compartilhado é quem valida isso.
  const ordem = ordenacao[0];
  const ordenar = ordenacaoAfiliadoSchema.catch('nome').parse(ordem?.id);
  const direcao = ordem?.desc ? 'desc' : 'asc';

  const { data, isLoading, isError, isFetching } = useAfiliadosAdmin({
    status: filtro || undefined,
    busca: busca || undefined,
    page,
    limit: PAGE_SIZE,
    ordenar,
    direcao,
    prefetchVizinhas: true,
  });
  const atualizarStatus = useAtualizarStatusAfiliado();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();

  const afiliados = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  // Com keepPreviousData a tabela segue mostrando a página anterior enquanto busca.
  const atualizando = isFetching && !isLoading;
  const primeiroDaPagina = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const ultimoDaPagina = Math.min(page * PAGE_SIZE, total);

  const aoOrdenar: OnChangeFn<SortingState> = (atualizador) => {
    setOrdenacao((atual) => (typeof atualizador === 'function' ? atualizador(atual) : atualizador));
    setPage(1);
  };

  const mutarStatus = atualizarStatus.mutateAsync;
  const onMudarStatus = useCallback(
    (
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
        onConfirmar: () => mutarStatus({ id: afiliado.id, status }),
      });
    },
    [mutarStatus, pedirConfirmacao],
  );

  const colunas = useMemo<ColunaTabela<AfiliadoAdmin>[]>(
    () => [
      {
        id: 'nome',
        header: 'Sindicalizado',
        cell: ({ row }) => (
          <div className="tabela-identidade">
            <span className="tabela-identidade-nome">{row.original.nome}</span>
            <span className="tabela-identidade-apoio">{row.original.user.email}</span>
          </div>
        ),
      },
      {
        id: 'cpf',
        header: 'CPF',
        enableSorting: false,
        cell: ({ row }) => <span className="tabela-numerico">{formatarCpf(row.original.cpf)}</span>,
      },
      {
        id: 'matricula',
        header: 'Matrícula',
        cell: ({ row }) => <span className="tabela-numerico">{row.original.matricula}</span>,
      },
      {
        id: 'status',
        header: 'Situação',
        cell: ({ row }) => (
          <span className={`badge badge-${row.original.status.toLowerCase()}`}>
            {rotuloStatus[row.original.status]}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Filiado desde',
        cell: ({ row }) => (
          <span className="tabela-numerico">{formatarData(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'acoes',
        header: () => <span className="visually-hidden">Ações</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const afiliado = row.original;
          return (
            <div className="tabela-acoes">
              <button
                type="button"
                className="botao-tabela"
                onClick={() => setAfiliadoSenha({ id: afiliado.id, nome: afiliado.nome })}
              >
                Senha
              </button>
              {afiliado.status !== 'APROVADO' && (
                <button
                  type="button"
                  className="botao-tabela botao-tabela--destaque"
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
                  className="botao-tabela botao-tabela--perigo"
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
                  className="botao-tabela"
                  disabled={atualizarStatus.isPending}
                  onClick={() =>
                    onMudarStatus(afiliado, 'PENDENTE', {
                      titulo: 'Reabrir filiação?',
                      descricao: `${afiliado.nome} voltará para o status pendente.`,
                      confirmarRotulo: 'Reabrir',
                      tom: 'primario',
                    })
                  }
                >
                  Reabrir
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [atualizarStatus.isPending, onMudarStatus],
  );

  return (
    <AreaLayout
      tipo="admin"
      titulo="Filiados"
      descricao="Cadastre sindicalizados, aprove solicitações e gerencie a situação da filiação."
      acoes={
        <button type="button" className="botao-primario" onClick={() => setCadastroAberto(true)}>
          Cadastrar filiado
        </button>
      }
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

      {isLoading && !data && <EstadoCarregando mensagem="Carregando sindicalizados…" />}
      {isError && <p className="erro">Erro ao carregar sindicalizados.</p>}

      {data && afiliados.length === 0 && (
        <div className="estado-vazio">
          <p>
            {busca
              ? `Nenhum sindicalizado encontrado para “${busca}”.`
              : 'Nenhum sindicalizado neste filtro.'}
          </p>
          {!busca && (
            <button
              type="button"
              className="botao-primario"
              onClick={() => setCadastroAberto(true)}
            >
              Cadastrar o primeiro
            </button>
          )}
        </div>
      )}

      {afiliados.length > 0 && (
        <TabelaDados
          colunas={colunas}
          dados={afiliados}
          chaveLinha={(afiliado) => afiliado.id}
          descricao="Sindicalizados"
          ordenacao={ordenacao}
          onOrdenacaoChange={aoOrdenar}
          atualizando={atualizando}
          rodape={
            <nav className="tabela-rodape" aria-label="Paginação de sindicalizados">
              <p className="tabela-rodape-info" aria-live="polite">
                {primeiroDaPagina}–{ultimoDaPagina} de {total}
                {atualizando ? ' · atualizando…' : ''}
              </p>
              {totalPages > 1 && (
                <div className="tabela-rodape-controles">
                  <button
                    type="button"
                    className="botao-pagina"
                    disabled={page <= 1}
                    onClick={() => setPage((atual) => Math.max(1, atual - 1))}
                  >
                    Anterior
                  </button>
                  <span className="tabela-rodape-pagina">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="botao-pagina"
                    disabled={page >= totalPages}
                    onClick={() => setPage((atual) => Math.min(totalPages, atual + 1))}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </nav>
          }
        />
      )}

      <AfiliadoCadastroModal aberto={cadastroAberto} onFechar={() => setCadastroAberto(false)} />
      <AfiliadoSenhaModal afiliado={afiliadoSenha} onFechar={() => setAfiliadoSenha(null)} />
      {modalConfirmacao}
    </AreaLayout>
  );
}
