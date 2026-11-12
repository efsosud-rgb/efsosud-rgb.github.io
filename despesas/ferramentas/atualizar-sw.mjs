/**
 * Atualiza a lista de arquivos e a VERSAO do service worker (sw.js) a partir do conteúdo da pasta do app.
 *   node ferramentas/atualizar-sw.mjs             → reescreve o bloco gerado do sw.js
 *   node ferramentas/atualizar-sw.mjs --conferir  → só confere; sai com erro se estiver desatualizado
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
/* Fora do cache: o próprio service worker, documentação, testes e ferramentas de desenvolvimento. */
const IGNORAR_NA_RAIZ = new Set(['sw.js', 'README.md', 'package.json', 'testes', 'ferramentas', 'node_modules']);
const IGNORAR_SEMPRE = new Set(['.DS_Store', 'Thumbs.db']);

function listar(pasta) {
  const encontrados = [];
  for (const nome of readdirSync(pasta).sort()) {
    if (IGNORAR_SEMPRE.has(nome) || nome.startsWith('.')) continue;
    const caminho = join(pasta, nome);
    if (pasta === RAIZ.replace(/[\\/]$/, '') || pasta === RAIZ) {
      if (IGNORAR_NA_RAIZ.has(nome)) continue;
    }
    if (statSync(caminho).isDirectory()) encontrados.push(...listar(caminho));
    else encontrados.push(relative(RAIZ, caminho).split(sep).join('/'));
  }
  return encontrados;
}

export function blocoGerado() {
  const arquivos = listar(RAIZ.replace(/[\\/]$/, '')).sort();
  const hash = createHash('sha256');
  for (const arquivo of arquivos) {
    hash.update(arquivo);
    hash.update('\0');
    hash.update(readFileSync(join(RAIZ, arquivo)));
  }
  const versao = hash.digest('hex').slice(0, 12);
  const lista = ['./', ...arquivos.map((a) => `./${a}`)];
  return {
    versao,
    quantidade: lista.length,
    texto: `// <gerado por ferramentas/atualizar-sw.mjs: não edite à mão>\nconst VERSAO = '${versao}';\nconst ARQUIVOS = ${JSON.stringify(lista, null, 2)};\n// </gerado>`,
  };
}

const MARCADORES = /\/\/ <gerado por ferramentas\/atualizar-sw\.mjs: não edite à mão>[\s\S]*?\/\/ <\/gerado>/;

export function swAtualizado() {
  const caminho = join(RAIZ, 'sw.js');
  const atual = readFileSync(caminho, 'utf8');
  if (!MARCADORES.test(atual)) throw new Error('Marcadores do bloco gerado não encontrados no sw.js');
  const bloco = blocoGerado();
  return { caminho, atual, novo: atual.replace(MARCADORES, bloco.texto), bloco };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { caminho, atual, novo, bloco } = swAtualizado();
  if (process.argv.includes('--conferir')) {
    if (novo !== atual) {
      console.error('sw.js desatualizado: rode "node ferramentas/atualizar-sw.mjs".');
      process.exit(1);
    }
    console.log(`sw.js em dia (versão ${bloco.versao}, ${bloco.quantidade} arquivos).`);
  } else {
    writeFileSync(caminho, novo);
    console.log(`sw.js atualizado (versão ${bloco.versao}, ${bloco.quantidade} arquivos).`);
  }
}
