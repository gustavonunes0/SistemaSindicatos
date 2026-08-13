import { Link } from 'react-router-dom';
import { useMarca } from '../lib/marca';
import { useSeo } from '../lib/seo';

/** Prerrogativas do art. 9º do Estatuto, escritas do ponto de vista do sindicalizado. */
const garantias = [
  {
    titulo: 'Assistência jurídica',
    texto:
      'Defesa em processo disciplinar e criminal decorrente do exercício do cargo, sem prazo de carência, por escritório contratado pelo sindicato.',
  },
  {
    titulo: 'Representação da categoria',
    texto:
      'Acompanhamento das pautas da PRF junto à administração, ao Legislativo e à Justiça, com atuação como substituto processual da categoria.',
  },
  {
    titulo: 'Convênios',
    texto:
      'Rede de parceiros com desconto para o sindicalizado e seus dependentes. A declaração de filiação é emitida na hora, na área do sindicalizado.',
    link: { to: '/convenios', rotulo: 'Ver convênios' },
  },
  {
    titulo: 'Espaços de lazer',
    texto:
      'Uso dos apartamentos e das demais instalações do sindicato, com reserva pelo canal oficial e regulamento próprio.',
  },
  {
    titulo: 'Auxílios',
    texto:
      'Auxílio natalidade, auxílio funeral e uso de jazigo, disponíveis após três meses de filiação.',
  },
  {
    titulo: 'Voz nas decisões',
    texto:
      'Direito de votar e ser votado nas assembleias e nas eleições da entidade, com voto secreto e apuração auditável.',
  },
] as const;

export function SobrePage() {
  const marca = useMarca();

  useSeo({
    title: `Sobre — ${marca.nome}`,
    description: `Missão, estatuto, diretoria e o que a filiação garante ao Policial Rodoviário Federal no Ceará — ${marca.nomeCompleto}.`,
  });

  return (
    <main className="sobre-page">
      <section className="sobre-hero" aria-labelledby="sobre-titulo">
        <div className="sobre-hero-inner">
          <p className="eyebrow sobre-hero-eyebrow">Quem somos</p>
          <h1 id="sobre-titulo">Sobre o sindicato</h1>
          <span className="sobre-faixa" aria-hidden="true" />
          <p className="sobre-hero-texto">
            Fundado em 24 de março de 1992, o {marca.nome} representa os Policiais Rodoviários
            Federais no Ceará — em atividade, inativos e pensionistas — na defesa de seus direitos,
            das condições de trabalho e da valorização da carreira.
          </p>

          <dl className="sobre-hero-meta">
            <div>
              <dt>Fundação</dt>
              <dd>1992</dd>
            </div>
            <div>
              <dt>Base territorial</dt>
              <dd>Ceará</dd>
            </div>
            <div>
              <dt>Filiado à</dt>
              <dd>FENAPRF</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="sobre-corpo secao-inner">
        <section className="sobre-missao" aria-labelledby="missao-titulo">
          <p className="eyebrow">Propósito</p>
          <h2 id="missao-titulo">Missão</h2>
          <blockquote className="sobre-missao-texto">
            Representar seus associados perante as autoridades e instituições administrativas,
            legislativas e judiciárias, na defesa de seus direitos e interesses coletivos e
            individuais, podendo, inclusive, atuar como substituto processual dos seus filiados
            ativos, inativos e beneficiários de pensão.
          </blockquote>
          <p className="sobre-missao-fonte">
            <cite>Estatuto do {marca.nome}, art. 4º</cite>
          </p>
        </section>

        <section className="sobre-ofertas" aria-labelledby="ofertas-titulo">
          <header className="sobre-secao-cabecalho">
            <h2 id="ofertas-titulo">O que a filiação garante</h2>
            <p>
              Prerrogativas asseguradas pelo Estatuto ao sindicalizado em pleno gozo de seus
              direitos.
            </p>
          </header>

          <ul className="sobre-ofertas-lista">
            {garantias.map((item) => (
              <li key={item.titulo}>
                <strong>{item.titulo}</strong>
                <p>{item.texto}</p>
                {'link' in item ? (
                  <Link to={item.link.to} className="sobre-oferta-link">
                    {item.link.rotulo}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {marca.estatutoUrl ? (
          <aside className="sobre-documento" aria-labelledby="estatuto-titulo">
            <div className="sobre-documento-texto">
              <p className="eyebrow">Normas</p>
              <h2 id="estatuto-titulo">Estatuto</h2>
              <p>
                Texto consolidado em setembro de 2025, aprovado em Assembleia Geral. Reúne as regras
                de filiação e desfiliação, contribuição, assistência jurídica, processo eleitoral e
                composição dos órgãos de direção.
              </p>
            </div>
            <a
              href={marca.estatutoUrl}
              download="estatuto-sindprf-ce.pdf"
              className="botao-primario"
            >
              Baixar estatuto (PDF)
            </a>
          </aside>
        ) : null}

        <section className="sobre-institucional" aria-label="Institucional">
          <div className="sobre-painel">
            <p className="eyebrow">Gestão</p>
            <h2>Diretoria</h2>
            <p>
              Diretoria executiva, conselho fiscal e conselho de representantes junto à FENAPRF
              {marca.diretoria ? ` eleitos para o mandato ${marca.diretoria.mandato}` : ''}, com o
              histórico das gestões anteriores.
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
              Sede própria, com atendimento de segunda a sexta, das 8h às 17h.
              <br />
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
