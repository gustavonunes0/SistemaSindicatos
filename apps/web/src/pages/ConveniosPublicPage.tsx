import type { ConvenioListagem } from '@sindprf/types';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { EstadoCarregando } from '../components/ui/EstadoCarregando';
import {
  CATEGORIAS_CONVENIO,
  linkDaCategoria,
  normalizarCategoriaConvenio,
  type CategoriaConvenio,
} from '../features/convenios/categorias';
import { IlustracaoCategoria, META_CATEGORIA } from '../features/convenios/categorias-ui';
import { prefetchConvenio, useConvenios } from '../features/convenios/hooks';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';
import { urlDaApi } from '../lib/urls';

function resumoCurto(texto: string, max = 100): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  return `${limpo.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export function ConveniosPublicPage() {
  const marca = useMarca();
  const queryClient = useQueryClient();
  const { data: convenios, isLoading, isError } = useConvenios({});
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaConvenio | null>(null);

  useEffect(() => {
    void import('../features/convenios/components/ConvenioPublicoDetalhePage');
  }, []);

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

  const totalParceiros = convenios?.length ?? 0;
  const listaAtiva = categoriaAtiva ? porCategoria[categoriaAtiva] : [];
  const linkAtivo = categoriaAtiva ? linkDaCategoria(marca, categoriaAtiva) : null;

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

        {totalParceiros > 0 && (
          <>
            <section className="convenios-public-areas" aria-labelledby="convenios-areas-titulo">
              <header className="convenios-public-secao-cabecalho">
                <h2 id="convenios-areas-titulo">Áreas</h2>
                <p>Toque em uma categoria para listar os parceiros</p>
              </header>

              <ul className="convenios-public-areas-grade">
                {CATEGORIAS_CONVENIO.map((categoria) => {
                  const qtd = porCategoria[categoria].length;
                  const selecionada = categoriaAtiva === categoria;
                  const meta = META_CATEGORIA[categoria];
                  return (
                    <li key={categoria}>
                      <button
                        type="button"
                        className={`convenios-public-area tom-${meta.tom}${selecionada ? ' is-ativa' : ''}${qtd === 0 ? ' is-vazia' : ''}`}
                        aria-pressed={selecionada}
                        disabled={qtd === 0}
                        onClick={() => setCategoriaAtiva(categoria)}
                      >
                        <span className="convenios-public-area-ilustracao">
                          <IlustracaoCategoria categoria={categoria} />
                        </span>
                        <strong>{categoria}</strong>
                        <span className="convenios-public-area-meta">
                          {qtd === 0
                            ? 'Em breve'
                            : `${qtd} ${qtd === 1 ? 'parceiro' : 'parceiros'}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              className="convenios-public-parceiros"
              aria-labelledby="convenios-parceiros-titulo"
            >
              {!categoriaAtiva ? (
                <div className="convenios-public-parceiros-vazio">
                  <p>Selecione uma área acima para ver os convênios disponíveis.</p>
                </div>
              ) : (
                <>
                  <header className="convenios-public-secao-cabecalho">
                    <p className="convenios-public-parceiros-eyebrow">Parceiros</p>
                    <h2 id="convenios-parceiros-titulo">{categoriaAtiva}</h2>
                    <p>{META_CATEGORIA[categoriaAtiva].subtitulo}</p>
                  </header>

                  <ul className="convenios-public-grade">
                    {listaAtiva.map((convenio) => (
                      <li key={convenio.id}>
                        <Link
                          to={`/convenios/${convenio.id}`}
                          className="convenios-public-card"
                          onPointerEnter={() => {
                            void prefetchConvenio(queryClient, convenio.id);
                          }}
                          onFocus={() => {
                            void prefetchConvenio(queryClient, convenio.id);
                          }}
                        >
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
                              <p>Condições, contatos e detalhes do benefício.</p>
                            )}
                          </div>
                          <span className="convenios-public-card-seta" aria-hidden="true">
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {linkAtivo && (
                    <a
                      className="convenios-public-link-categoria"
                      href={linkAtivo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver portfólio completo de {categoriaAtiva}
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </>
              )}
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
