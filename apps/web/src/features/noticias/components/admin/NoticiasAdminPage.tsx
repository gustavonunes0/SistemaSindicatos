import type { Noticia } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarData } from '../../../../lib/datas';
import { useNoticiasAdmin, useRemoverNoticia } from '../../hooks';
import { NoticiaFormModal } from './NoticiaFormModal';

type ModalNoticia = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

export function NoticiasAdminPage() {
  const { data: noticias, isLoading, isError } = useNoticiasAdmin();
  const remover = useRemoverNoticia();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalNoticia>(null);

  const onRemover = (noticia: Noticia) => {
    if (confirmandoId !== noticia.id) {
      setConfirmandoId(noticia.id);
      return;
    }
    remover.mutate(noticia.id, { onSettled: () => setConfirmandoId(null) });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Notícias"
      descricao="Publique comunicados e organize rascunhos do site."
      acoes={
        <button
          type="button"
          className="botao-primario"
          onClick={() => setModal({ modo: 'criar' })}
        >
          Nova notícia
        </button>
      }
    >
      {isLoading && <EstadoCarregando />}
      {isError && <p className="erro">Erro ao carregar as notícias.</p>}

      {noticias && noticias.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma notícia criada ainda.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModal({ modo: 'criar' })}
          >
            Publicar a primeira
          </button>
        </div>
      )}

      {noticias && noticias.length > 0 && (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Publicada em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {noticias.map((noticia) => (
                <tr key={noticia.id}>
                  <td>{noticia.titulo}</td>
                  <td>
                    <span className={`badge badge-${noticia.status.toLowerCase()}`}>
                      {noticia.status === 'PUBLICADO' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td>{noticia.publicadoEm ? formatarData(noticia.publicadoEm) : '—'}</td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-link-acao"
                      onClick={() => setModal({ modo: 'editar', id: noticia.id })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-perigo"
                      disabled={remover.isPending && confirmandoId === noticia.id}
                      onClick={() => onRemover(noticia)}
                      onBlur={() => setConfirmandoId(null)}
                    >
                      {confirmandoId === noticia.id ? 'Confirmar exclusão?' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NoticiaFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
    </AreaLayout>
  );
}
