import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formularioNovo, formularioDe, validarFormulario, explicarRepeticao, salvarLancamento, alternarBaixa, ajustarValor,
  excluirOcorrencia, encerrarAPartirDe, excluirLancamento, adicionarPessoa, editarPessoa, removerPessoa,
  concluirBoasVindas, restaurarBackup, validarNome,
} from '../js/acoes.js';
import { estadoInicial } from '../js/dados.js';
import { ocorrenciasEntre } from '../js/recorrencia.js';

const AGORA = '2026-11-12T13:00:00.000Z';
const HOJE = '2026-11-12';

function comPessoas() {
  let e = concluirBoasVindas(estadoInicial(), { nome: 'Ana Souza', id: 'p1', agoraISO: AGORA });
  e = adicionarPessoa(e, { id: 'p2', nome: 'Bruno', agoraISO: AGORA });
  return e;
}

test('boas-vindas: com nome cadastra a pessoa "eu"; sem nome, não cadastra ninguém', () => {
  const e = concluirBoasVindas(estadoInicial(), { nome: '  Ana Souza ', id: 'p1', agoraISO: AGORA });
  assert.equal(e.preferencias.boasVindasConcluidas, true);
  assert.deepEqual(e.pessoas.map((p) => [p.nome, p.eu]), [['Ana Souza', true]]);
  const vazio = concluirBoasVindas(estadoInicial(), { nome: '   ', id: 'p1', agoraISO: AGORA });
  assert.equal(vazio.pessoas.length, 0);
});

test('pessoas ganham cores diferentes; só uma pode ser "eu"', () => {
  let e = comPessoas();
  assert.notEqual(e.pessoas[0].cor, e.pessoas[1].cor);
  e = editarPessoa(e, 'p2', { nome: 'Bruno Lima', eu: true });
  assert.deepEqual(e.pessoas.map((p) => [p.nome, p.eu]), [['Ana Souza', false], ['Bruno Lima', true]]);
  assert.equal(validarNome('  '), 'Escreva o nome.');
  assert.equal(validarNome('Ana'), null);
});

test('formulário novo: escolhe a pessoa "eu" ou a única pessoa', () => {
  const e = comPessoas();
  assert.equal(formularioNovo('recebivel', HOJE, e.pessoas).pessoaId, 'p1');
  assert.equal(formularioNovo('recebivel', HOJE, [e.pessoas[1]]).pessoaId, 'p2');
  assert.equal(formularioNovo('despesa', HOJE, []).data, HOJE);
});

test('validação do formulário', () => {
  const e = comPessoas();
  const f = formularioNovo('recebivel', HOJE, []);
  const r = validarFormulario(f, e.pessoas);
  assert.deepEqual(Object.keys(r.erros).sort(), ['descricao', 'pessoa', 'valor']);
  assert.equal(r.campos, null);

  const ok = validarFormulario({ ...f, valorCentavos: 100000, descricao: ' Freela ', pessoaId: 'p2' }, e.pessoas);
  assert.deepEqual(ok.erros, {});
  assert.deepEqual(ok.campos, {
    tipo: 'recebivel', descricao: 'Freela', valorCentavos: 100000, categoria: null, pessoaId: 'p2', data: HOJE, repeticao: { tipo: 'nao' },
  });

  const base = { ...formularioNovo('despesa', HOJE, []), valorCentavos: 100, descricao: 'X' };
  assert.equal(validarFormulario({ ...base, repetir: 'parcelado', parcelas: '1' }, []).erros.parcelas, 'Informe de 2 a 360 parcelas.');
  assert.deepEqual(validarFormulario({ ...base, repetir: 'parcelado', parcelas: '10' }, []).campos.repeticao, { tipo: 'parcelado', parcelas: 10 });
  assert.equal(validarFormulario({ ...base, repetir: 'mensal', fim: 'vezes', vezes: 'abc' }, []).erros.vezes, 'Informe de 2 a 999 vezes.');
  assert.match(validarFormulario({ ...base, repetir: 'mensal', fim: 'data', ate: '2026-11-01' }, []).erros.ate, /depois da primeira data/);
  assert.deepEqual(validarFormulario({ ...base, repetir: 'semanal', fim: 'data', ate: '2026-12-31' }, []).campos.repeticao,
    { tipo: 'semanal', fim: { tipo: 'data', data: '2026-12-31' } });
  assert.equal(validarFormulario(base, []).campos.categoria, 'outras', 'sem categoria vira Outras');
  assert.equal(validarFormulario({ ...base, data: '' }, []).erros.data, 'Escolha a data.');
});

test('explicação da repetição', () => {
  const base = { ...formularioNovo('despesa', '2026-11-12', []), valorCentavos: 30000 };
  assert.equal(explicarRepeticao({ ...base, repetir: 'semanal' }), 'Repete toda quinta-feira.');
  assert.equal(explicarRepeticao({ ...base, data: '2026-11-15', repetir: 'semanal' }), 'Repete todo domingo.');
  assert.equal(explicarRepeticao({ ...base, data: '2026-01-31', repetir: 'mensal' }), 'Repete todo mês, no dia 31. Nos meses mais curtos, no último dia.');
  assert.equal(explicarRepeticao({ ...base, repetir: 'mensal', fim: 'vezes', vezes: '12' }), 'Repete todo mês, no dia 12. São 12 vezes, a última em 12/10/2027.');
  assert.equal(explicarRepeticao({ ...base, repetir: 'anual' }), 'Repete todo ano, em 12 de novembro.');
  assert.equal(explicarRepeticao({ ...base, repetir: 'parcelado', parcelas: '10' }),
    '10 parcelas de R$ 300,00, de 12/11/2026 a 12/08/2027. Total: R$ 3.000,00.');
});

test('salvar: novo lançamento já pago e depois editado', () => {
  let e = comPessoas();
  const campos = validarFormulario({ ...formularioNovo('despesa', HOJE, []), valorCentavos: 45000, descricao: 'Condomínio', categoria: 'moradia', repetir: 'mensal' }, []).campos;
  e = salvarLancamento(e, campos, { agoraISO: AGORA, novoId: 'l1', pagoEm: HOJE });
  const l = e.lancamentos[0];
  assert.equal(l.id, 'l1');
  assert.deepEqual(l.baixas, { 0: HOJE });

  e = encerrarAPartirDe(e, 'l1', 5);
  assert.equal(e.lancamentos[0].corte, 5);
  const editado = salvarLancamento(e, { ...campos, descricao: 'Condomínio do prédio', valorCentavos: 47000 }, { id: 'l1', agoraISO: AGORA });
  assert.equal(editado.lancamentos[0].descricao, 'Condomínio do prédio');
  assert.equal(editado.lancamentos[0].corte, 5, 'mesma repetição: o encerramento continua');
  assert.deepEqual(editado.lancamentos[0].baixas, { 0: HOJE }, 'pagamentos continuam');
  const outraRegra = salvarLancamento(e, { ...campos, repeticao: { tipo: 'mensal', fim: { tipo: 'vezes', vezes: 3 } } }, { id: 'l1', agoraISO: AGORA });
  assert.equal(outraRegra.lancamentos[0].corte, null, 'regra nova: o encerramento anterior deixa de valer');
  assert.deepEqual(formularioDe(editado.lancamentos[0]).descricao, 'Condomínio do prédio');
});

test('baixa, ajuste de valor e exclusões', () => {
  let e = comPessoas();
  const campos = validarFormulario({ ...formularioNovo('despesa', HOJE, []), valorCentavos: 22000, descricao: 'Energia', repetir: 'mensal' }, []).campos;
  e = salvarLancamento(e, campos, { agoraISO: AGORA, novoId: 'l1' });

  e = alternarBaixa(e, 'l1', 0, HOJE);
  assert.deepEqual(e.lancamentos[0].baixas, { 0: HOJE });
  e = alternarBaixa(e, 'l1', 0, HOJE);
  assert.deepEqual(e.lancamentos[0].baixas, {});

  e = ajustarValor(e, 'l1', 1, 25000);
  assert.deepEqual(e.lancamentos[0].ajustes, { 1: { valorCentavos: 25000 } });
  e = ajustarValor(e, 'l1', 1, null);
  assert.deepEqual(e.lancamentos[0].ajustes, {});

  e = excluirOcorrencia(e, 'l1', 2);
  assert.deepEqual(ocorrenciasEntre(e.lancamentos[0], '2026-11-01', '2027-02-28').map((o) => o.indice), [0, 1, 3]);
  assert.equal(encerrarAPartirDe(e, 'l1', 0).lancamentos.length, 0, 'encerrar na primeira apaga o lançamento');
  assert.equal(excluirLancamento(e, 'l1').lancamentos.length, 0);
});

test('excluir a ocorrência de um lançamento que não repete apaga o lançamento', () => {
  let e = estadoInicial();
  const campos = validarFormulario({ ...formularioNovo('despesa', HOJE, []), valorCentavos: 100, descricao: 'Pizza' }, []).campos;
  e = salvarLancamento(e, campos, { agoraISO: AGORA, novoId: 'l1' });
  assert.equal(excluirOcorrencia(e, 'l1', 0).lancamentos.length, 0);
});

test('remover pessoa apaga os recebíveis dela e mantém o resto', () => {
  let e = comPessoas();
  const rec = validarFormulario({ ...formularioNovo('recebivel', HOJE, e.pessoas), valorCentavos: 100, descricao: 'Salário', pessoaId: 'p2' }, e.pessoas).campos;
  const desp = validarFormulario({ ...formularioNovo('despesa', HOJE, []), valorCentavos: 100, descricao: 'Mercado' }, []).campos;
  e = salvarLancamento(e, rec, { agoraISO: AGORA, novoId: 'l1' });
  e = salvarLancamento(e, desp, { agoraISO: AGORA, novoId: 'l2' });
  e = removerPessoa(e, 'p2');
  assert.deepEqual(e.pessoas.map((p) => p.id), ['p1']);
  assert.deepEqual(e.lancamentos.map((l) => l.id), ['l2']);
});

test('restaurar backup troca os dados e mantém o app aberto', () => {
  const e = restaurarBackup(estadoInicial(), { pessoas: [], lancamentos: [] });
  assert.equal(e.preferencias.boasVindasConcluidas, true);
});
