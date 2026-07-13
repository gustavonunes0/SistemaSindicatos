import type { Convenio } from '@sindprf/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConveniosAdmin, useRemoverConvenio } from '../../hooks';

export function ConveniosAdminPage() {
  const { data: convenios, isLoading, isError } = useConveniosAdmin();
  const remover = useRemoverConvenio();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const onRemover = (convenio: Convenio) => {
    if (confirmandoId !== convenio.id) {
      setConfirmandoId(convenio.id);
      return;
    }
    remover.mutate(convenio.id, { onSettled: () => setConfirmandoId(null) });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Convênios"
      acoes={
        <Link to="/admin/convenios/novo" className="botao-primario">
          Novo convênio
        </Link>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando convênios…" />}
      {isError && (
        <p className="erro">Não foi possível carregar os convênios. Tente novamente.</p>
      )}

      {convenios && convenios.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhum convênio cadastrado ainda.</p>
          <Link to="/admin/convenios/novo" className="botao-primario">
            Adicionar o primeiro
          </Link>
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
                  <td className="tabela-acoes">
                    <Link to={`/admin/convenios/${convenio.id}/editar`}>Editar</Link>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending && confirmandoId === convenio.id}
                      onClick={() => onRemover(convenio)}
                      onBlur={() => setConfirmandoId(null)}
                    >
                      {confirmandoId === convenio.id ? 'Confirmar exclusão?' : 'Excluir'}
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
