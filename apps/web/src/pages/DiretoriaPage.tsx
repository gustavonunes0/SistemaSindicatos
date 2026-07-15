import { Link } from 'react-router-dom';
import { diretoria } from '../lib/diretoria';
import { marca } from '../lib/marca';
import { useSeo } from '../lib/seo';

export function DiretoriaPage() {
  useSeo({
    title: `Diretoria — ${marca.nome}`,
    description: `Diretoria do ${marca.nomeCompleto} — mandato ${diretoria.mandato} (${diretoria.chapa}).`,
  });

  return (
    <main className="secao diretoria-page">
      <div className="secao-inner">
        <header className="diretoria-cabecalho">
          <span className="eyebrow">Institucional</span>
          <h1>Diretoria</h1>
          <p className="diretoria-mandato">
            <em>
              {diretoria.chapa} — {diretoria.mandato}
            </em>
          </p>
          <p>
            Conheça a composição da diretoria do {marca.nome} no mandato atual.
          </p>
        </header>

        <div className="diretoria-blocos">
          {diretoria.blocos.map((bloco) => (
            <section key={bloco.titulo} className="diretoria-bloco">
              <h2>{bloco.titulo}</h2>
              <ul className="diretoria-lista">
                {bloco.membros.map((membro) => (
                  <li
                    key={`${membro.cargo ?? bloco.titulo}-${membro.nome}`}
                    className={membro.cargo ? undefined : 'diretoria-lista-item--nome'}
                  >
                    {membro.cargo && <span className="diretoria-cargo">{membro.cargo}</span>}
                    <span className="diretoria-nome">{membro.nome}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="diretoria-historico">
          <a href={diretoria.historicoUrl} download>
            Histórico das diretorias do {marca.nome}
          </a>
        </p>

        <p className="diretoria-voltar">
          <Link to="/sobre">← Sobre o sindicato</Link>
        </p>
      </div>
    </main>
  );
}
