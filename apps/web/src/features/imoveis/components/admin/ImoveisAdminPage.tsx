import type { Imovel } from '@sindprf/types';
import { useState } from 'react';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { useConfirmacao } from '../../../../hooks/useConfirmacao';
import { formatarMoeda } from '../../../../lib/moeda';
import { urlDaApi } from '../../../../lib/urls';
import { useImoveisAdmin, useRemoverImovel } from '../../hooks';
import { ImovelFormModal } from './ImovelFormModal';

type ModalImovel = { modo: 'criar' } | { modo: 'editar'; id: string } | null;

const COMODIDADES_VISIVEIS = 3;

export function ImoveisAdminPage() {
  const { data: imoveis, isLoading, isError } = useImoveisAdmin();
  const remover = useRemoverImovel();
  const { pedirConfirmacao, modalConfirmacao } = useConfirmacao();
  const [modal, setModal] = useState<ModalImovel>(null);

  const onRemover = (imovel: Imovel) => {
    pedirConfirmacao({
      titulo: 'Excluir apartamento?',
      descricao: `O imóvel “${imovel.titulo}” será removido permanentemente, incluindo fotos e períodos.`,
      confirmarRotulo: 'Excluir',
      onConfirmar: () => remover.mutateAsync(imovel.id),
    });
  };

  const ativos = imoveis?.filter((imovel) => imovel.ativo).length ?? 0;
  const semFoto = imoveis?.filter((imovel) => (imovel.fotos?.length ?? 0) === 0).length ?? 0;

  return (
    <AreaLayout
      tipo="admin"
      titulo="Apartamentos"
      descricao="Cadastre os imóveis de lazer, as fotos e os períodos indisponíveis."
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
        <div className="estado-vazio formularios-vazio">
          <p className="eyebrow">Comece por aqui</p>
          <h2>Nenhum apartamento cadastrado</h2>
          <p>
            Cadastre o primeiro imóvel com fotos, valor da diária e comodidades para os filiados
            consultarem.
          </p>
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
        <>
          <dl className="formularios-meta">
            <div>
              <dt>Total</dt>
              <dd>{imoveis.length}</dd>
            </div>
            <div>
              <dt>Visíveis</dt>
              <dd>{ativos}</dd>
            </div>
            {semFoto > 0 && (
              <div>
                <dt>Sem foto</dt>
                <dd>{semFoto}</dd>
              </div>
            )}
          </dl>

          <ul className="imoveis-admin-grade">
            {imoveis.map((imovel) => {
              const fotos = imovel.fotos ?? [];
              const capa = fotos[0];
              const extras = imovel.comodidades.length - COMODIDADES_VISIVEIS;

              return (
                <li key={imovel.id} className="imovel-admin-card">
                  <div className="imovel-admin-capa">
                    {capa ? (
                      <img src={urlDaApi(capa.url)} alt="" loading="lazy" />
                    ) : (
                      <span className="imovel-admin-capa-vazia">Sem foto</span>
                    )}
                    <span
                      className={`badge ${imovel.ativo ? 'badge-ativo' : 'badge-inativo'} imovel-admin-selo`}
                    >
                      {imovel.ativo ? 'Visível' : 'Oculto'}
                    </span>
                  </div>

                  <div className="imovel-admin-corpo">
                    <h2>{imovel.titulo}</h2>
                    <p className="imovel-admin-endereco">{imovel.endereco}</p>

                    <p className="imovel-admin-valor">
                      {formatarMoeda(imovel.valor)}
                      <span> por dia</span>
                    </p>

                    {imovel.comodidades.length > 0 && (
                      <ul className="imovel-comodidades">
                        {imovel.comodidades.slice(0, COMODIDADES_VISIVEIS).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                        {extras > 0 && <li className="imovel-comodidade-extra">+{extras}</li>}
                      </ul>
                    )}

                    <footer className="imovel-admin-rodape">
                      <span className="texto-secundario">
                        {fotos.length === 0
                          ? 'Nenhuma foto'
                          : `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`}
                      </span>
                      <div className="tabela-acoes">
                        <button
                          type="button"
                          className="botao-tabela botao-tabela--destaque"
                          onClick={() => setModal({ modo: 'editar', id: imovel.id })}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="botao-tabela botao-tabela--perigo"
                          disabled={remover.isPending}
                          onClick={() => onRemover(imovel)}
                        >
                          Excluir
                        </button>
                      </div>
                    </footer>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ImovelFormModal
        aberto={modal !== null}
        id={modal?.modo === 'editar' ? modal.id : undefined}
        onFechar={() => setModal(null)}
      />
      {modalConfirmacao}
    </AreaLayout>
  );
}
