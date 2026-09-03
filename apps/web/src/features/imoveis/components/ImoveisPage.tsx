import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMarca } from '../../../lib/marca';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { useImoveis } from '../hooks';
import { modoImoveis } from '../modo';
import { ImovelCard } from './ImovelCard';
import { ReservaExterna } from './ReservaExterna';

export function ImoveisPage() {
  const marca = useMarca();
  const modo = modoImoveis(marca);
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const mostrarVitrine = modo === 'VITRINE';
  const { data: imoveis, isLoading, isError } = useImoveis({}, aprovado && mostrarVitrine);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Apartamentos"
      descricao={
        mostrarVitrine
          ? 'Conheça os imóveis de lazer, confira as datas livres e conclua a reserva no canal oficial.'
          : 'Reserve os apartamentos de lazer pelo sistema oficial do sindicato.'
      }
    >
      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="Os apartamentos" />}

      {!carregandoMe && aprovado && !mostrarVitrine && (
        <ReservaExterna
          titulo="Reservar apartamento"
          descricao="A reserva é feita no sistema oficial do sindicato. Use o botão abaixo para escolher datas e concluir o pedido."
          ctaRotulo="Abrir sistema de reserva"
        />
      )}

      {!carregandoMe && aprovado && mostrarVitrine && (
        <div className="imoveis-afiliado">
          <ol className="imoveis-roteiro" aria-label="Como reservar">
            <li>
              <strong>Escolha o imóvel</strong>
              <span>Abra o apartamento para ver fotos e comodidades.</span>
            </li>
            <li>
              <strong>Confira as datas</strong>
              <span>No calendário, veja o que está livre no mês.</span>
            </li>
            <li>
              <strong>Finalize a reserva</strong>
              <span>Conclua pelo sistema oficial do sindicato.</span>
            </li>
          </ol>

          {isLoading && <EstadoCarregando mensagem="Carregando apartamentos…" />}
          {isError && (
            <p className="erro">Não foi possível carregar os apartamentos. Tente novamente.</p>
          )}

          {imoveis && imoveis.length === 0 && (
            <div className="estado-vazio imoveis-vazio">
              <p className="eyebrow">Vitrine</p>
              <h2>Nenhum apartamento publicado</h2>
              <p>Quando houver imóveis disponíveis, eles aparecerão aqui com fotos e calendário.</p>
            </div>
          )}

          {imoveis && imoveis.length > 0 && (
            <section className="imoveis-vitrine" aria-labelledby="imoveis-vitrine-titulo">
              <header className="imoveis-vitrine-cabecalho">
                <div>
                  <p className="eyebrow">Disponíveis</p>
                  <h2 id="imoveis-vitrine-titulo">
                    {imoveis.length === 1
                      ? '1 apartamento'
                      : `${imoveis.length} apartamentos`}
                  </h2>
                </div>
                {marca.regulamentoApartamentosUrl && (
                  <a
                    className="botao-link"
                    href={marca.regulamentoApartamentosUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Regulamento
                    <span aria-hidden="true"> ↗</span>
                  </a>
                )}
              </header>

              <ul className="imoveis-grid">
                {imoveis.map((imovel) => (
                  <li key={imovel.id}>
                    <ImovelCard imovel={imovel} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AreaLayout>
  );
}
