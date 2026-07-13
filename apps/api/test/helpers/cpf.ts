/** Gera um CPF válido (11 dígitos) para testes. */
export function gerarCpfValido(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));

  const digito = (numeros: number[]): number => {
    const peso = numeros.length + 1;
    const soma = numeros.reduce((acc, n, i) => acc + n * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  base.push(digito(base));
  base.push(digito(base));
  return base.join('');
}
