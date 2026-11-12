import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swAtualizado } from '../ferramentas/atualizar-sw.mjs';

test('o service worker lista a versão atual dos arquivos (rode node ferramentas/atualizar-sw.mjs se falhar)', () => {
  const { atual, novo, bloco } = swAtualizado();
  assert.ok(bloco.quantidade > 10, 'lista de arquivos do app');
  assert.equal(atual, novo);
});
