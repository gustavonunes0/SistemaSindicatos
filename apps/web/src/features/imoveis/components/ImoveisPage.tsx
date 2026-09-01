import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { useImoveis } from '../hooks';
import { ImovelCard } from './ImovelCard';
import { ReservaExterna } from './ReservaExterna';

export function ImoveisPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const { data: imoveis, isLoading, isError } = useImoveis({}, aprovado);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Apartamentos"
      descricao="Imóveis de lazer do sindicato: veja as fotos, os valores e as datas livres."
    >
      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="Os apartamentos" />}

      {!carregandoMe && aprovado && (
        <>
          <ReservaExterna
            titulo="Como reservar"
            descricao="Escolha um apartamento abaixo para ver as fotos e o calendário. A reserva em si é confirmada no sistema oficial do sindicato."
          />

          {isLoading && <EstadoCarregando mensagem="Carregando apartamentos…" />}
          {isError && (
            <p className="erro">Não foi possível carregar os apartamentos. Tente novamente.</p>
          )}

          {imoveis && imoveis.length === 0 && (
            <div className="estado-vazio">
              <p>Nenhum apartamento disponível no momento.</p>
            </div>
          )}

          {imoveis && imoveis.length > 0 && (
            <section className="imoveis-vitrine">
              <h2 className="imoveis-vitrine-titulo">
                {imoveis.length === 1
                  ? '1 apartamento disponível'
                  : `${imoveis.length} apartamentos disponíveis`}
              </h2>
              <ul className="imoveis-grid">
                {imoveis.map((imovel) => (
                  <li key={imovel.id}>
                    <ImovelCard imovel={imovel} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AreaLayout>
  );
}
