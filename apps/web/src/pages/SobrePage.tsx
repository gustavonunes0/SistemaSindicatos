import { Link } from 'react-router-dom';
import { marca } from '../lib/marca';
import { useSeo } from '../lib/seo';

export function SobrePage() {
  useSeo({
    title: `Sobre — ${marca.nome}`,
    description: `História, missão e diretoria do ${marca.nomeCompleto}.`,
  });

  return (
    <main className="secao">
      <div className="secao-inner conteudo-texto">
        <span className="eyebrow">Quem somos</span>
        <h1>Sobre o sindicato</h1>
        <p>
          O {marca.nome} representa os Policiais Rodoviários Federais no Ceará na defesa de seus
          direitos, condições de trabalho e valorização profissional.
        </p>
        <h2>Missão</h2>
        <p>
          Defender os interesses da categoria com transparência e compromisso, oferecendo suporte
          jurídico, benefícios e espaços de participação democrática.
        </p>
        <h2>O que oferecemos</h2>
        <ul>
          <li>Representação sindical e acompanhamento de pautas da categoria</li>
          <li>Rede de convênios com descontos exclusivos para afiliados</li>
          <li>Imóveis para lazer disponíveis para aluguel</li>
          <li>Eleições sindicais com votação eletrônica segura</li>
        </ul>
        <h2>Diretoria</h2>
        <p>
          Consulte a composição atual da diretoria, conselho fiscal e representantes junto à
          FENAPRF.
        </p>
        <p>
          <Link to="/diretoria" className="botao-secundario">
            Ver diretoria
          </Link>
        </p>
      </div>
    </main>
  );
}
