import type { Imovel } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarMoeda } from '../../../../lib/moeda';
import { useImoveisAdmin, useRemoverImovel } from '../../hooks';
import { ImovelFormModal } from './ImovelFormModal';

type ModalImovel = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

export function ImoveisAdminPage() {
  const { data: imoveis, isLoading, isError } = useImoveisAdmin();
  const remover = useRemoverImovel();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalImovel>(null);

  const onRemover = (imovel: Imovel) => {
    if (confirmandoId !== imovel.id) {
      setConfirmandoId(imovel.id);
      return;
    }
    remover.mutate(imovel.id, { onSettled: () => setConfirmandoId(null) });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Apartamentos"
      descricao="Cadastre imóveis, fotos e disponibilidade."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => setModal({ modo: 'criar' })}
        >
          Novo apartamento
        </button>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando imóveis…" />}
      {isError && (
        <p className="erro">Não foi possível carregar os imóveis. Tente novamente.</p>
      )}

      {imoveis && imoveis.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum apartamento cadastrado ainda.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModal({ modo: 'criar' })}
          >
            Cadastrar o primeiro
          </button>
        </div>
      )}

      {imoveis && imoveis.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Endereço</th>
                <th>Valor/dia</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {imoveis.map((imovel) => (
                <tr key={imovel.id}>
                  <td>{imovel.titulo}</td>
                  <td>{imovel.endereco}</td>
                  <td>{formatarMoeda(imovel.valor)}</td>
                  <td>
                    <span className={`badge ${imovel.ativo ? 'badge-ativo' : 'badge-inativo'}`}>
                      {imovel.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => setModal({ modo: 'editar', id: imovel.id })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending && confirmandoId === imovel.id}
                      onClick={() => onRemover(imovel)}
                      onBlur={() => setConfirmandoId(null)}
                    >
                      {confirmandoId === imovel.id ? 'Confirmar exclusão?' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImovelFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
    </AreaLayout>
  );
}
