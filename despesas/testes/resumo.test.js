import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumoDoMes, pendencias, rendaPorPessoa, situacao, atrasadas, ocorrenciasDoMes } from '../js/resumo.js';

function lanc(campos) {
  return {
    id: campos.id, tipo: 'despesa', descricao: campos.id, valorCentavos: 1000, categoria: 'outras', pessoaId: null,
    data: '2026-11-10', repeticao: { tipo: 'nao' }, baixas: {}, excluidas: [], ajustes: {}, corte: null,
    criadoEm: '', atualizadoEm: '', ...campos,
  };
}

const NOV = { ano: 2026, mes0: 10 };
const HOJE = '2026-11-12';
const pessoas = [
  { id: 'p1', nome: 'Ana', cor: '#7DD3FF', eu: true, criadoEm: '' },
  { id: 'p2', nome: 'Bruno', cor: '#5FD4B0', eu: false, criadoEm: '' },
];
const lancamentos = [
  lanc({ id: 'aluguel', valorCentavos: 180000, data: '2026-10-05', repeticao: { tipo: 'mensal', fim: { tipo: 'nunca' } }, baixas: { 1: '2026-11-05' } }),
  lanc({ id: 'condominio', valorCentavos: 45000, data: '2026-11-10' }),
  lanc({ id: 'internet', valorCentavos: 12000, data: '2026-11-15' }),
  lanc({ id: 'salario-ana', tipo: 'recebivel', categoria: null, pessoaId: 'p1', valorCentavos: 400000, data: '2026-11-05', repeticao: { tipo: 'mensal', fim: { tipo: 'nunca' } }, baixas: { 0: '2026-11-05' } }),
  lanc({ id: 'freela-ana', tipo: 'recebivel', categoria: null, pessoaId: 'p1', valorCentavos: 100000, data: '2026-11-14' }),
  lanc({ id: 'salario-bruno', tipo: 'recebivel', categoria: null, pessoaId: 'p2', valorCentavos: 300000, data: '2026-11-10', baixas: { 0: '2026-11-10' } }),
  lanc({ id: 'luz-outubro', valorCentavos: 20000, data: '2026-10-20' }),
];

test('resumo do mês soma só o que foi lançado no mês', () => {
  const r = resumoDoMes(lancamentos, NOV, HOJE);
  assert.equal(r.quantidade, 6);
  assert.equal(r.entradas.totalCentavos, 800000);
  assert.equal(r.entradas.quitadoCentavos, 700000);
  assert.equal(r.entradas.emAbertoCentavos, 100000);
  assert.equal(r.saidas.totalCentavos, 237000);
  assert.equal(r.saidas.quitadoCentavos, 180000);
  assert.equal(r.saidas.emAbertoCentavos, 57000);
  assert.equal(r.saidas.atrasadas, 1, 'condomínio venceu dia 10');
  assert.equal(r.saldoPrevistoCentavos, 800000 - 237000);
  assert.equal(r.dias.length, 30);
  assert.deepEqual(r.dias[4], { dia: 5, entra: true, sai: true });
  assert.deepEqual(r.dias[14], { dia: 15, entra: false, sai: true });
});

test('mês sem lançamentos fica zerado, sem inventar nada', () => {
  const r = resumoDoMes(lancamentos, { ano: 2026, mes0: 8 }, HOJE);
  assert.equal(r.quantidade, 0);
  assert.equal(r.entradas.quantidade, 0);
  assert.equal(r.saidas.quantidade, 0);
});

test('situação: paga, atrasada ou aberta', () => {
  const [aluguelNov] = ocorrenciasDoMes([lancamentos[0]], NOV);
  assert.equal(situacao(aluguelNov, HOJE), 'paga');
  const [cond] = ocorrenciasDoMes([lancamentos[1]], NOV);
  assert.equal(situacao(cond, HOJE), 'atrasada');
  assert.equal(situacao(cond, '2026-11-10'), 'aberta', 'no dia do vencimento ainda não está atrasada');
});

test('pendências do mês atual incluem atrasos de meses anteriores', () => {
  const lista = pendencias(lancamentos, NOV, HOJE).map((o) => o.lancamento.id);
  assert.deepEqual(lista, ['aluguel', 'luz-outubro', 'condominio', 'freela-ana', 'internet']);
});

test('pendências de outro mês: só daquele mês', () => {
  const lista = pendencias(lancamentos, { ano: 2026, mes0: 11 }, HOJE).map((o) => `${o.lancamento.id}@${o.data}`);
  assert.deepEqual(lista, ['salario-ana@2026-12-05', 'aluguel@2026-12-05']);
});

test('renda por pessoa', () => {
  const renda = rendaPorPessoa(lancamentos, pessoas, NOV);
  assert.deepEqual(renda.map((r) => [r.pessoa.id, r.quantidade, r.previstoCentavos, r.recebidoCentavos]), [
    ['p1', 2, 500000, 400000],
    ['p2', 1, 300000, 300000],
  ]);
});

test('atrasadas nos últimos 12 meses', () => {
  assert.deepEqual(atrasadas(lancamentos, HOJE, 'despesa').map((o) => o.lancamento.id), ['aluguel', 'luz-outubro', 'condominio']);
});
