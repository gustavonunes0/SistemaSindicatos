import type { ConvenioListagem } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { useConveniosAdmin, useRemoverConvenio } from '../../hooks';
import { EmitirDeclaracaoModal } from '../EmitirDeclaracaoModal';
import { ConvenioFormModal } from './ConvenioFormModal';
import { LinksCategoriasCard } from './LinksCategoriasCard';

type ModalConvenio = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

export function ConveniosAdminPage() {
  const { data: convenios, isLoading, isError } = useConveniosAdmin();
  const remover = useRemoverConvenio();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modal, setModal] = useState<ModalConvenio>(null);
  const [emitirPara, setEmitirPara] = useState<ConvenioListagem | null>(null);

  const onRemover = (convenio: ConvenioListagem) => {
    pedirConfirmacao({
      titulo: 'Excluir convênio?',
      descricao: `O convênio “${convenio.nome}” será removido permanentemente.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(convenio.id),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Convênios"
      descricao="Gerencie parceiros e benefícios. Você também pode emitir declaração para si."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => setModal({ modo: 'criar' })}
        >
          Novo convênio
        </button>
      }
    >
      <LinksCategoriasCard />

      {isLoading && !convenios && <EstadoCarregando mensagem="Carregando convênios…" />}
      {isError && !convenios && (
        <p className="erro">Não foi possível carregar os convênios. Tente novamente.</p>
      )}

      {convenios && convenios.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum convênio cadastrado ainda.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModal({ modo: 'criar' })}
          >
            Adicionar o primeiro
          </button>
        </div>
      )}

      {convenios && convenios.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Parceiro</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Declaração</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {convenios.map((convenio) => (
                <tr key={convenio.id}>
                  <td>{convenio.nome}</td>
                  <td>{convenio.categoria}</td>
                  <td>
                    <span className={`badge ${convenio.ativo ? 'badge-ativo' : 'badge-inativo'}`}>
                      {convenio.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    {convenio.emiteDeclaracao ? (
                      <span className="badge badge-publicado">Sim</span>
                    ) : (
                      <span className="badge badge-rascunho">Não</span>
                    )}
                  </td>
                  <td className="tabela-acoes">
                    {convenio.emiteDeclaracao && convenio.ativo ? (
                      <button
                        type="button"
                        className="botao-tabela"
                        onClick={() => setEmitirPara(convenio)}
                      >
                        Emitir
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="botao-tabela"
                      onClick={() => setModal({ modo: 'editar', id: convenio.id })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      disabled={remover.isPending}
                      onClick={() => onRemover(convenio)}
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

      <ConvenioFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
      {emitirPara ? (
        <EmitirDeclaracaoModal
          aberto
          modoAdmin
          convenio={emitirPara}
          onFechar={() => setEmitirPara(null)}
        />
      ) : null}
      {modalConfirmacao}
    </AreaLayout>
  );
}
