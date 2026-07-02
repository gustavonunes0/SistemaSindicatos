const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Converte caminhos relativos da API (ex: /uploads/x.png) em URL absoluta.
export function urlDaApi(caminho: string): string {
  return caminho.startsWith('http') ? caminho : `${API_URL}${caminho}`;
}
