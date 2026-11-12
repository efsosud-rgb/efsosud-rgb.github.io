/**
 * O estado do app em memória, guardado no aparelho a cada mudança.
 * As telas leem com useLoja() e mudam com atualizar(funcao).
 */

import { useEffect, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { carregar, salvar, CHAVE } from './dados.js';

/** @typedef {import('./dados.js').Estado} Estado */

function armazenamentoDoAparelho() {
  try {
    const teste = 'controle-despesas:teste';
    window.localStorage.setItem(teste, '1');
    window.localStorage.removeItem(teste);
    return window.localStorage;
  } catch (erro) {
    return null;
  }
}

const armazenamento = armazenamentoDoAparelho();
const inicial = carregar(armazenamento);
/** @type {Estado} */
let estado = inicial.estado;
/** @type {null | 'sem-armazenamento' | 'ilegivel' | 'itens-ignorados' | 'falha-ao-salvar'} */
let problema = /** @type {any} */ (inicial.problema);
const ignorados = inicial.ignorados;
const ouvintes = new Set();
let pediuPersistencia = false;

const avisarOuvintes = () => ouvintes.forEach((f) => f());

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
function pedirPersistencia() {
  if (pediuPersistencia) return;
  pediuPersistencia = true;
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then((ja) => (ja ? true : navigator.storage.persist())).catch(() => {});
    }
  } catch (erro) { /* navegador sem esse recurso */ }
}

export function obterEstado() {
  return estado;
}

export function obterProblema() {
  return { problema, ignorados };
}

/**
 * Aplica uma mudança e guarda no aparelho.
 * @param {(e: Estado) => Estado} funcao
 */
export function atualizar(funcao) {
  const novo = funcao(estado);
  if (novo === estado) return;
  estado = novo;
  if (salvar(estado, armazenamento)) {
    if (problema === 'falha-ao-salvar') problema = null;
    pedirPersistencia();
  } else {
    problema = armazenamento ? 'falha-ao-salvar' : 'sem-armazenamento';
  }
  avisarOuvintes();
}

export function dispensarProblema() {
  if (problema === 'ilegivel' || problema === 'itens-ignorados') {
    problema = null;
    avisarOuvintes();
  }
}

/* Outra aba ou janela do app mudou os dados: lê de novo. */
window.addEventListener('storage', (e) => {
  if (e.key !== CHAVE || !armazenamento) return;
  estado = carregar(armazenamento).estado;
  avisarOuvintes();
});

/** Hook: devolve o estado atual e redesenha a tela quando ele muda. */
export function useLoja() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    return () => { ouvintes.delete(f); };
  }, []);
  return estado;
}
