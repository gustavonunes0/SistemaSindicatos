import type { NoticiaListagem } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { InstagramDestaquesAdmin } from '../../../instagram/components/admin/InstagramDestaquesAdmin';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarData } from '../../../../lib/datas';
import { useNoticiasAdmin, useRemoverNoticia } from '../../hooks';
import { NoticiaFormModal } from './NoticiaFormModal';

type ModalNoticia = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

export function NoticiasAdminPage() {
  const { data: noticias, isLoading, isError } = useNoticiasAdmin();
  const remover = useRemoverNoticia();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modal, setModal] = useState<ModalNoticia>(null);

  const onRemover = (noticia: NoticiaListagem) => {
    pedirConfirmacao({
      titulo: 'Excluir notícia?',
      descricao: `A notícia “${noticia.titulo}” será removida permanentemente.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(noticia.id),
    });
  };

  return (
    <AreaLayout
      tipo="admin"
      titulo="Notícias"
      descricao="Publique comunicados, marque destaques da home e organize rascunhos."
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
      {isLoading && !noticias && <EstadoCarregando />}
      {isError && !noticias && <p className="erro">Erro ao carregar as notícias.</p>}

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
                <th>Home</th>
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
                  <td>
                    {noticia.destaque ? (
                      <span className="badge badge-destaque">Destaque</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{noticia.publicadoEm ? formatarData(noticia.publicadoEm) : '—'}</td>
                  <td className="tabela-acoes">
                    <button
                      type="button"
                      className="botao-tabela"
                      onClick={() => setModal({ modo: 'editar', id: noticia.id })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      disabled={remover.isPending}
                      onClick={() => onRemover(noticia)}
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

      <InstagramDestaquesAdmin />

      <NoticiaFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
