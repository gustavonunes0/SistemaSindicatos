export const marca = {
  nome: 'SINDPRF-CE',
  nomeCompleto:
    'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
  logo: '/logo-sindicato.png',
  sede: {
    endereco: 'Rua Margarida de Queiroz, 07 — Cajazeiras — Fortaleza/CE',
    cep: '60.864-300',
  },
  contato: {
    telefones: ['(85) 3279-2848', '(85) 3279-5698', '(85) 3279-7852'],
    email: 'sindprfce@sindprfce.com.br',
  },
  /** Reserva de apartamentos (sistema externo). */
  reservaApartamentosUrl: 'https://abre.ai/sindprfcereserva',
  regulamentoApartamentosUrl: '/imoveis/regulamento-apartamentos.pdf',
} as const;

/** Telefone principal para links `tel:`. */
export function telefonePrincipalTel(): string {
  return `+55${marca.contato.telefones[0].replace(/\D/g, '')}`;
}
