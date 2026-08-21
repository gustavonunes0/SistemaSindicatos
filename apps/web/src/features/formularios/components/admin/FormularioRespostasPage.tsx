import {
  STATUS_FORMULARIO_ROTULO,
  type ItemResposta,
  type RespostaFormulario,
} from '@sindprf/types';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { Modal } from '../../../../components/ui/Modal';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarDataHora } from '../../../../lib/datas';
import { urlDaApi } from '../../../../lib/urls';
import { baixarRespostasCsv } from '../../api';
import { useRemoverResposta, useRespostasFormulario } from '../../hooks';

/** Versão curta para a célula da tabela; o detalhe mostra tudo. */
function resumoDoItem(item: ItemResposta | undefined): string {
  if (!item) return '—';
  if (item.arquivo) return item.arquivo.nome;
  if (item.selecionados.length > 0) return item.selecionados.join(', ');
  return item.texto ?? '—';
}

function ValorDoItem({ item }: { item: ItemResposta }) {
  if (item.arquivo) {
    return (
      <a href={urlDaApi(item.arquivo.url)} target="_blank" rel="noreferrer">
        {item.arquivo.nome}
      </a>
    );
  }
  if (item.selecionados.length > 0) {
    return (
      <ul className="resposta-lista">
        {item.selecionados.map((opcao) => (
          <li key={opcao}>{opcao}</li>
        ))}
      </ul>
    );
  }
  return <span>{item.texto || '—'}</span>;
}

function linkPublico(slug: string): string {
  return `${window.location.origin}/formularios/${slug}`;
}

export function FormularioRespostasPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRespostasFormulario(id);
  const remover = useRemoverResposta(id);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [detalhe, setDetalhe] = useState<RespostaFormulario | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const onBaixarCsv = async () => {
    if (!id || !data) return;
    setBaixando(true);
    try {
      await baixarRespostasCsv(id, `${data.formulario.slug}-respostas.csv`);
    } finally {
      setBaixando(false);
    }
  };

  const onCopiarLink = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(linkPublico(data.formulario.slug));
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const onRemover = (resposta: RespostaFormulario) => {
    pedirConfirmacao({
      titulo: 'Excluir resposta?',
      descricao: `A resposta de ${resposta.afiliadoNome ?? 'anônimo'} será removida permanentemente.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(resposta.id),
    });
  };

  if (isLoading && !data) {
    return (
      <AreaLayout tipo="admin" titulo="Respostas">
        <EstadoCarregando mensagem="Carregando respostas…" />
      </AreaLayout>
    );
  }

  if (isError || !data) {
    return (
      <AreaLayout tipo="admin" titulo="Respostas">
        <p className="erro">Erro ao carregar as respostas.</p>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => navigate('/admin/formularios')}
        >
          Voltar aos formulários
        </button>
      </AreaLayout>
    );
  }

  const { formulario, respostas, resumo } = data;
  // A tabela ficaria ilegível com 20 colunas: mostra as primeiras e joga o
  // resto para o detalhe.
  const colunas = formulario.campos.slice(0, 4);
  const perguntasExtras = Math.max(0, formulario.campos.length - colunas.length);
  const podeCompartilhar = formulario.status === 'PUBLICADO';

  return (
    <AreaLayout
      tipo="admin"
      titulo={formulario.titulo}
      descricao={`${respostas.length} ${respostas.length === 1 ? 'resposta recebida' : 'respostas recebidas'}.`}
      acoes={
        <>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => navigate('/admin/formularios')}
          >
            Voltar
          </button>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => navigate(`/admin/formularios/${formulario.id}`)}
          >
            Editar
          </button>
          <button
            type="button"
            className="botao-primario"
            onClick={() => void onBaixarCsv()}
            disabled={baixando || respostas.length === 0}
          >
            {baixando ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </>
      }
    >
      <div className="respostas-topo">
        <span className={`badge badge-formulario-${formulario.status.toLowerCase()}`}>
          {STATUS_FORMULARIO_ROTULO[formulario.status]}
        </span>
        {podeCompartilhar ? (
          <button type="button" className="botao-tabela" onClick={() => void onCopiarLink()}>
            {copiado ? 'Link copiado!' : 'Copiar link público'}
          </button>
        ) : (
          <p className="texto-secundario">
            {formulario.status === 'RASCUNHO'
              ? 'Publique o formulário para compartilhar o link.'
              : 'Formulário encerrado — o link não recebe mais respostas.'}
          </p>
        )}
      </div>

      {respostas.length === 0 && (
        <div className="estado-vazio formularios-vazio">
          <p className="eyebrow">Aguardando</p>
          <h2>Ainda não há respostas</h2>
          <p>
            Compartilhe o link com quem deve responder. As respostas aparecem aqui em tempo
            quase real, com resumo das escolhas e exportação em CSV.
          </p>
          <div className="formularios-vazio-acoes">
            {podeCompartilhar && (
              <button type="button" className="botao-primario" onClick={() => void onCopiarLink()}>
                {copiado ? 'Link copiado!' : 'Copiar link'}
              </button>
            )}
            <button
              type="button"
              className="botao-secundario"
              onClick={() => navigate(`/admin/formularios/${formulario.id}`)}
            >
              Editar formulário
            </button>
          </div>
        </div>
      )}

      {resumo.length > 0 && respostas.length > 0 && (
        <section className="resumo-respostas" aria-labelledby="resumo-titulo">
          <header className="resumo-cabecalho">
            <h2 id="resumo-titulo">Resumo das escolhas</h2>
            <p className="texto-secundario">
              Contagem das respostas de múltipla escolha, escolha única e lista.
            </p>
          </header>
          <div className="resumo-grid">
            {resumo.map((campo) => {
              const maior = Math.max(1, ...campo.contagem.map((opcao) => opcao.total));
              return (
                <article key={campo.campoId} className="resumo-card">
                  <h3>{campo.rotulo}</h3>
                  <p className="texto-secundario">
                    {campo.totalRespondido}{' '}
                    {campo.totalRespondido === 1 ? 'resposta' : 'respostas'}
                  </p>
                  <ul className="resumo-barras">
                    {campo.contagem.map((opcao) => (
                      <li key={opcao.opcao}>
                        <div className="resumo-barra-topo">
                          <span>{opcao.opcao}</span>
                          <strong>{opcao.total}</strong>
                        </div>
                        <div
                          className="resumo-barra"
                          role="presentation"
                          style={{ ['--proporcao' as string]: `${(opcao.total / maior) * 100}%` }}
                        />
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {respostas.length > 0 && (
        <section className="respostas-lista" aria-labelledby="lista-respostas-titulo">
          <header className="resumo-cabecalho">
            <h2 id="lista-respostas-titulo">Todas as respostas</h2>
            {perguntasExtras > 0 && (
              <p className="texto-secundario">
                A tabela mostra as primeiras {colunas.length} perguntas. As outras{' '}
                {perguntasExtras} aparecem em “Ver”.
              </p>
            )}
          </header>

          <div className="tabela-painel">
            <div className="tabela-rolagem">
              <table className="tabela" aria-label="Respostas do formulário">
                <thead>
                  <tr>
                    <th scope="col">Enviado em</th>
                    <th scope="col">Quem respondeu</th>
                    {colunas.map((campo) => (
                      <th key={campo.id} scope="col">
                        {campo.rotulo}
                      </th>
                    ))}
                    <th scope="col">
                      <span className="visually-hidden">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {respostas.map((resposta) => {
                    const porCampo = new Map(resposta.valores.map((item) => [item.campoId, item]));
                    return (
                      <tr key={resposta.id}>
                        <td>
                          <span className="tabela-numerico">
                            {formatarDataHora(resposta.enviadoEm)}
                          </span>
                        </td>
                        <td>
                          <div className="tabela-identidade">
                            <span className="tabela-identidade-nome">
                              {resposta.afiliadoNome ?? 'Anônimo'}
                            </span>
                            {resposta.afiliadoMatricula && (
                              <span className="tabela-identidade-apoio">
                                Mat. {resposta.afiliadoMatricula}
                              </span>
                            )}
                          </div>
                        </td>
                        {colunas.map((campo) => (
                          <td key={campo.id}>{resumoDoItem(porCampo.get(campo.id))}</td>
                        ))}
                        <td className="tabela-acoes">
                          <button
                            type="button"
                            className="botao-tabela botao-tabela--destaque"
                            onClick={() => setDetalhe(resposta)}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            className="botao-tabela botao-tabela--perigo"
                            disabled={remover.isPending}
                            onClick={() => onRemover(resposta)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <Modal
        aberto={detalhe !== null}
        onFechar={() => setDetalhe(null)}
        titulo="Resposta completa"
        descricao={
          detalhe
            ? `${detalhe.afiliadoNome ?? 'Anônimo'} · ${formatarDataHora(detalhe.enviadoEm)}`
            : undefined
        }
        tamanho="lg"
      >
        {detalhe && (
          <dl className="detalhe-resposta">
            {detalhe.valores.map((item) => (
              <div key={item.campoId}>
                <dt>{item.rotulo}</dt>
                <dd>
                  <ValorDoItem item={item} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      {modalConfirmacao}
    </AreaLayout>
  );
}
