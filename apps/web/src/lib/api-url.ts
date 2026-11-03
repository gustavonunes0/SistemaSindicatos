/**
 * URL pública da API.
 *
 * Em HTTPS, nunca usa endpoint HTTP (Mixed Content bloqueia o browser).
 * Builds antigos com `http://IP:3002` caem no host HTTPS da API Stellar.
 */
export function resolverApiUrl(): string {
  const configurada = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    'http://localhost:3000';
  const limpa = configurada.replace(/\/+$/, '');

  if (typeof window === 'undefined') {
    return limpa;
  }

  if (window.location.protocol !== 'https:' || !limpa.startsWith('http://')) {
    return limpa;
  }

  const host = window.location.hostname.toLowerCase();
  if (host === 'sindigest.stellarsolucoes.com.br' || host.endsWith('.stellarsolucoes.com.br')) {
    return 'https://apisindigest.stellarsolucoes.com.br';
  }

  try {
    const url = new URL(limpa);
    url.protocol = 'https:';
    if (url.port === '3000' || url.port === '3002' || url.port === '8081') {
      url.port = '';
    }
    return url.origin;
  } catch {
    return limpa;
  }
}
