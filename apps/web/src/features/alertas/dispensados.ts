const CHAVE = 'sindprf-alertas-dispensados';

/**
 * Guarda em sessionStorage os alertas que a pessoa já fechou: eles somem
 * enquanto ela navega e voltam a aparecer numa próxima visita ao site.
 */
export function lerDispensados(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    const lista: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function dispensar(id: string): string[] {
  const atual = lerDispensados();
  if (atual.includes(id)) {
    return atual;
  }
  const proximo = [...atual, id];
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(proximo));
  } catch {
    // Modo privado ou storage cheio: o alerta reaparece, mas nada quebra.
  }
  return proximo;
}
