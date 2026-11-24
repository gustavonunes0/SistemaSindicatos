import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMarca } from '../../../lib/marca';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { useImoveis } from '../hooks';
import { modoImoveis, mostrarVitrine, reservaPeloSistema } from '../modo';
import { ImovelCard } from './ImovelCard';
import { RegrasHospedagem } from './RegrasHospedagem';
import { ReservaExterna } from './ReservaExterna';

export function ImoveisPage() {
  const marca = useMarca();
  const modo = modoImoveis(marca);
  const vitrine = mostrarVitrine(marca);
  const sistema = reservaPeloSistema(marca);
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const { data: imoveis, isLoading, isError } = useImoveis({}, aprovado && vitrine);

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Apartamentos"
      descricao={
        sistema
          ? 'Consulte a disponibilidade, confira o regulamento e solicite a hospedagem pelo sistema.'
          : vitrine
            ? 'Conheça os imóveis e conclua a reserva no canal oficial.'
            : 'Reserve os apartamentos de lazer pelo sistema oficial do sindicato.'
      }
      acoes={
        aprovado && sistema ? (
          <Link to="/afiliado/solicitacoes" className="botao-secundario">
            Minhas reservas
          </Link>
        ) : undefined
      }
    >
      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="Os apartamentos" />}

      {!carregandoMe && aprovado && modo === 'LINK' && (
        <ReservaExterna
          titulo="Reservar apartamento"
          descricao="A reserva é feita no sistema oficial do sindicato. Use o botão abaixo para escolher datas e concluir o pedido."
          ctaRotulo="Abrir sistema de reserva"
        />
      )}

      {!carregandoMe && aprovado && vitrine && (
        <div className="imoveis-afiliado">
          <RegrasHospedagem />

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
              <strong>{sistema ? 'Solicite no sistema' : 'Finalize a reserva'}</strong>
              <span>
                {sistema
                  ? 'Envie o pedido com acompanhantes; a Presidência confirma.'
                  : 'Conclua pelo sistema oficial do sindicato.'}
              </span>
            </li>
          </ol>

          {sistema && (
            <p className="texto-secundario">
              Filiado de outro estado ou PRF não filiado?{' '}
              <Link to="/apartamentos">Peça a reserva no site público</Link>, com os valores do
              regulamento.
            </p>
          )}

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
              </header>

              <ul className="imoveis-grid">
                {imoveis.map((imovel) => (
                  <li key={imovel.id}>
                    <ImovelCard imovel={imovel} reservaSistema={sistema} />
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
