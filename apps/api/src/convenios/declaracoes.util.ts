import type { DeclaracaoEmitida, ModeloDeclaracao, StatusDeclaracao } from '@prisma/client';

/**
 * Lê a rubrica dentro do branding do tenant.
 *
 * O branding é uma coluna Json livre, então o acesso é defensivo: um sindicato
 * que nunca cadastrou assinatura simplesmente cai no PNG do disco.
 */
export function lerAssinaturaDoBranding(branding: unknown): string | null {
  if (!branding || typeof branding !== 'object' || Array.isArray(branding)) {
    return null;
  }
  const valor = (branding as Record<string, unknown>).assinaturaUrl;
  return typeof valor === 'string' && valor.trim() ? valor : null;
}

type RegistroComRelacoes = DeclaracaoEmitida & {
  convenio: { nome: string };
  afiliado: { matricula: string } | null;
  assinadaPor: { email: string } | null;
};

/**
 * Formato das telas de fila e histórico.
 *
 * Os caminhos dos arquivos não saem daqui: o navegador recebe apenas um "tem
 * ou não tem", e o download passa por rota autenticada que confere quem pede.
 */
export function serializarDeclaracao(registro: RegistroComRelacoes) {
  return {
    id: registro.id,
    codigo: registro.codigo,
    modelo: registro.modelo as ModeloDeclaracao,
    destino: registro.destino,
    convenioNome: registro.convenio.nome,
    afiliadoNome: registro.afiliadoNome,
    afiliadoMatricula: registro.afiliado?.matricula ?? null,
    dependenteNome: registro.dependenteNome,
    periodoInicio: registro.periodoInicio,
    periodoFim: registro.periodoFim,
    emitidaEm: registro.emitidaEm,
    status: registro.status as StatusDeclaracao,
    temArquivoOriginal: Boolean(registro.arquivoUrl),
    temArquivoAssinado: Boolean(registro.arquivoAssinadoUrl),
    assinadaEm: registro.assinadaEm,
    assinadaPorEmail: registro.assinadaPor?.email ?? null,
  };
}

/** Nome amigável do PDF baixado, derivado do convênio e do código. */
export function nomeArquivoDeclaracao(convenioNome: string, codigo: string): string {
  const slug = convenioNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `declaracao-${slug || 'convenio'}-${codigo}.pdf`;
}
