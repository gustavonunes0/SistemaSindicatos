import type { Evento } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { urlDaApi } from '../../../../lib/urls';
import { formatarDataEvento } from '../../formatarDataEvento';
import { useEventosAdmin, useRemoverEvento } from '../../hooks';
import { EventoFormModal } from './EventoFormModal';

type ModalEvento = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

export function EventosAdminPage() {
  const { data: eventos, isLoading, isError } = useEventosAdmin();
  const remover = useRemoverEvento();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modal, setModal] = useState<ModalEvento>(null);

  const onRemover = (evento: Evento) => {
    pedirConfirmacao({
      titulo: 'Excluir evento?',
      descricao: `O evento “${evento.titulo}” e todas as fotos da galeria serão removidos.`,
      confirmarRotulo: 'Excluir',
      tom: 'perigo',
      onConfirmar: () => remover.mutateAsync(evento.id),
    });
  };

  const ativos = eventos?.filter((evento) => evento.ativo).length ?? 0;
  const totalFotos =
    eventos?.reduce((soma, evento) => soma + (evento.fotos?.length ?? 0), 0) ?? 0;

  return (
    <AreaLayout
      tipo="admin"
      titulo="Eventos"
      descricao="Cadastre eventos e publique a galeria de fotos para os filiados verem e baixarem."
      acoes={
        <button type="button" className="botao-primario" onClick={() => setModal({ modo: 'criar' })}>
          Novo evento
        </button>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando eventos…" />}
      {isError && <p className="erro">Não foi possível carregar os eventos. Tente novamente.</p>}

      {eventos && eventos.length === 0 && (
        <div className="estado-vazio">
          <p className="eyebrow">Comece por aqui</p>
          <h2>Nenhum evento cadastrado</h2>
          <p>Crie o primeiro evento e envie as fotos da galeria para os filiados.</p>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setModal({ modo: 'criar' })}
          >
            Cadastrar o primeiro
          </button>
        </div>
      )}

      {eventos && eventos.length > 0 && (
        <>
          <dl className="formularios-meta">
            <div>
              <dt>Total</dt>
              <dd>{eventos.length}</dd>
            </div>
            <div>
              <dt>Visíveis</dt>
              <dd>{ativos}</dd>
            </div>
            <div>
              <dt>Fotos</dt>
              <dd>{totalFotos}</dd>
            </div>
          </dl>

          <div className="eventos-admin-grade">
            {eventos.map((evento) => {
              const capa = evento.fotos?.[0];
              return (
                <article key={evento.id} className="evento-admin-card">
                  <div className="evento-admin-capa">
                    {capa ? (
                      <img src={urlDaApi(capa.url)} alt="" />
                    ) : (
                      <span className="evento-admin-capa-vazia">Sem fotos</span>
                    )}
                  </div>
                  <div className="evento-admin-corpo">
                    <div className="evento-admin-topo">
                      <h2>{evento.titulo}</h2>
                      <span className={`badge ${evento.ativo ? 'badge-ativo' : 'badge-inativo'}`}>
                        {evento.ativo ? 'Visível' : 'Oculto'}
                      </span>
                    </div>
                    {evento.dataEvento && (
                      <p className="texto-secundario">{formatarDataEvento(evento.dataEvento)}</p>
                    )}
                    {evento.local && <p className="texto-secundario">{evento.local}</p>}
                    <p className="texto-secundario">
                      {evento.fotos?.length ?? 0}{' '}
                      {(evento.fotos?.length ?? 0) === 1 ? 'foto' : 'fotos'}
                    </p>
                  </div>
                  <div className="evento-admin-rodape">
                    <button
                      type="button"
                      className="botao-tabela"
                      onClick={() => setModal({ modo: 'editar', id: evento.id })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="botao-tabela botao-tabela--perigo"
                      onClick={() => onRemover(evento)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <EventoFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
