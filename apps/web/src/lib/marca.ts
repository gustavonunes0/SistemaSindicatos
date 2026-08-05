import type { TenantBranding } from '@sindprf/types';
import { tenantBrandingSchema } from '@sindprf/types';
import { useTenantStore } from '../features/tenant/store';

/** Fallback local (dev / branding ausente) — identidade SINDPRF. */
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

/** Fallback / defaults da plataforma SindiGest (cores e logos Stellar). */
export const marcaPlataformaFallback: TenantBranding = {
  nome: 'SindiGest',
  nomeCompleto: 'SindiGest — plataforma Stellar para sindicatos',
  logoUrl: '/marca/stellar-icon.png',
  logoHeaderUrl: '/marca/stellar-logo.png',
  sede: { endereco: 'Stellar Soluções', cep: '—' },
  contato: {
    telefones: [],
    email: 'contato@stellarsolucoes.com.br',
  },
  themeColor: '#3198A9',
  cores: {
    primaria: '#3198A9',
    primariaEscura: '#1f6f7d',
    destaque: '#7BCCD8',
    fundo: '#f7f9fb',
    superficie: '#ffffff',
    texto: '#1f2937',
    textoSuave: '#5b6b7c',
    borda: '#d0d7de',
  },
};

/** @deprecated Use useMarca() — mantido para imports legados. */
export const marca = marcaFallback;

export function telefonePrincipalTel(branding: TenantBranding = marcaFallback): string {
  const tel = branding.contato.telefones[0];
  if (!tel) return '';
  return `+55${tel.replace(/\D/g, '')}`;
}

function resolverBrandingDoStore(): TenantBranding {
  const tenant = useTenantStore.getState().tenant;
  const parsed = tenantBrandingSchema.safeParse(tenant?.branding);
  if (tenant?.tipo === 'PLATAFORMA') {
    if (!parsed.success) return marcaPlataformaFallback;
    return {
      ...marcaPlataformaFallback,
      ...parsed.data,
      cores: {
        ...marcaPlataformaFallback.cores!,
        ...parsed.data.cores,
        primaria: parsed.data.cores?.primaria ?? marcaPlataformaFallback.cores!.primaria,
      },
      logoUrl: parsed.data.logoUrl.startsWith('/marca/')
        ? parsed.data.logoUrl
        : marcaPlataformaFallback.logoUrl,
      logoHeaderUrl: parsed.data.logoHeaderUrl ?? marcaPlataformaFallback.logoHeaderUrl,
    };
  }
  return parsed.success ? parsed.data : marcaFallback;
}

export function useMarca(): TenantBranding {
  const tipo = useTenantStore((s) => s.tenant?.tipo);
  const branding = useTenantStore((s) => s.tenant?.branding);
  const parsed = tenantBrandingSchema.safeParse(branding);
  if (tipo === 'PLATAFORMA') {
    if (!parsed.success) return marcaPlataformaFallback;
    return {
      ...marcaPlataformaFallback,
      ...parsed.data,
      cores: {
        ...marcaPlataformaFallback.cores!,
        ...parsed.data.cores,
        primaria: parsed.data.cores?.primaria ?? marcaPlataformaFallback.cores!.primaria,
      },
      logoUrl: parsed.data.logoUrl.startsWith('/marca/')
        ? parsed.data.logoUrl
        : marcaPlataformaFallback.logoUrl,
      logoHeaderUrl: parsed.data.logoHeaderUrl ?? marcaPlataformaFallback.logoHeaderUrl,
    };
  }
  return parsed.success ? parsed.data : marcaFallback;
}

export function resolverMarca(): TenantBranding {
  return resolverBrandingDoStore();
}

/** Aplica título, theme-color, favicon e tokens CSS do tenant no documento. */
export function aplicarBrandingNoDocumento(branding: TenantBranding): void {
  document.title = branding.nome;
  const theme = branding.themeColor ?? branding.cores?.primaria ?? '#0b3d6b';
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme);

  let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.href = branding.logoUrl;

  const root = document.documentElement;
  const cores = branding.cores;
  if (!cores) {
    root.style.removeProperty('--azul-placa');
    root.style.removeProperty('--azul-noite');
    root.style.removeProperty('--amarelo-faixa');
    root.style.removeProperty('--concreto');
    root.style.removeProperty('--grafite');
    root.style.removeProperty('--cinza-placa');
    root.style.removeProperty('--cor-borda');
    root.style.removeProperty('--azul-barra-marca');
    return;
  }

  root.style.setProperty('--azul-placa', cores.primaria);
  root.style.setProperty('--azul-noite', cores.primariaEscura ?? cores.primaria);
  root.style.setProperty('--amarelo-faixa', cores.destaque ?? cores.primaria);
  if (cores.fundo) root.style.setProperty('--concreto', cores.fundo);
  if (cores.texto) root.style.setProperty('--grafite', cores.texto);
  if (cores.textoSuave) root.style.setProperty('--cinza-placa', cores.textoSuave);
  if (cores.superficie) root.style.setProperty('--branco-placa', cores.superficie);
  if (cores.borda) root.style.setProperty('--cor-borda', cores.borda);
  root.style.setProperty('--azul-barra-marca', cores.primaria);
}
