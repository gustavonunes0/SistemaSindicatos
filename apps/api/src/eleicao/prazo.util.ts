// Art. 38 §18º/§19º do Estatuto: prazos recursais de dias úteis, prorrogados
// para o próximo dia útil quando caírem em dia não útil. Não considera
// feriados (só fins de semana) — simplificação assumida na ausência de
// calendário de feriados integrado ao sistema.
export function adicionarDiasUteis(data: Date, dias: number): Date {
  const resultado = new Date(data);
  let restantes = dias;
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      restantes -= 1;
    }
  }
  return resultado;
}
