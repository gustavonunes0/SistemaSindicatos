import type { Convenio } from '@sindprf/types';
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

function agruparPorCategoria(convenios: Convenio[]): { categoria: string; itens: Convenio[] }[] {
  const mapa = new Map<string, Convenio[]>();
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

export function ConveniosPublicPage() {
  const marca = useMarca();
  const { data: convenios, isLoading, isError } = useConvenios({});

  useSeo({
    title: `Convênios — ${marca.nome}`,
    description: `Parceiros e benefícios do ${marca.nomeCompleto}, organizados por categoria.`,
  });

  const grupos = convenios ? agruparPorCategoria(convenios) : [];

  return (
    <main className="convenios-public-page">
      <section className="convenios-public-hero" aria-labelledby="convenios-titulo">
        <div className="convenios-public-hero-inner">
          <p className="eyebrow convenios-public-hero-eyebrow">Benefícios</p>
          <h1 id="convenios-titulo">Convênios</h1>
          <span className="convenios-public-faixa" aria-hidden="true" />
          <p className="convenios-public-hero-texto">
            Rede de parceiros do {marca.nome}. Associados aprovados podem emitir declarações na
            área do afiliado.
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

        {grupos.map((grupo) => {
          const id = `cat-${slugCategoria(grupo.categoria)}`;
          return (
          <section
            key={grupo.categoria}
            className="convenios-public-grupo"
            aria-labelledby={id}
          >
            <header className="convenios-public-grupo-cabecalho">
              <h2 id={id}>{grupo.categoria}</h2>
              <p>
                {grupo.itens.length}{' '}
                {grupo.itens.length === 1 ? 'parceiro' : 'parceiros'}
              </p>
            </header>

            <ul className="convenios-public-lista">
              {grupo.itens.map((convenio) => (
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
          );
        })}

        {grupos.length > 0 ? (
          <aside className="convenios-public-rodape">
            <p>
              Para emitir declaração de filiação junto aos parceiros, acesse a área do afiliado.
            </p>
            <Link to="/login" className="botao-primario">
              Entrar
            </Link>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
