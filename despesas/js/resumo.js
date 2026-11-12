/**
 * Contas do mês: totais, o que está em aberto, a renda de cada pessoa e a linha do mês.
 * Só soma o que foi lançado; nada é estimado.
 */

import { primeiroDia, ultimoDia, diasNoMes, somarMesesAoMes, mesDaData, mesmoMes, somarDias, lerData } from './datas.js';
import { ocorrenciasEntre } from './recorrencia.js';

/**
 * @typedef {import('./recorrencia.js').Lancamento} Lancamento
 * @typedef {import('./recorrencia.js').Ocorrencia} Ocorrencia
 * @typedef {import('./datas.js').Mes} Mes
 * @typedef {{ id: string, nome: string, cor: string, eu: boolean, criadoEm: string }} Pessoa
 */

/**
 * @param {Ocorrencia} a
 * @param {Ocorrencia} b
 */
function ordenarPorData(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  if (a.lancamento.tipo !== b.lancamento.tipo) return a.lancamento.tipo === 'recebivel' ? -1 : 1;
  return a.lancamento.descricao.localeCompare(b.lancamento.descricao, 'pt-BR');
}

/**
 * Todas as ocorrências dos lançamentos no período, em ordem de data.
 * @param {Lancamento[]} lancamentos
 * @param {string} inicio
 * @param {string} fim
 * @param {'despesa' | 'recebivel'} [tipo]
 */
export function ocorrenciasNoPeriodo(lancamentos, inicio, fim, tipo) {
  /** @type {Ocorrencia[]} */
  const lista = [];
  for (const lanc of lancamentos) {
    if (tipo && lanc.tipo !== tipo) continue;
    for (const oc of ocorrenciasEntre(lanc, inicio, fim)) lista.push(oc);
  }
  return lista.sort(ordenarPorData);
}

/**
 * @param {Lancamento[]} lancamentos
 * @param {Mes} mes
 * @param {'despesa' | 'recebivel'} [tipo]
 */
export function ocorrenciasDoMes(lancamentos, mes, tipo) {
  return ocorrenciasNoPeriodo(lancamentos, primeiroDia(mes), ultimoDia(mes), tipo);
}

/**
 * 'paga' (ou recebida), 'atrasada' (data já passou e não foi paga) ou 'aberta'.
 * @param {Ocorrencia} oc
 * @param {string} hojeISO
 * @returns {'paga' | 'atrasada' | 'aberta'}
 */
export function situacao(oc, hojeISO) {
  if (oc.pagoEm) return 'paga';
  return oc.data < hojeISO ? 'atrasada' : 'aberta';
}

/**
 * @param {Ocorrencia[]} ocs
 */
function totais(ocs) {
  let total = 0;
  let quitado = 0;
  for (const oc of ocs) {
    total += oc.valorCentavos;
    if (oc.pagoEm) quitado += oc.valorCentavos;
  }
  return { quantidade: ocs.length, totalCentavos: total, quitadoCentavos: quitado, emAbertoCentavos: total - quitado };
}

/**
 * Resumo do mês para a tela inicial.
 * @param {Lancamento[]} lancamentos
 * @param {Mes} mes
 * @param {string} hojeISO
 */
export function resumoDoMes(lancamentos, mes, hojeISO) {
  const ocs = ocorrenciasDoMes(lancamentos, mes);
  const entradas = ocs.filter((oc) => oc.lancamento.tipo === 'recebivel');
  const saidas = ocs.filter((oc) => oc.lancamento.tipo === 'despesa');
  const resumoEntradas = totais(entradas);
  const resumoSaidas = totais(saidas);
  return {
    quantidade: ocs.length,
    entradas: resumoEntradas,
    saidas: { ...resumoSaidas, atrasadas: saidas.filter((oc) => situacao(oc, hojeISO) === 'atrasada').length },
    saldoPrevistoCentavos: resumoEntradas.totalCentavos - resumoSaidas.totalCentavos,
    dias: linhaDoMes(ocs, mes),
  };
}

/**
 * Para cada dia do mês, se há entrada e/ou saída.
 * @param {Ocorrencia[]} ocs
 * @param {Mes} mes
 */
export function linhaDoMes(ocs, mes) {
  const n = diasNoMes(mes.ano, mes.mes0);
  const dias = Array.from({ length: n }, (_, i) => ({ dia: i + 1, entra: false, sai: false }));
  for (const oc of ocs) {
    const partes = lerData(oc.data);
    if (!partes) continue;
    const item = dias[partes.dia - 1];
    if (oc.lancamento.tipo === 'recebivel') item.entra = true;
    else item.sai = true;
  }
  return dias;
}

/**
 * O que está em aberto para a lista da tela inicial.
 * Mês atual: tudo que está atrasado nos últimos 12 meses + o que vence de hoje até o fim do mês.
 * Outros meses: o que ficou ou está em aberto naquele mês.
 * @param {Lancamento[]} lancamentos
 * @param {Mes} mes
 * @param {string} hojeISO
 */
export function pendencias(lancamentos, mes, hojeISO) {
  const mesDeHoje = mesDaData(hojeISO);
  if (mesmoMes(mes, mesDeHoje)) {
    const inicio = primeiroDia(somarMesesAoMes(mesDeHoje, -12));
    return ocorrenciasNoPeriodo(lancamentos, inicio, ultimoDia(mes)).filter((oc) => !oc.pagoEm);
  }
  return ocorrenciasDoMes(lancamentos, mes).filter((oc) => !oc.pagoEm);
}

/**
 * Renda prevista e recebida de cada pessoa no mês, na ordem das pessoas.
 * @param {Lancamento[]} lancamentos
 * @param {Pessoa[]} pessoas
 * @param {Mes} mes
 */
export function rendaPorPessoa(lancamentos, pessoas, mes) {
  const ocs = ocorrenciasDoMes(lancamentos, mes, 'recebivel');
  return pessoas.map((pessoa) => {
    const daPessoa = ocs.filter((oc) => oc.lancamento.pessoaId === pessoa.id);
    const t = totais(daPessoa);
    return { pessoa, quantidade: t.quantidade, previstoCentavos: t.totalCentavos, recebidoCentavos: t.quitadoCentavos };
  });
}

/**
 * Quantas ocorrências atrasadas existem nos últimos 12 meses (para avisos).
 * @param {Lancamento[]} lancamentos
 * @param {string} hojeISO
 * @param {'despesa' | 'recebivel'} [tipo]
 */
export function atrasadas(lancamentos, hojeISO, tipo) {
  const inicio = primeiroDia(somarMesesAoMes(mesDaData(hojeISO), -12));
  return ocorrenciasNoPeriodo(lancamentos, inicio, somarDias(hojeISO, -1), tipo).filter((oc) => !oc.pagoEm);
}
