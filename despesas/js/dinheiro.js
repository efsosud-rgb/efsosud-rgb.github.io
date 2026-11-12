/**
 * Dinheiro sempre em centavos inteiros (R$ 12,34 = 1234), para não haver erro de arredondamento.
 */

export const MAXIMO_DIGITOS = 11; // até R$ 999.999.999,99

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** @param {number} centavos  ex.: 123456 → "R$ 1.234,56" */
export function formatarReais(centavos) {
  return formatoReais.format(centavos / 100);
}

/** @param {number} centavos  ex.: 123456 → "1.234,56" */
export function formatarNumero(centavos) {
  return formatoNumero.format(centavos / 100);
}

/**
 * Saldo com o sinal de menos tipográfico quando negativo.
 * @param {number} centavos
 */
export function formatarSaldo(centavos) {
  return centavos < 0 ? `−${formatarReais(-centavos)}` : formatarReais(centavos);
}

/**
 * Valor com sinal de entrada (+) ou saída (−).
 * @param {number} centavos
 * @param {'entra' | 'sai'} sentido
 */
export function formatarComSinal(centavos, sentido) {
  return `${sentido === 'sai' ? '−' : '+'} ${formatarReais(Math.abs(centavos))}`;
}

/**
 * Campo de valor no estilo dos apps de banco: os dígitos entram pela direita.
 * "1" → 1 centavo; "1234" → R$ 12,34. Ignora tudo que não for dígito.
 * @param {unknown} texto
 */
export function centavosDoTexto(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, MAXIMO_DIGITOS);
  return digitos ? Number(digitos) : 0;
}

/** @param {number} centavos  texto mostrado no campo; vazio quando zero, para aparecer a dica */
export function textoDoCampo(centavos) {
  return centavos > 0 ? formatarNumero(centavos) : '';
}

/** @param {unknown} n */
export function centavosValidos(n) {
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n < 10 ** MAXIMO_DIGITOS;
}
