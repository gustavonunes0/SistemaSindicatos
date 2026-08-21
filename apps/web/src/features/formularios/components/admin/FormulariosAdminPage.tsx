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

const publicoCurto: Record<FormularioListagem['publico'], string> = {
  TODOS: 'Aberto',
  FILIADOS: 'Só filiados',
};

function linkPublico(slug: string): string {
  return `${window.location.origin}/formularios/${slug}`;
}

export function FormulariosAdminPage() {
  const { data: formularios, isLoading, isError } = useFormulariosAdmin();
  const remover = useRemoverFormulario();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState<string | null>(null);
  const mutarRemover = remover.mutateAsync;
  const removendo = remover.isPending;

  const onCopiarLink = useCallback(async (formulario: FormularioListagem) => {
    await navigator.clipboard.writeText(linkPublico(formulario.slug));
    setCopiado(formulario.id);
    window.setTimeout(() => setCopiado(null), 2000);
  }, []);

  const onRemover = useCallback(
    (formulario: FormularioListagem) => {
      pedirConfirmacao({
        titulo: 'Excluir formulário?',
        descricao:
          formulario.totalRespostas > 0
            ? `“${formulario.titulo}” tem ${formulario.totalRespostas} resposta(s). Tudo será removido permanentemente.`
            : `O formulário “${formulario.titulo}” será removido permanentemente.`,
        confirmarRotulo: 'Excluir',
        onConfirmar: () => mutarRemover(formulario.id),
      });
    },
    [mutarRemover, pedirConfirmacao],
  );

  const publicados = formularios?.filter((item) => item.status === 'PUBLICADO').length ?? 0;
  const totalRespostas =
    formularios?.reduce((soma, item) => soma + item.totalRespostas, 0) ?? 0;

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
                onClick={() => void onCopiarLink(formulario)}
                disabled={rascunho}
                title={
                  rascunho
                    ? 'Publique o formulário para compartilhar o link'
                    : linkPublico(formulario.slug)
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
    [copiado, navigate, onCopiarLink, onRemover, removendo],
  );

  return (
    <AreaLayout
      tipo="admin"
      titulo="Formulários"
      descricao="Crie formulários, compartilhe o link e acompanhe as respostas."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => navigate('/admin/formularios/novo')}
        >
          Novo formulário
        </button>
      }
    >
      {isLoading && !formularios && <EstadoCarregando mensagem="Carregando formulários…" />}
      {isError && !formularios && <p className="erro">Erro ao carregar os formulários.</p>}

      {formularios && formularios.length === 0 && (
        <div className="estado-vazio formularios-vazio">
          <p className="eyebrow">Comece por aqui</p>
          <h2>Nenhum formulário ainda</h2>
          <p>
            Monte perguntas, publique e compartilhe o link com filiados ou com qualquer pessoa.
            As respostas chegam aqui, com exportação em CSV.
          </p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => navigate('/admin/formularios/novo')}
          >
            Criar o primeiro formulário
          </button>
        </div>
      )}

      {formularios && formularios.length > 0 && (
        <>
          <dl className="formularios-meta">
            <div>
              <dt>Total</dt>
              <dd>{formularios.length}</dd>
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
            dados={formularios}
            chaveLinha={(item) => item.id}
            descricao="Formulários do sindicato"
          />
        </>
      )}

      {modalConfirmacao}
    </AreaLayout>
  );
}
