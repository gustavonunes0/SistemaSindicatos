import { marca } from './marca';

/** Formulários e checklist de filiação do SINDPRF-CE (arquivos em /public/filiacao). */
export const filiacao = {
  sede: marca.sede,
  contato: marca.contato,
  formularios: [
    {
      rotulo: 'Solicitação de averbação do PRF',
      url: '/filiacao/solicitacao-averbacao-prf.pdf',
    },
    {
      rotulo: 'Cadastro de filiação (proposta do PRF)',
      url: '/filiacao/cadastro-filiacao-prf.pdf',
    },
    {
      rotulo: 'Solicitação de averbação da pensionista',
      url: '/filiacao/solicitacao-averbacao-pensionista.pdf',
    },
    {
      rotulo: 'Cadastro de filiação (proposta da pensionista)',
      url: '/filiacao/cadastro-filiacao-pensionista.pdf',
    },
  ],
  documentos: [
    'Cópia da carteira funcional ou RG e CPF',
    'Cópia do comprovante de endereço',
    'Cópia do último contracheque',
    'Uma foto 3×4',
  ],
} as const;
