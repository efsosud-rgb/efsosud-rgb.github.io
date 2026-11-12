import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lerData, somarMeses, somarDias, diasEntre, mesesEntre, diaDaSemana, hoje, formatarCurta, formatarCompleta,
  formatarComDiaDaSemana, rotuloDoMes, rotuloCurtoDoMes, somarMesesAoMes, primeiroDia, ultimoDia, capitalizar,
} from '../js/datas.js';

test('lerData aceita só datas que existem', () => {
  assert.deepEqual(lerData('2026-11-12'), { ano: 2026, mes0: 10, dia: 12 });
  assert.equal(lerData('2026-02-29'), null);
  assert.deepEqual(lerData('2028-02-29'), { ano: 2028, mes0: 1, dia: 29 });
  assert.equal(lerData('2026-13-01'), null);
  assert.equal(lerData('2026-11-31'), null);
  assert.equal(lerData('12/11/2026'), null);
  assert.equal(lerData(''), null);
  assert.equal(lerData(null), null);
});

test('somarMeses mantém o dia e usa o último dia nos meses curtos, sem escorregar', () => {
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(somarMeses('2026-01-31', 2), '2026-03-31');
  assert.equal(somarMeses('2026-01-31', 3), '2026-04-30');
  assert.equal(somarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(somarMeses('2026-11-15', 2), '2027-01-15');
  assert.equal(somarMeses('2026-03-31', -1), '2026-02-28');
  assert.equal(somarMeses('2024-02-29', 12), '2025-02-28');
  assert.equal(somarMeses('2024-02-29', 48), '2028-02-29');
});

test('somarDias e diasEntre atravessam virada de mês e de ano', () => {
  assert.equal(somarDias('2026-12-28', 7), '2027-01-04');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(diasEntre('2026-11-01', '2026-11-12'), 11);
  assert.equal(diasEntre('2026-11-12', '2026-11-01'), -11);
  assert.equal(diasEntre('2026-10-15', '2026-10-22'), 7);
});

test('mesesEntre ignora o dia', () => {
  assert.equal(mesesEntre('2026-01-31', '2026-02-01'), 1);
  assert.equal(mesesEntre('2026-11-12', '2027-01-05'), 2);
  assert.equal(mesesEntre('2026-11-12', '2026-11-30'), 0);
});

test('dia da semana', () => {
  assert.equal(diaDaSemana('2026-11-12'), 4); // quinta-feira
  assert.equal(diaDaSemana('2026-11-15'), 0); // domingo
});

test('hoje usa a data local do aparelho', () => {
  assert.equal(hoje(new Date(2026, 10, 12, 23, 59)), '2026-11-12');
  assert.equal(hoje(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});

test('formatação em português', () => {
  assert.equal(formatarCurta('2026-11-05'), '05/11');
  assert.equal(formatarCompleta('2026-11-05'), '05/11/2026');
  assert.equal(formatarComDiaDaSemana('2026-11-12'), 'quinta-feira, 12/11/2026');
  assert.equal(rotuloDoMes({ ano: 2026, mes0: 10 }, { ano: 2026, mes0: 0 }), 'novembro');
  assert.equal(rotuloDoMes({ ano: 2027, mes0: 0 }, { ano: 2026, mes0: 10 }), 'janeiro de 2027');
  assert.equal(rotuloCurtoDoMes({ ano: 2026, mes0: 2 }), 'mar 2026');
  assert.equal(capitalizar('novembro'), 'Novembro');
});

test('meses: soma, primeiro e último dia', () => {
  assert.deepEqual(somarMesesAoMes({ ano: 2026, mes0: 11 }, 1), { ano: 2027, mes0: 0 });
  assert.deepEqual(somarMesesAoMes({ ano: 2026, mes0: 0 }, -1), { ano: 2025, mes0: 11 });
  assert.deepEqual(somarMesesAoMes({ ano: 2026, mes0: 10 }, -12), { ano: 2025, mes0: 10 });
  assert.equal(primeiroDia({ ano: 2026, mes0: 1 }), '2026-02-01');
  assert.equal(ultimoDia({ ano: 2026, mes0: 1 }), '2026-02-28');
  assert.equal(ultimoDia({ ano: 2028, mes0: 1 }), '2028-02-29');
});
