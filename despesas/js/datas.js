/**
 * Datas do app: sempre texto no formato AAAA-MM-DD, sem hora e sem fuso.
 * As contas usam UTC por dentro, então horário de verão e fuso não mudam o resultado.
 */

/** @typedef {{ ano: number, mes0: number }} Mes */
/** @typedef {{ ano: number, mes0: number, dia: number }} Partes */

export const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const NOMES_MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const NOMES_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const DIA_MS = 86400000;

/** @param {number} n */
function doisDigitos(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {number} ano
 * @param {number} mes0 mês de 0 (janeiro) a 11 (dezembro)
 * @param {number} dia
 */
export function montarData(ano, mes0, dia) {
  return `${String(ano).padStart(4, '0')}-${doisDigitos(mes0 + 1)}-${doisDigitos(dia)}`;
}

/**
 * @param {number} ano
 * @param {number} mes0
 */
export function diasNoMes(ano, mes0) {
  return new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate();
}

/**
 * Lê uma data AAAA-MM-DD. Devolve null se o texto não for uma data que existe.
 * @param {unknown} texto
 * @returns {Partes | null}
 */
export function lerData(texto) {
  if (typeof texto !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes0 = Number(m[2]) - 1;
  const dia = Number(m[3]);
  if (ano < 1900 || ano > 2200 || mes0 < 0 || mes0 > 11 || dia < 1 || dia > diasNoMes(ano, mes0)) return null;
  return { ano, mes0, dia };
}

/** @param {unknown} texto */
export function dataValida(texto) {
  return lerData(texto) !== null;
}

/**
 * @param {string} texto
 * @returns {Partes}
 */
function exigir(texto) {
  const partes = lerData(texto);
  if (!partes) throw new RangeError(`Data inválida: ${texto}`);
  return partes;
}

/** @param {string} texto */
function paraNumeroDeDias(texto) {
  const d = exigir(texto);
  return Math.round(Date.UTC(d.ano, d.mes0, d.dia) / DIA_MS);
}

/** @param {number} n */
function deNumeroDeDias(n) {
  const d = new Date(n * DIA_MS);
  return montarData(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * @param {string} texto
 * @param {number} dias
 */
export function somarDias(texto, dias) {
  return deNumeroDeDias(paraNumeroDeDias(texto) + dias);
}

/**
 * Quantos dias de `de` até `ate` (positivo se `ate` vem depois).
 * @param {string} de
 * @param {string} ate
 */
export function diasEntre(de, ate) {
  return paraNumeroDeDias(ate) - paraNumeroDeDias(de);
}

/**
 * Soma meses mantendo o dia. Se o mês de destino for mais curto, usa o último dia dele
 * (31/01 + 1 mês = 28/02 ou 29/02).
 * @param {string} texto
 * @param {number} meses
 */
export function somarMeses(texto, meses) {
  const d = exigir(texto);
  const total = d.ano * 12 + d.mes0 + meses;
  const ano = Math.floor(total / 12);
  const mes0 = total - ano * 12;
  return montarData(ano, mes0, Math.min(d.dia, diasNoMes(ano, mes0)));
}

/**
 * Diferença em meses de calendário entre as duas datas (ignora o dia).
 * @param {string} de
 * @param {string} ate
 */
export function mesesEntre(de, ate) {
  const a = exigir(de);
  const b = exigir(ate);
  return (b.ano * 12 + b.mes0) - (a.ano * 12 + a.mes0);
}

/**
 * 0 = domingo, 6 = sábado.
 * @param {string} texto
 */
export function diaDaSemana(texto) {
  const d = exigir(texto);
  return new Date(Date.UTC(d.ano, d.mes0, d.dia)).getUTCDay();
}

/** @param {string} texto */
export function diaDoMes(texto) {
  return exigir(texto).dia;
}

/** Data de hoje no fuso do aparelho. */
export function hoje(agora = new Date()) {
  return montarData(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

/**
 * @param {string} texto
 * @returns {Mes}
 */
export function mesDaData(texto) {
  const d = exigir(texto);
  return { ano: d.ano, mes0: d.mes0 };
}

/**
 * @param {Mes} mes
 * @param {number} n
 * @returns {Mes}
 */
export function somarMesesAoMes(mes, n) {
  const total = mes.ano * 12 + mes.mes0 + n;
  const ano = Math.floor(total / 12);
  return { ano, mes0: total - ano * 12 };
}

/**
 * @param {Mes} a
 * @param {Mes} b
 */
export function mesmoMes(a, b) {
  return a.ano === b.ano && a.mes0 === b.mes0;
}

/** @param {Mes} mes */
export function primeiroDia(mes) {
  return montarData(mes.ano, mes.mes0, 1);
}

/** @param {Mes} mes */
export function ultimoDia(mes) {
  return montarData(mes.ano, mes.mes0, diasNoMes(mes.ano, mes.mes0));
}

/** @param {string} texto  ex.: 12/11 */
export function formatarCurta(texto) {
  const d = exigir(texto);
  return `${doisDigitos(d.dia)}/${doisDigitos(d.mes0 + 1)}`;
}

/** @param {string} texto  ex.: 12/11/2026 */
export function formatarCompleta(texto) {
  const d = exigir(texto);
  return `${doisDigitos(d.dia)}/${doisDigitos(d.mes0 + 1)}/${d.ano}`;
}

/** @param {string} texto  ex.: quinta-feira, 12/11/2026 */
export function formatarComDiaDaSemana(texto) {
  return `${NOMES_DIAS[diaDaSemana(texto)]}, ${formatarCompleta(texto)}`;
}

/** @param {Mes} mes  ex.: nov 2026 */
export function rotuloCurtoDoMes(mes) {
  return `${NOMES_MESES_CURTOS[mes.mes0]} ${mes.ano}`;
}

/**
 * Nome do mês; inclui o ano quando é diferente do ano de referência.
 * @param {Mes} mes
 * @param {Mes} [referencia]
 */
export function rotuloDoMes(mes, referencia) {
  const nome = NOMES_MESES[mes.mes0];
  return referencia && referencia.ano === mes.ano ? nome : `${nome} de ${mes.ano}`;
}

/** @param {string} texto */
export function capitalizar(texto) {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto;
}
