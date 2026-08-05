import type { TenantBranding } from '@sindprf/types';
import { tenantBrandingSchema } from '@sindprf/types';
import { useTenantStore } from '../features/tenant/store';

/** Fallback local (dev / branding ausente). */
export const marcaFallback: TenantBranding = {
  nome: 'SINDPRF-CE',
  nomeCompleto: 'Sindicato dos Policiais Rodoviários Federais no Estado do Ceará',
  logoUrl: '/logo-sindicato.png',
  sede: {
    endereco: 'Rua Margarida de Queiroz, 07 — Cajazeiras — Fortaleza/CE',
    cep: '60.864-300',
  },
  contato: {
    telefones: ['(85) 3279-2848', '(85) 3279-5698', '(85) 3279-7852'],
    email: 'sindprfce@sindprfce.com.br',
  },
  reservaApartamentosUrl: 'https://abre.ai/sindprfcereserva',
  regulamentoApartamentosUrl: '/imoveis/regulamento-apartamentos.pdf',
  themeColor: '#0b3d6b',
  diretoria: {
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
        membros: [{ nome: 'Jairmerson Moreira' }, { nome: 'Lorena Morel' }],
      },
    ],
  },
  filiacao: {
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
  },
};

/** @deprecated Use useMarca() — mantido para imports legados. */
export const marca = marcaFallback;

export function telefonePrincipalTel(branding: TenantBranding = marcaFallback): string {
  const tel = branding.contato.telefones[0];
  if (!tel) return '';
  return `+55${tel.replace(/\D/g, '')}`;
}

export function useMarca(): TenantBranding {
  const branding = useTenantStore((s) => s.tenant?.branding);
  const parsed = tenantBrandingSchema.safeParse(branding);
  return parsed.success ? parsed.data : marcaFallback;
}

export function resolverMarca(): TenantBranding {
  const branding = useTenantStore.getState().tenant?.branding;
  const parsed = tenantBrandingSchema.safeParse(branding);
  return parsed.success ? parsed.data : marcaFallback;
}

/** Aplica título e theme-color do tenant no documento. */
export function aplicarBrandingNoDocumento(branding: TenantBranding): void {
  document.title = branding.nome;
  const theme = branding.themeColor ?? '#0b3d6b';
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme);
}
