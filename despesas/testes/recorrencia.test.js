import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ocorrenciasEntre, ocorrenciaNoIndice, dataDaOcorrencia, rotuloCurto, descreverRepeticao, dataDaUltima, quantidadePrevista } from '../js/recorrencia.js';
import { somarDias } from '../js/datas.js';

/** @returns {import('../js/recorrencia.js').Lancamento} */
function lanc(campos) {
  return {
    id: 'l1', tipo: 'despesa', descricao: 'Teste', valorCentavos: 1000, categoria: 'outras', pessoaId: null,
    data: '2026-01-31', repeticao: { tipo: 'nao' }, baixas: {}, excluidas: [], ajustes: {}, corte: null,
    criadoEm: '', atualizadoEm: '', ...campos,
  };
}

const datas = (ocs) => ocs.map((o) => o.data);

test('não repete: uma ocorrência só, na data', () => {
  const l = lanc({ data: '2026-11-12' });
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-11-01', '2026-11-30')), ['2026-11-12']);
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-12-01', '2026-12-31')), []);
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-10-01', '2026-10-31')), []);
});

test('mensal no dia 31 cai no último dia dos meses curtos e volta ao 31', () => {
  const l = lanc({ repeticao: { tipo: 'mensal', fim: { tipo: 'nunca' } } });
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-01-01', '2026-06-30')),
    ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30']);
  assert.deepEqual(datas(ocorrenciasEntre(l, '2031-02-01', '2031-02-28')), ['2031-02-28']);
  assert.equal(ocorrenciasEntre(l, '2031-02-01', '2031-02-28')[0].indice, 61);
});

test('semanal: toda semana a partir da primeira data', () => {
  const l = lanc({ data: '2026-11-12', repeticao: { tipo: 'semanal', fim: { tipo: 'nunca' } } });
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-11-01', '2026-11-30')), ['2026-11-12', '2026-11-19', '2026-11-26']);
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-12-01', '2026-12-31')), ['2026-12-03', '2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31']);
});

test('anual: no mesmo dia; 29/02 vira 28/02 nos anos comuns', () => {
  const l = lanc({ data: '2024-02-29', repeticao: { tipo: 'anual', fim: { tipo: 'nunca' } } });
  assert.deepEqual(datas(ocorrenciasEntre(l, '2024-01-01', '2028-12-31')), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
});

test('parcelado: só as parcelas previstas', () => {
  const l = lanc({ data: '2026-11-05', repeticao: { tipo: 'parcelado', parcelas: 3 } });
  assert.deepEqual(datas(ocorrenciasEntre(l, '2026-01-01', '2027-12-31')), ['2026-11-05', '2026-12-05', '2027-01-05']);
  const terceira = ocorrenciasEntre(l, '2027-01-01', '2027-01-31')[0];
  assert.equal(rotuloCurto(terceira), 'parcela 3/3');
  assert.equal(quantidadePrevista(l.repeticao), 3);
  assert.equal(dataDaUltima(l), '2027-01-05');
});

test('fim por quantidade de vezes e por data', () => {
  const porVezes = lanc({ data: '2026-11-10', repeticao: { tipo: 'mensal', fim: { tipo: 'vezes', vezes: 2 } } });
  assert.deepEqual(datas(ocorrenciasEntre(porVezes, '2026-01-01', '2027-12-31')), ['2026-11-10', '2026-12-10']);
  assert.equal(rotuloCurto(ocorrenciasEntre(porVezes, '2026-12-01', '2026-12-31')[0]), 'mensal 2/2');

  const porData = lanc({ data: '2026-11-10', repeticao: { tipo: 'semanal', fim: { tipo: 'data', data: '2026-11-24' } } });
  assert.deepEqual(datas(ocorrenciasEntre(porData, '2026-01-01', '2027-12-31')), ['2026-11-10', '2026-11-17', '2026-11-24']);
  assert.equal(dataDaUltima(porData), '2026-11-24');
});

test('exclusão de uma ocorrência, corte e valor ajustado', () => {
  const l = lanc({
    data: '2026-11-10',
    repeticao: { tipo: 'mensal', fim: { tipo: 'nunca' } },
    excluidas: [1],
    corte: 4,
    ajustes: { 2: { valorCentavos: 1500 } },
    baixas: { 0: '2026-11-09' },
  });
  const ocs = ocorrenciasEntre(l, '2026-01-01', '2028-12-31');
  assert.deepEqual(datas(ocs), ['2026-11-10', '2027-01-10', '2027-02-10']);
  assert.equal(ocs[0].pagoEm, '2026-11-09');
  assert.equal(ocs[1].valorCentavos, 1500);
  assert.equal(ocs[1].ajustado, true);
  assert.equal(ocs[2].valorCentavos, 1000);
  assert.equal(ocorrenciaNoIndice(l, 1), null, 'excluída');
  assert.equal(ocorrenciaNoIndice(l, 4), null, 'depois do corte');
  assert.equal(ocorrenciaNoIndice(l, 3).data, '2027-02-10');
});

test('o atalho para achar o primeiro índice dá o mesmo resultado que percorrer tudo', () => {
  const regras = [
    { tipo: 'semanal', fim: { tipo: 'nunca' } },
    { tipo: 'mensal', fim: { tipo: 'nunca' } },
    { tipo: 'anual', fim: { tipo: 'nunca' } },
    { tipo: 'parcelado', parcelas: 40 },
    { tipo: 'mensal', fim: { tipo: 'vezes', vezes: 30 } },
    { tipo: 'semanal', fim: { tipo: 'data', data: '2027-06-15' } },
  ];
  const inicios = ['2025-01-31', '2025-02-28', '2026-03-29', '2024-02-29', '2026-11-12', '2026-12-31'];
  let semente = 7;
  const aleatorio = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  for (const repeticao of regras) {
    for (const data of inicios) {
      if (repeticao.fim && repeticao.fim.tipo === 'data' && repeticao.fim.data < data) continue;
      const l = lanc({ data, repeticao });
      for (let k = 0; k < 40; k += 1) {
        const ini = somarDias('2024-01-01', Math.floor(aleatorio() * 1500));
        const fim = somarDias(ini, Math.floor(aleatorio() * 120));
        const esperado = [];
        const limite = quantidadePrevista(repeticao);
        for (let i = 0; i < Math.min(limite, 400); i += 1) {
          const d = dataDaOcorrencia(l, i);
          if (repeticao.fim && repeticao.fim.tipo === 'data' && d > repeticao.fim.data) break;
          if (d >= ini && d <= fim) esperado.push(d);
        }
        assert.deepEqual(datas(ocorrenciasEntre(l, ini, fim)), esperado, `${JSON.stringify(repeticao)} desde ${data}, período ${ini} a ${fim}`);
      }
    }
  }
});

test('frases da repetição', () => {
  assert.equal(descreverRepeticao({ tipo: 'nao' }), 'Não repete');
  assert.equal(descreverRepeticao({ tipo: 'mensal', fim: { tipo: 'nunca' } }), 'Todo mês');
  assert.equal(descreverRepeticao({ tipo: 'semanal', fim: { tipo: 'vezes', vezes: 8 } }), 'Toda semana, 8 vezes');
  assert.equal(descreverRepeticao({ tipo: 'anual', fim: { tipo: 'data', data: '2030-12-31' } }), 'Todo ano, até 31/12/2030');
  assert.equal(descreverRepeticao({ tipo: 'parcelado', parcelas: 10 }), 'Parcelado em 10 vezes');
});
