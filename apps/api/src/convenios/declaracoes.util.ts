import { BadRequestException } from '@nestjs/common';
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

/**
 * Origem pública usada no QR Code de validação.
 *
 * Um domínio local nunca abre no celular de quem escaneia o papel, então ele só
 * entra como último recurso — em desenvolvimento, onde é o único cadastrado.
 */
export function resolverBaseValidacao(dominios: { host: string }[]): string {
  const ehLocal = (host: string) =>
    host === 'localhost' || host.startsWith('127.') || host.endsWith('.local');

  const publico = dominios.find((d) => !ehLocal(d.host.toLowerCase()));
  const escolhido = publico ?? dominios[0];

  let base: string | null = null;
  if (escolhido?.host) {
    const host = escolhido.host.toLowerCase();
    base = `${ehLocal(host) ? 'http' : 'https'}://${host}`;
  } else if (process.env.WEB_URL?.trim()) {
    base = process.env.WEB_URL.trim().replace(/\/+$/, '');
  }

  if (!base) {
    throw new BadRequestException(
      'Não há domínio do sindicato cadastrado para gerar o QR Code de validação',
    );
  }

  return base;
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
