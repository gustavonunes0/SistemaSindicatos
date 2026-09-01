export type ConsultaJuridica = {
  id: string;
  tribunal: 'TRF5' | 'TRF1';
  titulo: string;
  descricao: string;
  href: string;
};

export type GrupoTribunal = {
  sigla: 'TRF5' | 'TRF1';
  nome: string;
  nota: string;
  consultas: ConsultaJuridica[];
};

/**
 * Portais oficiais de consulta processual. O Ceará está na 5ª Região;
 * o TRF1 entra para processos autuados na 1ª Região (Norte e Centro-Oeste).
 */
export const GRUPOS_CONSULTA_JURIDICA: GrupoTribunal[] = [
  {
    sigla: 'TRF5',
    nome: 'Tribunal Regional Federal da 5ª Região',
    nota: 'Ceará, Alagoas, Paraíba, Pernambuco, Rio Grande do Norte e Sergipe.',
    consultas: [
      {
        id: 'trf5-pje',
        tribunal: 'TRF5',
        titulo: 'Consulta pública no PJe',
        descricao: 'Pesquise o processo por número, nome da parte, CPF, advogado ou classe.',
        href: 'https://pje1g.trf5.jus.br/pjeconsulta/ConsultaPublica/listView.seam',
      },
      {
        id: 'trf5-rpv',
        tribunal: 'TRF5',
        titulo: 'RPV e precatórios',
        descricao: 'Consulte requisições de pequeno valor e precatórios no portal do TRF5.',
        href: 'https://rpvprecatorio.trf5.jus.br/',
      },
    ],
  },
  {
    sigla: 'TRF1',
    nome: 'Tribunal Regional Federal da 1ª Região',
    nota: 'Processos da Justiça Federal da 1ª Região (Norte e Centro-Oeste).',
    consultas: [
      {
        id: 'trf1-pje',
        tribunal: 'TRF1',
        titulo: 'Consulta pública no PJe',
        descricao: 'Pesquise o processo por número, nome da parte, CPF, advogado ou classe.',
        href: 'https://pje1g-consultapublica.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam',
      },
      {
        id: 'trf1-cpf',
        tribunal: 'TRF1',
        titulo: 'Consulta processual por CPF ou CNPJ',
        descricao: 'Busca a parte pelo documento na consulta processual do TRF1.',
        href: 'https://processual.trf1.jus.br/consultaProcessual/cpfCnpjParte.php?secao=TRF1',
      },
    ],
  },
];
