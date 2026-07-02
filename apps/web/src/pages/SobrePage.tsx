import { useSeo } from '../lib/seo';

export function SobrePage() {
  useSeo({
    title: 'Sobre — Sindicato PRF',
    description: 'História, missão e diretoria do Sindicato dos Policiais Rodoviários Federais.',
  });

  return (
    <main className="secao">
      <div className="secao-inner conteudo-texto">
        <h1>Sobre o sindicato</h1>
        <p>
          O Sindicato PRF representa os Policiais Rodoviários Federais na defesa de seus direitos,
          condições de trabalho e valorização profissional.
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
      </div>
    </main>
  );
}
