import type { ConvenioListagem } from '@sindprf/types';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EstadoCarregando } from '../components/ui/EstadoCarregando';
import {
  CATEGORIAS_CONVENIO,
  normalizarCategoriaConvenio,
  type CategoriaConvenio,
} from '../features/convenios/categorias';
import { useConvenios } from '../features/convenios/hooks';
import { urlDaApi } from '../lib/urls';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

function resumoCurto(texto: string, max = 110): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function iconeDeCategoria(categoria: CategoriaConvenio): ReactNode {
  if (categoria === 'Saúde') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    );
  }

  if (categoria === 'Educação') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"
        />
      </svg>
    );
  }

  if (categoria === 'Esporte e Lazer') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.15 7.15 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 13.98 2h-3.96a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.55-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.67 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.79 14.52a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.39.3.59.22l2.39-.96c.5.39 1.04.7 1.62.94l.36 2.54c.05.24.24.41.47.41h3.96c.24 0 .43-.17.47-.41l.36 2.54c.59-.24 1.13-.55 1.62-.94l2.39.96c.22.08.46 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    </svg>
  );
}

export function ConveniosPublicPage() {
  const marca = useMarca();
  const { data: convenios, isLoading, isError } = useConvenios({});
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaConvenio | null>(null);

  useSeo({
    title: `Convênios — ${marca.nome}`,
    description: `Parceiros e benefícios do ${marca.nomeCompleto} em educação, saúde, lazer e serviços.`,
  });

  const porCategoria = useMemo(() => {
    const mapa = Object.fromEntries(
      CATEGORIAS_CONVENIO.map((cat) => [cat, [] as ConvenioListagem[]]),
    ) as Record<CategoriaConvenio, ConvenioListagem[]>;

    for (const convenio of convenios ?? []) {
      const cat = normalizarCategoriaConvenio(convenio.categoria);
      mapa[cat].push(convenio);
    }

    for (const cat of CATEGORIAS_CONVENIO) {
      mapa[cat].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
    return mapa;
  }, [convenios]);

  const categoriasComParceiros = useMemo(
    () => CATEGORIAS_CONVENIO.filter((cat) => porCategoria[cat].length > 0),
    [porCategoria],
  );

  const ativa =
    categoriaAtiva && porCategoria[categoriaAtiva]?.length > 0
      ? categoriaAtiva
      : (categoriasComParceiros[0] ?? null);

  const listaAtiva = ativa ? porCategoria[ativa] : [];

  return (
    <main className="convenios-public-page">
      <section className="convenios-public-hero" aria-labelledby="convenios-titulo">
        <div className="convenios-public-hero-inner">
          <p className="eyebrow convenios-public-hero-eyebrow">Benefícios</p>
          <h1 id="convenios-titulo">Convênios</h1>
          <span className="convenios-public-faixa" aria-hidden="true" />
          <p className="convenios-public-hero-texto">
            Parcerias do {marca.nome} para associados e dependentes. Escolha a área e abra o
            parceiro para ver condições e contatos.
          </p>
        </div>
      </section>

      <div className="convenios-public-corpo secao-inner">
        {isLoading && <EstadoCarregando mensagem="Carregando convênios…" />}

        {isError && (
          <p className="erro">Não foi possível carregar os convênios. Tente novamente em instantes.</p>
        )}

        {convenios && convenios.length === 0 && (
          <div className="estado-vazio">
            <p>Ainda não há convênios publicados. Volte em breve.</p>
          </div>
        )}

        {categoriasComParceiros.length > 0 && ativa && (
          <>
            <nav className="convenios-public-filtros" aria-label="Áreas de convênios">
              {CATEGORIAS_CONVENIO.map((categoria) => {
                const qtd = porCategoria[categoria].length;
                const selecionada = ativa === categoria;
                return (
                  <button
                    key={categoria}
                    type="button"
                    className={`convenios-public-filtro${selecionada ? ' is-ativa' : ''}`}
                    aria-pressed={selecionada}
                    disabled={qtd === 0}
                    onClick={() => setCategoriaAtiva(categoria)}
                  >
                    <span className="convenios-public-filtro-icone" aria-hidden="true">
                      {iconeDeCategoria(categoria)}
                    </span>
                    <span className="convenios-public-filtro-texto">
                      <strong>{categoria}</strong>
                      <span>
                        {qtd === 0
                          ? 'Em breve'
                          : `${qtd} ${qtd === 1 ? 'parceiro' : 'parceiros'}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <section
              className="convenios-public-resultado"
              aria-labelledby="convenios-resultado-titulo"
            >
              <header className="convenios-public-resultado-cabecalho">
                <h2 id="convenios-resultado-titulo">{ativa}</h2>
                <p>
                  {listaAtiva.length}{' '}
                  {listaAtiva.length === 1 ? 'parceiro nesta área' : 'parceiros nesta área'}
                </p>
              </header>

              <ul className="convenios-public-grade">
                {listaAtiva.map((convenio) => (
                  <li key={convenio.id}>
                    <Link to={`/convenios/${convenio.id}`} className="convenios-public-card">
                      <div className="convenios-public-logo" aria-hidden={!convenio.logoUrl}>
                        {convenio.logoUrl ? (
                          <img src={urlDaApi(convenio.logoUrl)} alt="" loading="lazy" />
                        ) : (
                          <span>{convenio.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="convenios-public-card-corpo">
                        <h3>{convenio.nome}</h3>
                        {convenio.descricao ? (
                          <p>{resumoCurto(convenio.descricao)}</p>
                        ) : (
                          <p>Toque para ver condições e contatos.</p>
                        )}
                        <span className="convenios-public-card-cta">Ver detalhes</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="convenios-public-rodape">
              <p>
                Associados aprovados emitem declarações na área do afiliado, quando o parceiro
                exigir comprovação de vínculo.
              </p>
              <Link to="/login" className="botao-primario">
                Entrar
              </Link>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}
