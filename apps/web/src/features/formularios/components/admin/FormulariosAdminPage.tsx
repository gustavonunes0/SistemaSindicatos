import {
  PUBLICO_FORMULARIO_ROTULO,
  STATUS_FORMULARIO_ROTULO,
  type FormularioListagem,
} from '@sindprf/types';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { TabelaDados, type ColunaTabela } from '../../../../components/ui/TabelaDados';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import { useFormulariosAdmin, useRemoverFormulario } from '../../hooks';
import { FormularioExternoModal } from './FormularioExternoModal';
import { rotuloDisponibilidade } from './disponibilidade-externa';

const publicoCurto: Record<FormularioListagem['publico'], string> = {
  TODOS: 'Aberto',
  FILIADOS: 'Só filiados',
};

function linkPublico(formulario: FormularioListagem): string {
  return `${window.location.origin}/formularios/${formulario.slug}`;
}

/** Só o domínio, para a tabela não quebrar com URLs longas do Google. */
function origemDoLink(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function FormulariosAdminPage() {
  const { data: formularios, isLoading, isError } = useFormulariosAdmin();
  const remover = useRemoverFormulario();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState<string | null>(null);
  const [modalExternoAberto, setModalExternoAberto] = useState(false);
  const [externoEmEdicao, setExternoEmEdicao] = useState<FormularioListagem | null>(null);
  const mutarRemover = remover.mutateAsync;
  const removendo = remover.isPending;

  const onCopiar = useCallback(async (id: string, texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(id);
    window.setTimeout(() => setCopiado(null), 2000);
  }, []);

  const onRemover = useCallback(
    (formulario: FormularioListagem) => {
      pedirConfirmacao({
        titulo: formulario.urlExterna ? 'Remover link?' : 'Excluir formulário?',
        descricao: formulario.urlExterna
          ? `O link “${formulario.titulo}” sai do painel. O formulário no Google continua intacto.`
          : formulario.totalRespostas > 0
            ? `“${formulario.titulo}” tem ${formulario.totalRespostas} resposta(s). Tudo será removido permanentemente.`
            : `O formulário “${formulario.titulo}” será removido permanentemente.`,
        confirmarRotulo: formulario.urlExterna ? 'Remover' : 'Excluir',
        onConfirmar: () => mutarRemover(formulario.id),
      });
    },
    [mutarRemover, pedirConfirmacao],
  );

  const abrirModalExterno = useCallback((formulario: FormularioListagem | null) => {
    setExternoEmEdicao(formulario);
    setModalExternoAberto(true);
  }, []);

  const proprios = useMemo(
    () => formularios?.filter((item) => !item.urlExterna) ?? [],
    [formularios],
  );
  const externos = useMemo(
    () => formularios?.filter((item) => item.urlExterna) ?? [],
    [formularios],
  );

  const publicados = proprios.filter((item) => item.status === 'PUBLICADO').length;
  const totalRespostas = proprios.reduce((soma, item) => soma + item.totalRespostas, 0);

  const colunas = useMemo<ColunaTabela<FormularioListagem>[]>(
    () => [
      {
        id: 'titulo',
        header: 'Formulário',
        enableSorting: false,
        cell: ({ row }) => {
          const formulario = row.original;
          return (
            <div className="tabela-identidade">
              <span className="tabela-identidade-nome">{formulario.titulo}</span>
              <span className="tabela-identidade-apoio">
                {publicoCurto[formulario.publico]}
                <span className="visually-hidden">
                  {' '}
                  — {PUBLICO_FORMULARIO_ROTULO[formulario.publico]}
                </span>
                {' · '}
                {formulario.totalCampos}{' '}
                {formulario.totalCampos === 1 ? 'pergunta' : 'perguntas'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Situação',
        enableSorting: false,
        cell: ({ row }) => (
          <span className={`badge badge-formulario-${row.original.status.toLowerCase()}`}>
            {STATUS_FORMULARIO_ROTULO[row.original.status]}
          </span>
        ),
      },
      {
        id: 'respostas',
        header: 'Respostas',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabela-numerico">{row.original.totalRespostas}</span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Criado em',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabela-numerico">{formatarData(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'acoes',
        header: () => <span className="visually-hidden">Ações</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const formulario = row.original;
          const rascunho = formulario.status === 'RASCUNHO';
          return (
            <div className="tabela-acoes">
              <button
                type="button"
                className="botao-tabela botao-tabela--destaque"
                onClick={() => navigate(`/admin/formularios/${formulario.id}/respostas`)}
              >
                Respostas
              </button>
              <button
                type="button"
                className="botao-tabela"
                onClick={() => navigate(`/admin/formularios/${formulario.id}`)}
              >
                Editar
              </button>
              <button
                type="button"
                className="botao-tabela"
                onClick={() => void onCopiar(formulario.id, linkPublico(formulario))}
                disabled={rascunho}
                title={
                  rascunho
                    ? 'Publique o formulário para compartilhar o link'
                    : linkPublico(formulario)
                }
              >
                {copiado === formulario.id ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                className="botao-tabela botao-tabela--perigo"
                disabled={removendo}
                onClick={() => onRemover(formulario)}
              >
                Excluir
              </button>
            </div>
          );
        },
      },
    ],
    [copiado, navigate, onCopiar, onRemover, removendo],
  );

  const colunasExternos = useMemo<ColunaTabela<FormularioListagem>[]>(
    () => [
      {
        id: 'titulo',
        header: 'Formulário',
        enableSorting: false,
        cell: ({ row }) => {
          const formulario = row.original;
          return (
            <div className="tabela-identidade">
              <span className="tabela-identidade-nome">{formulario.titulo}</span>
              <span className="tabela-identidade-apoio">
                {origemDoLink(formulario.urlExterna ?? '')}
                {formulario.descricao ? ` · ${formulario.descricao}` : ''}
              </span>
            </div>
          );
        },
      },
      {
        id: 'disponibilidade',
        header: 'Disponibilidade',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="texto-secundario">{rotuloDisponibilidade(row.original)}</span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Adicionado em',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabela-numerico">{formatarData(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'acoes',
        header: () => <span className="visually-hidden">Ações</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const formulario = row.original;
          const url = formulario.urlExterna ?? '';
          return (
            <div className="tabela-acoes">
              <a
                className="botao-tabela botao-tabela--destaque"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir
              </a>
              <button
                type="button"
                className="botao-tabela"
                onClick={() => abrirModalExterno(formulario)}
              >
                Editar
              </button>
              <button
                type="button"
                className="botao-tabela"
                title={url}
                onClick={() => void onCopiar(formulario.id, url)}
              >
                {copiado === formulario.id ? 'Copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                className="botao-tabela botao-tabela--perigo"
                disabled={removendo}
                onClick={() => onRemover(formulario)}
              >
                Remover
              </button>
            </div>
          );
        },
      },
    ],
    [abrirModalExterno, copiado, onCopiar, onRemover, removendo],
  );

  return (
    <AreaLayout
      tipo="admin"
      titulo="Formulários"
      descricao="Crie formulários no sistema e guarde aqui os links dos que ficam no Google."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => navigate('/admin/formularios/novo')}
        >
          Criar formulário
        </button>
      }
    >
      {isLoading && !formularios && <EstadoCarregando mensagem="Carregando formulários…" />}
      {isError && !formularios && <p className="erro">Erro ao carregar os formulários.</p>}

      {formularios && (
        <div className="formularios-secoes">
          <section aria-labelledby="formularios-proprios-titulo">
            <header className="formularios-secao-topo">
              <div>
                <h2 id="formularios-proprios-titulo">Formulários do sistema</h2>
                <p className="texto-secundario">
                  Perguntas montadas aqui, respondidas na plataforma e exportáveis em CSV.
                </p>
              </div>
            </header>

            {proprios.length === 0 ? (
              <div className="estado-vazio formularios-vazio">
                <p className="eyebrow">Comece por aqui</p>
                <h3>Nenhum formulário ainda</h3>
                <p>
                  Monte perguntas, publique e compartilhe o link com filiados ou com qualquer
                  pessoa. As respostas chegam aqui, com exportação em CSV.
                </p>
                <button
                  type="button"
                  className="botao-primario"
                  onClick={() => navigate('/admin/formularios/novo')}
                >
                  Criar o primeiro formulário
                </button>
              </div>
            ) : (
              <>
                <dl className="formularios-meta">
                  <div>
                    <dt>Total</dt>
                    <dd>{proprios.length}</dd>
                  </div>
                  <div>
                    <dt>Publicados</dt>
                    <dd>{publicados}</dd>
                  </div>
                  <div>
                    <dt>Respostas</dt>
                    <dd>{totalRespostas}</dd>
                  </div>
                </dl>

                <TabelaDados
                  colunas={colunas}
                  dados={proprios}
                  chaveLinha={(item) => item.id}
                  descricao="Formulários do sindicato"
                />
              </>
            )}
          </section>

          <section aria-labelledby="formularios-externos-titulo">
            <header className="formularios-secao-topo">
              <div>
                <h2 id="formularios-externos-titulo">Links externos</h2>
                <p className="texto-secundario">
                  Formulários que continuam no Google, guardados aqui para não se perderem.
                  Ficam só no painel até você liberar para os filiados.
                </p>
              </div>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => abrirModalExterno(null)}
              >
                Adicionar link
              </button>
            </header>

            {externos.length === 0 ? (
              <div className="estado-vazio estado-vazio--compacto">
                <p>
                  Nenhum link guardado. Cadastre os formulários do Google para ter tudo em um
                  lugar só.
                </p>
              </div>
            ) : (
              <TabelaDados
                colunas={colunasExternos}
                dados={externos}
                chaveLinha={(item) => item.id}
                descricao="Formulários mantidos fora da plataforma"
              />
            )}
          </section>
        </div>
      )}

      {modalConfirmacao}
      <FormularioExternoModal
        aberto={modalExternoAberto}
        formulario={externoEmEdicao}
        onFechar={() => {
          setModalExternoAberto(false);
          setExternoEmEdicao(null);
        }}
      />
    </AreaLayout>
  );
}
