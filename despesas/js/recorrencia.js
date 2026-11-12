/**
 * Lançamentos e as ocorrências que eles geram no calendário.
 *
 * Um lançamento guarda a regra (valor, primeira data e repetição). As ocorrências são calculadas
 * na hora, para o período pedido, a partir da primeira data. Por isso uma despesa mensal no dia 31
 * cai em 28/02 e volta para 31/03, sem "escorregar" o dia.
 *
 * O que muda numa ocorrência só fica guardado no lançamento, pelo número da ocorrência (índice 0, 1, 2...):
 *  - baixas:    índice → data em que foi paga/recebida
 *  - ajustes:   índice → valor diferente só naquela ocorrência
 *  - excluidas: índices apagados um a um
 *  - corte:     a partir deste índice não há mais ocorrências ("esta e as próximas" apagadas)
 */

import { somarDias, somarMeses, diasEntre, mesesEntre, formatarCompleta } from './datas.js';

/**
 * @typedef {{ tipo: 'nunca' } | { tipo: 'vezes', vezes: number } | { tipo: 'data', data: string }} Fim
 * @typedef {{ tipo: 'nao' }
 *   | { tipo: 'semanal' | 'mensal' | 'anual', fim: Fim }
 *   | { tipo: 'parcelado', parcelas: number }} Repeticao
 * @typedef {{
 *   id: string,
 *   tipo: 'despesa' | 'recebivel',
 *   descricao: string,
 *   valorCentavos: number,
 *   categoria: string | null,
 *   pessoaId: string | null,
 *   data: string,
 *   repeticao: Repeticao,
 *   baixas: Record<string, string>,
 *   excluidas: number[],
 *   ajustes: Record<string, { valorCentavos: number }>,
 *   corte: number | null,
 *   criadoEm: string,
 *   atualizadoEm: string
 * }} Lancamento
 * @typedef {{
 *   chave: string,
 *   lancamento: Lancamento,
 *   indice: number,
 *   data: string,
 *   valorCentavos: number,
 *   ajustado: boolean,
 *   pagoEm: string | null
 * }} Ocorrencia
 */

/** @param {Lancamento} lanc */
export function ehRecorrente(lanc) {
  return lanc.repeticao.tipo !== 'nao';
}

/**
 * Data da ocorrência de número `indice`, sem olhar limites nem exclusões.
 * @param {Lancamento} lanc
 * @param {number} indice
 * @returns {string | null}
 */
export function dataDaOcorrencia(lanc, indice) {
  const r = lanc.repeticao;
  switch (r.tipo) {
    case 'nao': return indice === 0 ? lanc.data : null;
    case 'semanal': return somarDias(lanc.data, 7 * indice);
    case 'mensal':
    case 'parcelado': return somarMeses(lanc.data, indice);
    case 'anual': return somarMeses(lanc.data, 12 * indice);
    default: return null;
  }
}

/**
 * Quantas ocorrências a regra prevê, sem contar o corte. Infinity quando não tem fim marcado por quantidade.
 * @param {Repeticao} r
 */
export function quantidadePrevista(r) {
  if (r.tipo === 'nao') return 1;
  if (r.tipo === 'parcelado') return r.parcelas;
  if (r.fim.tipo === 'vezes') return r.fim.vezes;
  return Infinity;
}

/** @param {Lancamento} lanc  limite (exclusivo) dos índices válidos */
function limiteDeIndices(lanc) {
  const limite = quantidadePrevista(lanc.repeticao);
  return lanc.corte == null ? limite : Math.min(limite, lanc.corte);
}

/** @param {Repeticao} r */
function dataFinal(r) {
  return (r.tipo === 'semanal' || r.tipo === 'mensal' || r.tipo === 'anual') && r.fim.tipo === 'data' ? r.fim.data : null;
}

/**
 * Menor índice que pode cair em `inicio` ou depois (pode começar um pouco antes; nunca depois).
 * @param {Lancamento} lanc
 * @param {string} inicio
 */
function primeiroIndiceCandidato(lanc, inicio) {
  if (inicio <= lanc.data) return 0;
  switch (lanc.repeticao.tipo) {
    case 'semanal': return Math.max(0, Math.floor(diasEntre(lanc.data, inicio) / 7) - 1);
    case 'mensal':
    case 'parcelado': return Math.max(0, mesesEntre(lanc.data, inicio) - 1);
    case 'anual': return Math.max(0, Math.floor(mesesEntre(lanc.data, inicio) / 12) - 1);
    default: return 0;
  }
}

/**
 * @param {Lancamento} lanc
 * @param {number} indice
 * @param {string} data
 * @returns {Ocorrencia}
 */
function montarOcorrencia(lanc, indice, data) {
  const ajuste = lanc.ajustes[indice];
  return {
    chave: `${lanc.id}:${indice}`,
    lancamento: lanc,
    indice,
    data,
    valorCentavos: ajuste ? ajuste.valorCentavos : lanc.valorCentavos,
    ajustado: Boolean(ajuste),
    pagoEm: lanc.baixas[indice] || null,
  };
}

/**
 * Ocorrências do lançamento com data entre `inicio` e `fim` (inclusive), em ordem de data.
 * @param {Lancamento} lanc
 * @param {string} inicio
 * @param {string} fim
 * @returns {Ocorrencia[]}
 */
export function ocorrenciasEntre(lanc, inicio, fim) {
  /** @type {Ocorrencia[]} */
  const lista = [];
  if (fim < lanc.data || fim < inicio) return lista;
  const limite = limiteDeIndices(lanc);
  const ultimaData = dataFinal(lanc.repeticao);
  const excluidas = new Set(lanc.excluidas);
  for (let i = primeiroIndiceCandidato(lanc, inicio); i < limite; i += 1) {
    const data = dataDaOcorrencia(lanc, i);
    if (data === null || data > fim || (ultimaData && data > ultimaData)) break;
    if (data < inicio || excluidas.has(i)) continue;
    lista.push(montarOcorrencia(lanc, i, data));
  }
  return lista;
}

/**
 * A ocorrência de número `indice`, ou null se ela não existe (fora do limite, depois do fim, excluída).
 * @param {Lancamento} lanc
 * @param {number} indice
 * @returns {Ocorrencia | null}
 */
export function ocorrenciaNoIndice(lanc, indice) {
  if (!Number.isInteger(indice) || indice < 0 || indice >= limiteDeIndices(lanc)) return null;
  if (lanc.excluidas.includes(indice)) return null;
  const data = dataDaOcorrencia(lanc, indice);
  if (data === null) return null;
  const ultimaData = dataFinal(lanc.repeticao);
  if (ultimaData && data > ultimaData) return null;
  return montarOcorrencia(lanc, indice, data);
}

/**
 * Data da última ocorrência prevista pela regra (sem exclusões), ou null se não tem fim.
 * @param {Lancamento} lanc
 */
export function dataDaUltima(lanc) {
  const r = lanc.repeticao;
  const quantidade = limiteDeIndices(lanc);
  if (Number.isFinite(quantidade)) {
    const data = dataDaOcorrencia(lanc, quantidade - 1);
    const ultimaData = dataFinal(r);
    return ultimaData && data && data > ultimaData ? ultimaData : data;
  }
  return dataFinal(r);
}

const NOMES_CURTOS = { semanal: 'semanal', mensal: 'mensal', anual: 'anual' };
const BASES = { semanal: 'Toda semana', mensal: 'Todo mês', anual: 'Todo ano' };

/**
 * Rótulo curto para a lista: "mensal", "parcela 3/10", "mensal 2/12".
 * @param {Ocorrencia} oc
 */
export function rotuloCurto(oc) {
  const r = oc.lancamento.repeticao;
  if (r.tipo === 'nao') return '';
  if (r.tipo === 'parcelado') return `parcela ${oc.indice + 1}/${r.parcelas}`;
  if (r.fim.tipo === 'vezes') return `${NOMES_CURTOS[r.tipo]} ${oc.indice + 1}/${r.fim.vezes}`;
  return NOMES_CURTOS[r.tipo];
}

/**
 * Frase da regra: "Todo mês", "Toda semana, 8 vezes", "Todo ano, até 31/12/2030", "Parcelado em 10 vezes".
 * @param {Repeticao} r
 */
export function descreverRepeticao(r) {
  if (r.tipo === 'nao') return 'Não repete';
  if (r.tipo === 'parcelado') return `Parcelado em ${r.parcelas} vezes`;
  const base = BASES[r.tipo];
  if (r.fim.tipo === 'vezes') return `${base}, ${r.fim.vezes} vezes`;
  if (r.fim.tipo === 'data') return `${base}, até ${formatarCompleta(r.fim.data)}`;
  return base;
}

/**
 * Duas regras de repetição são iguais?
 * @param {Repeticao} a
 * @param {Repeticao} b
 */
export function mesmaRepeticao(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
