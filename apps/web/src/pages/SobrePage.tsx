import { Link } from 'react-router-dom';
import { marca } from '../lib/marca';
import { useSeo } from '../lib/seo';

const ofertas = [
  {
    titulo: 'Representação sindical',
    texto: 'Acompanhamento de pautas da categoria e defesa dos direitos dos PRFs no Ceará.',
  },
  {
    titulo: 'Convênios',
    texto: 'Rede de parceiros com descontos e benefícios exclusivos para afiliados.',
  },
  {
    titulo: 'Imóveis para lazer',
    texto: 'Espaços disponíveis para aluguel, com reserva pela área do afiliado.',
  },
  {
    titulo: 'Eleições transparentes',
    texto: 'Processo eleitoral com votação eletrônica segura e apuração auditável.',
  },
] as const;

export function SobrePage() {
  useSeo({
    title: `Sobre — ${marca.nome}`,
    description: `História, missão e diretoria do ${marca.nomeCompleto}.`,
  });

  return (
    <main className="sobre-page">
      <section className="sobre-hero" aria-labelledby="sobre-titulo">
        <div className="sobre-hero-inner">
          <p className="eyebrow sobre-hero-eyebrow">Quem somos</p>
          <h1 id="sobre-titulo">Sobre o sindicato</h1>
          <span className="sobre-faixa" aria-hidden="true" />
          <p className="sobre-hero-texto">
            O {marca.nome} representa os Policiais Rodoviários Federais no Ceará na defesa de seus
            direitos, condições de trabalho e valorização profissional.
          </p>

          <dl className="sobre-hero-meta">
            <div>
              <dt>Desde</dt>
              <dd>1992</dd>
            </div>
            <div>
              <dt>Atuação</dt>
              <dd>Ceará</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>PRF</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="sobre-corpo secao-inner">
        <section className="sobre-missao" aria-labelledby="missao-titulo">
          <p className="eyebrow">Propósito</p>
          <h2 id="missao-titulo">Missão</h2>
          <blockquote className="sobre-missao-texto">
            Defender os interesses da categoria com transparência e compromisso, oferecendo suporte
            jurídico, benefícios e espaços de participação democrática.
          </blockquote>
        </section>

        <section className="sobre-ofertas" aria-labelledby="ofertas-titulo">
          <header className="sobre-secao-cabecalho">
            <h2 id="ofertas-titulo">O que oferecemos</h2>
            <p>Serviços e espaços de participação para a categoria no Ceará.</p>
          </header>

          <ul className="sobre-ofertas-lista">
            {ofertas.map((item) => (
              <li key={item.titulo}>
                <strong>{item.titulo}</strong>
                <p>{item.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="sobre-institucional" aria-label="Institucional">
          <div className="sobre-painel">
            <p className="eyebrow">Gestão</p>
            <h2>Diretoria</h2>
            <p>
              Consulte a composição atual da diretoria executiva, conselho fiscal e representantes
              junto à FENAPRF.
            </p>
            <Link to="/diretoria" className="botao-primario">
              Ver diretoria
            </Link>
          </div>

          <aside className="sobre-sede">
            <p className="eyebrow">Sede</p>
            <h2>{marca.nomeCompleto}</h2>
            <address className="sobre-sede-endereco">
              {marca.sede.endereco}
              <br />
              CEP {marca.sede.cep}
            </address>
            <p className="sobre-sede-contato">
              <a href={`mailto:${marca.contato.email}`}>{marca.contato.email}</a>
            </p>
            <Link to="/contato" className="botao-secundario">
              Fale conosco
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
