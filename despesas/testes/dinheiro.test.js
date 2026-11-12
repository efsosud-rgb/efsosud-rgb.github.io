import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarReais, formatarNumero, formatarSaldo, formatarComSinal, centavosDoTexto, textoDoCampo, centavosValidos } from '../js/dinheiro.js';

const NBSP = ' ';

test('formata em reais', () => {
  assert.equal(formatarReais(123456), `R$${NBSP}1.234,56`);
  assert.equal(formatarReais(5), `R$${NBSP}0,05`);
  assert.equal(formatarReais(100000000), `R$${NBSP}1.000.000,00`);
  assert.equal(formatarNumero(180000), '1.800,00');
});

test('saldo negativo usa o sinal de menos', () => {
  assert.equal(formatarSaldo(-2500), `−R$${NBSP}25,00`);
  assert.equal(formatarSaldo(2500), `R$${NBSP}25,00`);
  assert.equal(formatarComSinal(45000, 'sai'), `− R$${NBSP}450,00`);
  assert.equal(formatarComSinal(100000, 'entra'), `+ R$${NBSP}1.000,00`);
});

test('campo de valor: dígitos entram pela direita', () => {
  assert.equal(centavosDoTexto('1'), 1);
  assert.equal(centavosDoTexto('12'), 12);
  assert.equal(centavosDoTexto('1234'), 1234);
  assert.equal(centavosDoTexto('12,345'), 12345);
  assert.equal(centavosDoTexto('R$ 1.800,00'), 180000);
  assert.equal(centavosDoTexto('0,05'), 5);
  assert.equal(centavosDoTexto(''), 0);
  assert.equal(centavosDoTexto('abc'), 0);
  assert.equal(centavosDoTexto('999999999999999'), 99999999999, 'limita a 11 dígitos');
  assert.equal(textoDoCampo(0), '');
  assert.equal(textoDoCampo(1234), '12,34');
});

test('centavos válidos', () => {
  assert.equal(centavosValidos(1), true);
  assert.equal(centavosValidos(0), false);
  assert.equal(centavosValidos(-5), false);
  assert.equal(centavosValidos(1.5), false);
  assert.equal(centavosValidos('100'), false);
  assert.equal(centavosValidos(1e11), false);
});
