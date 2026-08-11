import type { ConvenioListagem } from '@sindprf/types';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EstadoCarregando } from '../components/ui/EstadoCarregando';
import { useConvenios } from '../features/convenios/hooks';
import { urlDaApi } from '../lib/urls';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

function slugCategoria(categoria: string): string {
  return categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function agruparPorCategoria(
  convenios: ConvenioListagem[],
): { categoria: string; itens: ConvenioListagem[] }[] {
  const mapa = new Map<string, ConvenioListagem[]>();
  for (const convenio of convenios) {
    const lista = mapa.get(convenio.categoria) ?? [];
    lista.push(convenio);
    mapa.set(convenio.categoria, lista);
  }

  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([categoria, itens]) => ({
      categoria,
      itens: [...itens].sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')),
    }));
}

function iconeDeCategoria(categoria: string): ReactNode {
  const chave = slugCategoria(categoria);

  if (/saude|odonto|medico|hospital|clinica/.test(chave)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
    );
  }

  if (/educacao|ensino|escola|universidade|curso/.test(chave)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"
        />
      </svg>
    );
  }

  if (/lazer|hotel|turismo|hospedagem|esporte|cultura/.test(chave)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
      </svg>
    );
  }

  if (/financ|seguro|banco|credito/.test(chave)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
        />
      </svg>
    );
  }

  if (/jurid|advoc|direito/.test(chave)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 1 3 5v2h18V5L12 1zm0 2.18L17.6 5H6.4L12 3.18zM5 9v2h2v8H5v2h14v-2h-2v-8h2V9H5zm4 2h2v8H9v-8zm4 0h2v8h-2v-8z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.3l6-2.25 6 2.25v4.79z"
      />
    </svg>
  );
}

export function ConveniosPublicPage() {
  const marca = useMarca();
  const { data: convenios, isLoading, isError } = useConvenios({});
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  useSeo({
    title: `Convênios — ${marca.nome}`,
    description: `Parceiros e benefícios do ${marca.nomeCompleto}, organizados por categoria.`,
  });

  const grupos = useMemo(
    () => (convenios ? agruparPorCategoria(convenios) : []),
    [convenios],
  );

  const grupoAberto = grupos.find((grupo) => grupo.categoria === categoriaAberta);

  const alternarCategoria = (categoria: string) => {
    setCategoriaAberta((atual) => (atual === categoria ? null : categoria));
  };

  return (
    <main className="convenios-public-page">
      <section className="convenios-public-hero" aria-labelledby="convenios-titulo">
        <div className="convenios-public-hero-inner">
          <p className="eyebrow convenios-public-hero-eyebrow">Benefícios</p>
          <h1 id="convenios-titulo">Convênios</h1>
          <span className="convenios-public-faixa" aria-hidden="true" />
          <p className="convenios-public-hero-texto">
            Escolha uma categoria para conhecer os parceiros do {marca.nome}. Associados aprovados
            emitem declarações na área do afiliado.
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

        {grupos.length > 0 && (
          <>
            <p className="convenios-public-instrucao">Toque em uma categoria para ver os parceiros.</p>

            <div className="convenios-public-categorias" role="tablist" aria-label="Categorias de convênios">
              {grupos.map((grupo) => {
                const id = `cat-${slugCategoria(grupo.categoria)}`;
                const aberta = categoriaAberta === grupo.categoria;
                const icone = iconeDeCategoria(grupo.categoria);

                return (
                  <button
                    key={grupo.categoria}
                    type="button"
                    role="tab"
                    id={id}
                    className={`convenios-public-categoria${aberta ? ' is-ativa' : ''}`}
                    aria-selected={aberta}
                    aria-controls={`painel-${id}`}
                    onClick={() => alternarCategoria(grupo.categoria)}
                  >
                    <span className="convenios-public-categoria-icone">{icone}</span>
                    <span className="convenios-public-categoria-texto">
                      <strong>{grupo.categoria}</strong>
                      <span>
                        {grupo.itens.length}{' '}
                        {grupo.itens.length === 1 ? 'parceiro' : 'parceiros'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {grupoAberto ? (
              <section
                className="convenios-public-painel"
                id={`painel-cat-${slugCategoria(grupoAberto.categoria)}`}
                role="tabpanel"
                aria-labelledby={`cat-${slugCategoria(grupoAberto.categoria)}`}
              >
                <header className="convenios-public-painel-cabecalho">
                  <div className="convenios-public-painel-titulo">
                    <span className="convenios-public-categoria-icone" aria-hidden="true">
                      {iconeDeCategoria(grupoAberto.categoria)}
                    </span>
                    <div>
                      <h2>{grupoAberto.categoria}</h2>
                      <p>
                        {grupoAberto.itens.length}{' '}
                        {grupoAberto.itens.length === 1 ? 'parceiro disponível' : 'parceiros disponíveis'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="botao-link"
                    onClick={() => setCategoriaAberta(null)}
                  >
                    Fechar
                  </button>
                </header>

                <ul className="convenios-public-lista">
                  {grupoAberto.itens.map((convenio) => (
                    <li key={convenio.id} className="convenios-public-item">
                      <div className="convenios-public-logo" aria-hidden={!convenio.logoUrl}>
                        {convenio.logoUrl ? (
                          <img src={urlDaApi(convenio.logoUrl)} alt="" loading="lazy" />
                        ) : (
                          <span>{convenio.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="convenios-public-item-corpo">
                        <h3>{convenio.nome}</h3>
                        <p>{convenio.descricao}</p>
                        <div className="convenios-public-item-meta">
                          {convenio.contato ? <span>{convenio.contato}</span> : null}
                          {convenio.link ? (
                            <a href={convenio.link} target="_blank" rel="noreferrer">
                              Site do parceiro
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="convenios-public-vazio-selecao" role="status">
                Nenhuma categoria selecionada ainda.
              </p>
            )}

            <aside className="convenios-public-rodape">
              <p>
                Para emitir declaração de filiação junto aos parceiros, acesse a área do afiliado.
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
