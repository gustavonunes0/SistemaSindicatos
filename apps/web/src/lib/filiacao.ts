/** Formulários e checklist de filiação do SINDPRF-CE (arquivos em /public/filiacao). */
export const filiacao = {
  sede: {
    endereco: 'Rua Margarida de Queiroz, 07 — Cajazeiras — Fortaleza/CE',
    cep: '60.864-300',
  },
  contato: {
    telefones: ['(85) 3279-2848', '(85) 3279-5698', '(85) 3279-7852'],
    email: 'sindprfce@sindprfce.com.br',
  },
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
