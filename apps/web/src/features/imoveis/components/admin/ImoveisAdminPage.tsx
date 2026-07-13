import type { Imovel } from '@sindprf/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarMoeda } from '../../../../lib/moeda';
import { useImoveisAdmin, useRemoverImovel } from '../../hooks';

export function ImoveisAdminPage() {
  const { data: imoveis, isLoading, isError } = useImoveisAdmin();
  const remover = useRemoverImovel();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

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
      acoes={
        <Link to="/admin/imoveis/novo" className="botao-primario">
          Novo apartamento
        </Link>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando imóveis…" />}
      {isError && (
        <p className="erro">Não foi possível carregar os imóveis. Tente novamente.</p>
      )}

      {imoveis && imoveis.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum apartamento cadastrado ainda.</p>
          <Link to="/admin/imoveis/novo" className="botao-primario">
            Cadastrar o primeiro
          </Link>
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
                    <Link to={`/admin/imoveis/${imovel.id}/editar`}>Editar</Link>
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
    </AreaLayout>
  );
}
