import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { marca } from '../../../lib/marca';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';

export function ImoveisPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';

  return (
    <AreaLayout tipo="afiliado" titulo="Apartamentos">
      <p className="area-subtitulo">
        Consulte o regulamento e reserve os imóveis de lazer pelo sistema oficial.
      </p>

      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}

      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="Os apartamentos" />}

      {!carregandoMe && aprovado && (
        <div className="reserva-externa-lista">
          <section className="reserva-externa">
            <h2 className="reserva-externa-titulo">Regulamento</h2>
            <p className="reserva-externa-texto">
              Leia o regulamento dos apartamentos e espaços de convivência do SINDPRF-CE antes de
              solicitar a reserva.
            </p>
            <a
              className="botao-secundario"
              href={marca.regulamentoApartamentosUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir regulamento (PDF)
            </a>
          </section>

          <section className="reserva-externa">
            <h2 className="reserva-externa-titulo">Como reservar</h2>
            <p className="reserva-externa-texto">
              O cadastro e a reserva de apartamentos são feitos pelo link oficial do SINDPRF-CE.
              Clique no botão abaixo para abrir o sistema de reservas.
            </p>
            <a
              className="botao-primario"
              href={marca.reservaApartamentosUrl}
              target="_blank"
              rel="noreferrer"
            >
              Fazer reserva
            </a>
            <p className="reserva-externa-ajuda">
              O link abre em uma nova aba: {marca.reservaApartamentosUrl}
            </p>
          </section>
        </div>
      )}
    </AreaLayout>
  );
}
