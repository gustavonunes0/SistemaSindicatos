import { Link } from 'react-router-dom';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { areaPorRole } from '../../auth/hooks';
import { useAuthStore } from '../../auth/store';
import { useMarca } from '../../../lib/marca';
import { useSeo } from '../../../lib/seo';
import { useImoveisPublico } from '../hooks';
import { modoImoveis, mostrarVitrine, reservaPeloSistema } from '../modo';
import { ImovelCard } from './ImovelCard';
import { RegrasHospedagem } from './RegrasHospedagem';
import { ReservaExterna } from './ReservaExterna';

export function ApartamentosPublicPage() {
  const marca = useMarca();
  const user = useAuthStore((state) => state.user);
  const modo = modoImoveis(marca);
  const vitrine = mostrarVitrine(marca);
  const sistema = reservaPeloSistema(marca);
  const { data: imoveis, isLoading, isError } = useImoveisPublico({}, vitrine);

  useSeo({
    title: `Apartamentos — ${marca.nome}`,
    description: `Reserve os apartamentos de lazer do ${marca.nomeCompleto}. Filiados de outros estados e PRFs não filiados podem solicitar pelo site.`,
  });

  return (
    <main className="apartamentos-public-page">
      <header className="apartamentos-public-cabecalho">
        <p className="eyebrow">Hospedagem</p>
        <h1>Apartamentos</h1>
        <p>
          Espaços de convivência do {marca.nome}. Filiados do Ceará usam a área logada; filiados de
          outros estados e PRFs não filiados podem pedir reserva por aqui, conforme o regulamento.
        </p>
        <div className="apartamentos-public-acoes">
          <Link
            to={user ? areaPorRole(user.role) : '/login'}
            className="apartamentos-cta-filiado"
          >
            {user ? 'Ir para a área do filiado' : 'Sou filiado(a) SINDPRF-CE — entrar'}
          </Link>
        </div>
      </header>

      {modo === 'LINK' && (
        <ReservaExterna
          titulo="Reservar apartamento"
          descricao="A reserva é feita no canal oficial do sindicato."
          ctaRotulo="Abrir sistema de reserva"
        />
      )}

      {vitrine && (
        <div className="imoveis-afiliado">
          <RegrasHospedagem />

          {isLoading && <EstadoCarregando mensagem="Carregando apartamentos…" />}
          {isError && (
            <p className="erro">Não foi possível carregar os apartamentos. Tente novamente.</p>
          )}

          {imoveis && imoveis.length === 0 && (
            <div className="estado-vazio imoveis-vazio">
              <p className="eyebrow">Vitrine</p>
              <h2>Nenhum apartamento publicado</h2>
              <p>Quando houver imóveis disponíveis, eles aparecerão aqui.</p>
            </div>
          )}

          {imoveis && imoveis.length > 0 && (
            <section className="imoveis-vitrine" aria-labelledby="apartamentos-publicos-titulo">
              <header className="imoveis-vitrine-cabecalho">
                <div>
                  <p className="eyebrow">Disponíveis</p>
                  <h2 id="apartamentos-publicos-titulo">
                    {imoveis.length === 1
                      ? '1 apartamento'
                      : `${imoveis.length} apartamentos`}
                  </h2>
                </div>
              </header>

              <ul className="imoveis-grid">
                {imoveis.map((imovel) => (
                  <li key={imovel.id}>
                    <ImovelCard
                      imovel={imovel}
                      reservaSistema={sistema}
                      basePath="/apartamentos"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
