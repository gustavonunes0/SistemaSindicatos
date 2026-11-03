import { resolverApiUrl } from './api-url';

// Converte caminhos relativos da API (ex: /uploads/x.png) em URL absoluta.
export function urlDaApi(caminho: string): string {
  return caminho.startsWith('http') ? caminho : `${resolverApiUrl()}${caminho}`;
}
