import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregar, salvar, gerarBackup, lerBackup, estadoInicial, CHAVE, CHAVE_COPIA_ILEGIVEL } from '../js/dados.js';

function memoria(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
  };
}

const pessoa = { id: 'p1', nome: 'Ana', cor: '#7DD3FF', eu: true, criadoEm: '2026-11-12T10:00:00.000Z' };
const despesa = {
  id: 'l1', tipo: 'despesa', descricao: 'Aluguel', valorCentavos: 180000, categoria: 'moradia', pessoaId: null,
  data: '2026-11-05', repeticao: { tipo: 'mensal', fim: { tipo: 'nunca' } }, baixas: { 0: '2026-11-05' },
  excluidas: [], ajustes: {}, corte: null, criadoEm: 'x', atualizadoEm: 'x',
};
const recebivel = {
  id: 'l2', tipo: 'recebivel', descricao: 'Salário', valorCentavos: 400000, categoria: null, pessoaId: 'p1',
  data: '2026-11-05', repeticao: { tipo: 'nao' }, baixas: {}, excluidas: [], ajustes: {}, corte: null, criadoEm: 'x', atualizadoEm: 'x',
};

test('primeiro uso: estado vazio, sem problema', () => {
  const r = carregar(memoria());
  assert.deepEqual(r.estado, estadoInicial());
  assert.equal(r.problema, null);
});

test('salva e lê de volta o mesmo conteúdo', () => {
  const m = memoria();
  const estado = { ...estadoInicial(), pessoas: [pessoa], lancamentos: [despesa, recebivel] };
  estado.preferencias.boasVindasConcluidas = true;
  assert.equal(salvar(estado, m), true);
  const r = carregar(m);
  assert.equal(r.problema, null);
  assert.deepEqual(r.estado, estado);
});

test('conteúdo ilegível: começa vazio e guarda uma cópia do que estava lá', () => {
  const m = memoria({ [CHAVE]: '{isto não é json' });
  const r = carregar(m);
  assert.equal(r.problema, 'ilegivel');
  assert.deepEqual(r.estado.lancamentos, []);
  assert.equal(m.dados[CHAVE_COPIA_ILEGIVEL], '{isto não é json');
});

test('item com defeito é deixado de fora sem perder os outros', () => {
  const ruim = { ...despesa, id: 'l9', valorCentavos: -3 };
  const m = memoria({ [CHAVE]: JSON.stringify({ versao: 1, pessoas: [pessoa], lancamentos: [despesa, ruim, recebivel] }) });
  const r = carregar(m);
  assert.equal(r.problema, 'itens-ignorados');
  assert.equal(r.ignorados, 1);
  assert.deepEqual(r.estado.lancamentos.map((l) => l.id), ['l1', 'l2']);
  assert.ok(m.dados[CHAVE_COPIA_ILEGIVEL]);
});

test('sem armazenamento disponível', () => {
  assert.equal(carregar(null).problema, 'sem-armazenamento');
  assert.equal(salvar(estadoInicial(), null), false);
  const cheio = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(salvar(estadoInicial(), cheio), false);
});

test('backup: exporta e importa o mesmo conteúdo', () => {
  const estado = { ...estadoInicial(), pessoas: [pessoa], lancamentos: [despesa, recebivel] };
  const texto = gerarBackup(estado, '2026-11-12T13:00:00.000Z');
  const r = lerBackup(texto);
  assert.equal(r.ok, true);
  assert.deepEqual(r.pessoas, [pessoa]);
  assert.deepEqual(r.lancamentos, [despesa, recebivel]);
  assert.equal(r.exportadoEm, '2026-11-12T13:00:00.000Z');
});

test('backup: recusa arquivo de outro app, formato desconhecido ou dados com defeito', () => {
  assert.equal(lerBackup('não é json').ok, false);
  assert.equal(lerBackup(JSON.stringify({ app: 'outro' })).ok, false);
  assert.equal(lerBackup(JSON.stringify({ app: 'controle-despesas', formato: 2 })).ok, false);
  const semPessoa = JSON.stringify({ app: 'controle-despesas', formato: 1, pessoas: [], lancamentos: [recebivel] });
  const r = lerBackup(semPessoa);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Nada foi importado/);
});
