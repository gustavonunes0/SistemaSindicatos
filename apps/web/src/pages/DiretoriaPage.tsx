import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BlocoDiretoria, MembroDiretoria } from '@sindprf/types';
import { HISTORICO_URL, historicoDiretorias } from '../lib/historico-diretorias';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

const CARGOS_DESTAQUE = new Set(['Presidente', 'Vice-presidente', 'Vice-Presidente']);

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
  const [mandatoAberto, setMandatoAberto] = useState<string | null>(null);
  const [historicoExpandido, setHistoricoExpandido] = useState(false);

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
  const historicoUrl = diretoria.historicoUrl || HISTORICO_URL;

  return (
    <main className="diretoria-page">
      <section className="diretoria-hero" aria-labelledby="diretoria-titulo">
        <div className="diretoria-hero-inner">
          <p className="eyebrow diretoria-hero-eyebrow">Institucional</p>
          <h1 id="diretoria-titulo">Diretoria</h1>
          <p className="diretoria-hero-texto">
            Composição oficial do {marca.nome} no mandato em vigor.
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
        <div className="diretoria-atual" aria-label="Diretoria atual">
          <div className="diretoria-atual-selo">
            <span className="diretoria-atual-badge">Mandato atual</span>
            <p className="diretoria-atual-meta">
              <strong>{diretoria.chapa}</strong>
              <span aria-hidden="true"> · </span>
              <span>{diretoria.mandato}</span>
            </p>
          </div>

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
        </div>

        <section className="diretoria-historico" aria-labelledby="historico-titulo">
          <header className="diretoria-historico-cabecalho">
            <div>
              <p className="eyebrow">Arquivo</p>
              <h2 id="historico-titulo">Mandatos anteriores</h2>
              <p>
                Histórico do {marca.nome} (1992–2018). Consulte as composições passadas sem
                confundir com a gestão atual.
              </p>
            </div>
            <button
              type="button"
              className="botao-secundario"
              aria-expanded={historicoExpandido}
              onClick={() => setHistoricoExpandido((v) => !v)}
            >
              {historicoExpandido ? 'Recolher histórico' : 'Ver histórico'}
            </button>
          </header>

          {historicoExpandido ? (
            <ul className="diretoria-historico-lista">
              {historicoDiretorias.map((mandato) => {
                const aberto = mandatoAberto === mandato.periodo;
                const presidente = mandato.membros.find((m) => m.cargo === 'Presidente');
                return (
                  <li key={mandato.periodo} className="diretoria-historico-item">
                    <button
                      type="button"
                      className="diretoria-historico-toggle"
                      aria-expanded={aberto}
                      onClick={() => setMandatoAberto(aberto ? null : mandato.periodo)}
                    >
                      <span className="diretoria-historico-periodo">{mandato.periodo}</span>
                      <span className="diretoria-historico-resumo">
                        {presidente
                          ? `Presidência: ${presidente.nome}`
                          : `${mandato.membros.length} membros`}
                      </span>
                      <span className="diretoria-historico-chevron" aria-hidden="true">
                        {aberto ? '−' : '+'}
                      </span>
                    </button>
                    {aberto ? (
                      <ul className="diretoria-lista diretoria-historico-membros">
                        {mandato.membros.map((membro) => (
                          <li key={`${mandato.periodo}-${membro.cargo}-${membro.nome}`}>
                            <span className="diretoria-cargo">{membro.cargo}</span>
                            <span className="diretoria-nome">{membro.nome}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

        <aside className="diretoria-rodape" aria-label="Documentos e links">
          <div className="diretoria-rodape-texto">
            <p className="diretoria-rodape-titulo">Documentos oficiais</p>
            <p>Baixe o estatuto e o histórico completo das diretorias em PDF.</p>
          </div>
          <div className="diretoria-rodape-acoes">
            {marca.estatutoUrl ? (
              <a
                href={marca.estatutoUrl}
                download="estatuto-sindprf-ce.pdf"
                className="botao-primario"
              >
                Baixar estatuto
              </a>
            ) : null}
            <a href={historicoUrl} download className="botao-secundario">
              Histórico das diretorias
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
