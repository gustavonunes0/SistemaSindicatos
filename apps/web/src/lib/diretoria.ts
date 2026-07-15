/** Diretoria vigente — fonte: conteúdo institucional do SINDPRF-CE (mandato 2025/2027). */

export type MembroDiretoria = {
  cargo?: string;
  nome: string;
};

export type BlocoDiretoria = {
  titulo: string;
  membros: MembroDiretoria[];
};

export const diretoria = {
  mandato: '2025/2027',
  chapa: 'Sindicato em Ação',
  historicoUrl: '/diretoria/historico-diretorias.pdf',
  blocos: [
    {
      titulo: 'Diretoria executiva',
      membros: [
        { cargo: 'Presidente', nome: 'Tatiane Vasques' },
        { cargo: 'Vice-presidente', nome: 'Gilberto Conrado' },
        { cargo: 'Diretor secretário', nome: 'Júlio Dutra' },
        { cargo: 'Diretor secretário suplente', nome: 'Marta Sabóia' },
        { cargo: 'Diretor financeiro e de patrimônio', nome: 'Almir Alves' },
        { cargo: 'Diretor financeiro e de patrimônio suplente', nome: 'Nara Regina' },
        { cargo: 'Diretora social', nome: 'Edney Glauce' },
        { cargo: 'Diretora social suplente', nome: 'Telma Gurgel' },
        { cargo: 'Diretor jurídico', nome: 'Fábio Oliveira' },
        { cargo: 'Diretor jurídico suplente', nome: 'Sidney' },
        { cargo: 'Diretor de divulgação', nome: 'Leonardo César' },
        { cargo: 'Diretor de divulgação suplente', nome: 'Adriana Apolônio' },
      ],
    },
    {
      titulo: 'Conselho fiscal',
      membros: [
        { nome: 'Pádua Portela' },
        { nome: 'Rômulo Braga' },
        { nome: 'Jefferson Oliveira' },
      ],
    },
    {
      titulo: 'Suplentes do conselho fiscal',
      membros: [
        { nome: 'Aretusa Sá' },
        { nome: 'Lúcia Benício' },
        { nome: 'Ana Rosângela' },
      ],
    },
    {
      titulo: 'Conselho de representantes junto à FENAPRF',
      membros: [
        { nome: 'Jairmerson Moreira' },
        { nome: 'Lorena Morel' },
      ],
    },
  ] satisfies BlocoDiretoria[],
} as const;
