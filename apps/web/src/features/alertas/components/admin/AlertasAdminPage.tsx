import { PUBLICO_ALERTA_ROTULO, type Alerta } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarDataHora } from '../../../../lib/datas';
import { useAlertasAdmin, useRemoverAlerta } from '../../hooks';
import { AlertaFormModal } from './AlertaFormModal';

type ModalAlerta = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

type Situacao = { rotulo: string; tom: 'no-ar' | 'agendado' | 'encerrado' | 'inativo' };

/** Traduz vigência + flag em algo que o admin entende de relance. */
function situacaoDoAlerta(alerta: Alerta, agora: Date): Situacao {
  if (!alerta.ativo) {
    return { rotulo: 'Inativo', tom: 'inativo' };
  }
  if (alerta.inicioEm > agora) {
    return { rotulo: 'Agendado', tom: 'agendado' };
  }
  if (alerta.fimEm < agora) {
    return { rotulo: 'Encerrado', tom: 'encerrado' };
  }
  return { rotulo: 'No ar', tom: 'no-ar' };
}

export function AlertasAdminPage() {
  const { data: alertas, isLoading, isError } = useAlertasAdmin();
  const remover = useRemoverAlerta();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modal, setModal] = useState<ModalAlerta>(null);
  const agora = new Date();

  const onRemover = (alerta: Alerta) => {
    pedirConfirmacao({
      titulo: 'Excluir alerta?',
      descricao: `O alerta “${alerta.titulo}” será removido permanentemente.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(alerta.id),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Alertas"
      descricao="Avisos em popup exibidos no site e na área do filiado durante um período."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => setModal({ modo: 'criar' })}
        >
          Novo alerta
        </button>
      }
    >
      {isLoading && !alertas && <EstadoCarregando />}
      {isError && !alertas && <p className="erro">Erro ao carregar os alertas.</p>}

      {alertas && alertas.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum alerta criado ainda.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModal({ modo: 'criar' })}
          >
            Criar o primeiro
          </button>
        </div>
      )}

      {alertas && alertas.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Situação</th>
                <th>Quem vê</th>
                <th>Período</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta) => {
                const situacao = situacaoDoAlerta(alerta, agora);
                return (
                  <tr key={alerta.id}>
                    <td>{alerta.titulo}</td>
                    <td>
                      <span className={`badge badge-alerta-${situacao.tom}`}>
                        {situacao.rotulo}
                      </span>
                    </td>
                    <td>{PUBLICO_ALERTA_ROTULO[alerta.publico]}</td>
                    <td>
                      {formatarDataHora(alerta.inicioEm)} até {formatarDataHora(alerta.fimEm)}
                    </td>
                    <td className="tabela-acoes">
                      <button
                        type="button"
                        className="botao-link-acao"
                        onClick={() => setModal({ modo: 'editar', id: alerta.id })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="botao-perigo"
                        disabled={remover.isPending}
                        onClick={() => onRemover(alerta)}
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

      <AlertaFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
