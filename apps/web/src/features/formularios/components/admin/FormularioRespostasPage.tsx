import type { ItemResposta, RespostaFormulario } from '@sindprf/types';
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

export function FormularioRespostasPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRespostasFormulario(id);
  const remover = useRemoverResposta(id);
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [detalhe, setDetalhe] = useState<RespostaFormulario | null>(null);
  const [baixando, setBaixando] = useState(false);

  const onBaixarCsv = async () => {
    if (!id || !data) return;
    setBaixando(true);
    try {
      await baixarRespostasCsv(id, `${data.formulario.slug}-respostas.csv`);
    } finally {
      setBaixando(false);
    }
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
        <EstadoCarregando />
      </AreaLayout>
    );
  }

  if (isError || !data) {
    return (
      <AreaLayout tipo="admin" titulo="Respostas">
        <p className="erro">Erro ao carregar as respostas.</p>
      </AreaLayout>
    );
  }

  const { formulario, respostas, resumo } = data;
  // A tabela ficaria ilegível com 20 colunas: mostra as primeiras e joga o
  // resto para o detalhe.
  const colunas = formulario.campos.slice(0, 4);

  return (
    <AreaLayout
      tipo="admin"
      titulo={formulario.titulo}
      descricao={`${respostas.length} resposta(s) recebida(s).`}
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
            className="botao-primario"
            onClick={() => void onBaixarCsv()}
            disabled={baixando || respostas.length === 0}
          >
            {baixando ? 'Gerando…' : 'Exportar CSV'}
          </button>
        </>
      }
    >
      {respostas.length === 0 && (
        <div className="estado-vazio">
          <p>Ainda não há respostas para este formulário.</p>
        </div>
      )}

      {resumo.length > 0 && respostas.length > 0 && (
        <section className="resumo-respostas">
          <h2>Resumo</h2>
          <div className="resumo-grid">
            {resumo.map((campo) => {
              const maior = Math.max(1, ...campo.contagem.map((opcao) => opcao.total));
              return (
                <article key={campo.campoId} className="resumo-card">
                  <h3>{campo.rotulo}</h3>
                  <p className="texto-secundario">{campo.totalRespondido} resposta(s)</p>
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
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Enviado em</th>
                <th>Quem respondeu</th>
                {colunas.map((campo) => (
                  <th key={campo.id}>{campo.rotulo}</th>
                ))}
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {respostas.map((resposta) => {
                const porCampo = new Map(resposta.valores.map((item) => [item.campoId, item]));
                return (
                  <tr key={resposta.id}>
                    <td>{formatarDataHora(resposta.enviadoEm)}</td>
                    <td>
                      {resposta.afiliadoNome ?? <em className="texto-secundario">Anônimo</em>}
                      {resposta.afiliadoMatricula && (
                        <span className="texto-secundario"> · {resposta.afiliadoMatricula}</span>
                      )}
                    </td>
                    {colunas.map((campo) => (
                      <td key={campo.id}>{resumoDoItem(porCampo.get(campo.id))}</td>
                    ))}
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        className="botao-link-acao"
                        onClick={() => setDetalhe(resposta)}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="botao-perigo"
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
      )}

      <Modal
        aberto={detalhe !== null}
        onFechar={() => setDetalhe(null)}
        titulo="Resposta"
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
