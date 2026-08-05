import { Link } from 'react-router-dom';
import type { BlocoDiretoria, MembroDiretoria } from '@sindprf/types';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

const CARGOS_DESTAQUE = new Set(['Presidente', 'Vice-presidente']);

function separarExecutiva(bloco: BlocoDiretoria): {
  destaques: MembroDiretoria[];
  demais: MembroDiretoria[];
} {
  const destaques = bloco.membros.filter((m) => m.cargo && CARGOS_DESTAQUE.has(m.cargo));
  const demais = bloco.membros.filter((m) => !m.cargo || !CARGOS_DESTAQUE.has(m.cargo));
  return { destaques, demais };
}

export function DiretoriaPage() {
  const marca = useMarca();
  const diretoria = marca.diretoria;

  useSeo({
    title: `Diretoria — ${marca.nome}`,
    description: diretoria
      ? `Diretoria do ${marca.nomeCompleto} — mandato ${diretoria.mandato} (${diretoria.chapa}).`
      : `Diretoria do ${marca.nomeCompleto}.`,
  });

  if (!diretoria) {
    return (
      <main className="diretoria-page">
        <section className="diretoria-hero" aria-labelledby="diretoria-titulo">
          <div className="diretoria-hero-inner">
            <h1 id="diretoria-titulo">Diretoria</h1>
            <p className="diretoria-hero-texto">Composição da diretoria ainda não publicada.</p>
          </div>
        </section>
      </main>
    );
  }

  const executiva = diretoria.blocos[0];
  const conselhos = diretoria.blocos.slice(1);
  if (!executiva) {
    return null;
  }
  const { destaques, demais } = separarExecutiva(executiva);

  return (
    <main className="diretoria-page">
      <section className="diretoria-hero" aria-labelledby="diretoria-titulo">
        <div className="diretoria-hero-inner">
          <p className="eyebrow diretoria-hero-eyebrow">Institucional</p>
          <h1 id="diretoria-titulo">Diretoria</h1>
          <p className="diretoria-hero-texto">
            Composição oficial do {marca.nome} no mandato atual — diretoria executiva, conselho
            fiscal e representantes junto à FENAPRF.
          </p>

          <dl className="diretoria-hero-meta">
            <div>
              <dt>Chapa</dt>
              <dd>{diretoria.chapa}</dd>
            </div>
            <div>
              <dt>Mandato</dt>
              <dd>{diretoria.mandato}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="diretoria-corpo secao-inner">
        <section className="diretoria-secao" aria-labelledby="executiva-titulo">
          <header className="diretoria-secao-cabecalho">
            <h2 id="executiva-titulo">{executiva.titulo}</h2>
            <p>Quem conduz a gestão do sindicato no dia a dia.</p>
          </header>

          <ul className="diretoria-destaques">
            {destaques.map((membro) => (
              <li key={membro.nome} className="diretoria-destaque">
                <span className="diretoria-destaque-cargo">{membro.cargo}</span>
                <span className="diretoria-destaque-nome">{membro.nome}</span>
              </li>
            ))}
          </ul>

          <ul className="diretoria-lista">
            {demais.map((membro) => (
              <li key={`${membro.cargo}-${membro.nome}`}>
                <span className="diretoria-cargo">{membro.cargo}</span>
                <span className="diretoria-nome">{membro.nome}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="diretoria-conselhos">
          {conselhos.map((bloco, indice) => (
            <section
              key={bloco.titulo}
              className="diretoria-conselho"
              aria-labelledby={`diretoria-bloco-${indice}`}
            >
              <h2 id={`diretoria-bloco-${indice}`}>{bloco.titulo}</h2>
              <ul className="diretoria-nomes">
                {bloco.membros.map((membro) => (
                  <li key={membro.nome}>{membro.nome}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="diretoria-rodape" aria-label="Documentos e links">
          <div className="diretoria-rodape-texto">
            <p className="diretoria-rodape-titulo">Histórico das diretorias</p>
            <p>Consulte as composições anteriores do {marca.nome} em PDF.</p>
          </div>
          <div className="diretoria-rodape-acoes">
            <a href={diretoria.historicoUrl} download className="botao-primario">
              Baixar histórico
            </a>
            <Link to="/sobre" className="botao-secundario">
              Sobre o sindicato
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
