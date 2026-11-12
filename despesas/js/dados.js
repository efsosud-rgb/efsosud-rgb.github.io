/**
 * Onde e como os dados ficam guardados: só neste aparelho (localStorage), sem conta e sem servidor.
 * Também confere e lê os arquivos de backup.
 */

import { dataValida } from './datas.js';
import { centavosValidos } from './dinheiro.js';
import { categoriaValida, corDaPessoa } from './categorias.js';

/**
 * @typedef {import('./recorrencia.js').Lancamento} Lancamento
 * @typedef {import('./recorrencia.js').Repeticao} Repeticao
 * @typedef {import('./resumo.js').Pessoa} Pessoa
 * @typedef {{ boasVindasConcluidas: boolean, ultimoBackup: string | null, avisoInstalarFechado: boolean }} Preferencias
 * @typedef {{ versao: 1, pessoas: Pessoa[], lancamentos: Lancamento[], preferencias: Preferencias }} Estado
 * @typedef {{ getItem(chave: string): string | null, setItem(chave: string, valor: string): void }} Armazenamento
 */

export const CHAVE = 'controle-despesas:v1';
export const CHAVE_COPIA_ILEGIVEL = 'controle-despesas:v1:copia-ilegivel';
export const NOME_APP = 'controle-despesas';
export const FORMATO_BACKUP = 1;
export const LIMITE_DESCRICAO = 60;
export const LIMITE_NOME = 40;

/** @returns {Estado} */
export function estadoInicial() {
  return {
    versao: 1,
    pessoas: [],
    lancamentos: [],
    preferencias: { boasVindasConcluidas: false, ultimoBackup: null, avisoInstalarFechado: false },
  };
}

/** @param {unknown} v */
function ehObjeto(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** @param {unknown} v */
function ehIndice(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 100000;
}

/** @param {unknown} v @param {string} padrao */
function textoOu(v, padrao) {
  return typeof v === 'string' && v ? v : padrao;
}

/**
 * Confere uma pessoa. Lança erro com o motivo se não der para usar.
 * @param {unknown} p
 * @param {number} posicao
 * @returns {Pessoa}
 */
export function normalizarPessoa(p, posicao) {
  if (!ehObjeto(p)) throw new Error('pessoa sem dados');
  const o = /** @type {Record<string, unknown>} */ (p);
  if (typeof o.id !== 'string' || !o.id) throw new Error('pessoa sem identificador');
  const nome = typeof o.nome === 'string' ? o.nome.trim().slice(0, LIMITE_NOME) : '';
  if (!nome) throw new Error('pessoa sem nome');
  return {
    id: o.id,
    nome,
    cor: typeof o.cor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(o.cor) ? o.cor : corDaPessoa(posicao),
    eu: o.eu === true,
    criadoEm: textoOu(o.criadoEm, new Date(0).toISOString()),
  };
}

/**
 * @param {unknown} r
 * @param {string} dataInicial
 * @returns {Repeticao}
 */
function normalizarRepeticao(r, dataInicial) {
  if (!ehObjeto(r)) throw new Error('repetição inválida');
  const o = /** @type {Record<string, unknown>} */ (r);
  if (o.tipo === 'nao') return { tipo: 'nao' };
  if (o.tipo === 'parcelado') {
    const n = o.parcelas;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 2 || n > 360) throw new Error('número de parcelas inválido');
    return { tipo: 'parcelado', parcelas: n };
  }
  if (o.tipo === 'semanal' || o.tipo === 'mensal' || o.tipo === 'anual') {
    const fim = ehObjeto(o.fim) ? /** @type {Record<string, unknown>} */ (o.fim) : { tipo: 'nunca' };
    if (fim.tipo === 'vezes') {
      const n = fim.vezes;
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 2 || n > 999) throw new Error('quantidade de vezes inválida');
      return { tipo: o.tipo, fim: { tipo: 'vezes', vezes: n } };
    }
    if (fim.tipo === 'data') {
      if (!dataValida(fim.data) || /** @type {string} */ (fim.data) < dataInicial) throw new Error('data final inválida');
      return { tipo: o.tipo, fim: { tipo: 'data', data: /** @type {string} */ (fim.data) } };
    }
    return { tipo: o.tipo, fim: { tipo: 'nunca' } };
  }
  throw new Error('tipo de repetição desconhecido');
}

/**
 * Confere um lançamento. Lança erro com o motivo se não der para usar.
 * @param {unknown} l
 * @param {Set<string>} idsPessoas
 * @returns {Lancamento}
 */
export function normalizarLancamento(l, idsPessoas) {
  if (!ehObjeto(l)) throw new Error('lançamento sem dados');
  const o = /** @type {Record<string, unknown>} */ (l);
  if (typeof o.id !== 'string' || !o.id) throw new Error('lançamento sem identificador');
  if (o.tipo !== 'despesa' && o.tipo !== 'recebivel') throw new Error('tipo de lançamento desconhecido');
  const descricao = typeof o.descricao === 'string' ? o.descricao.trim().slice(0, LIMITE_DESCRICAO) : '';
  if (!descricao) throw new Error('lançamento sem descrição');
  if (!centavosValidos(o.valorCentavos)) throw new Error('valor inválido');
  if (!dataValida(o.data)) throw new Error('data inválida');
  const data = /** @type {string} */ (o.data);
  const repeticao = normalizarRepeticao(o.repeticao, data);

  let pessoaId = null;
  let categoria = null;
  if (o.tipo === 'recebivel') {
    if (typeof o.pessoaId !== 'string' || !idsPessoas.has(o.pessoaId)) throw new Error('recebível sem pessoa cadastrada');
    pessoaId = o.pessoaId;
  } else {
    categoria = categoriaValida(o.categoria) ? /** @type {string} */ (o.categoria) : 'outras';
  }

  /** @type {Record<string, string>} */
  const baixas = {};
  if (ehObjeto(o.baixas)) {
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (o.baixas))) {
      if (ehIndice(Number(k)) && dataValida(v)) baixas[String(Number(k))] = /** @type {string} */ (v);
    }
  }
  /** @type {Record<string, { valorCentavos: number }>} */
  const ajustes = {};
  if (ehObjeto(o.ajustes)) {
    for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (o.ajustes))) {
      const valor = ehObjeto(v) ? /** @type {Record<string, unknown>} */ (v).valorCentavos : undefined;
      if (ehIndice(Number(k)) && centavosValidos(valor)) ajustes[String(Number(k))] = { valorCentavos: /** @type {number} */ (valor) };
    }
  }
  const excluidas = Array.isArray(o.excluidas) ? [...new Set(o.excluidas.filter(ehIndice))].sort((a, b) => a - b) : [];
  const corte = ehIndice(o.corte) ? /** @type {number} */ (o.corte) : null;
  const agora = new Date(0).toISOString();
  return {
    id: o.id,
    tipo: o.tipo,
    descricao,
    valorCentavos: /** @type {number} */ (o.valorCentavos),
    categoria,
    pessoaId,
    data,
    repeticao,
    baixas,
    excluidas,
    ajustes,
    corte,
    criadoEm: textoOu(o.criadoEm, agora),
    atualizadoEm: textoOu(o.atualizadoEm, textoOu(o.criadoEm, agora)),
  };
}

/**
 * Lê os dados guardados. Itens que não puderem ser lidos são deixados de fora e contados,
 * sem perder os demais. Se o conteúdo inteiro estiver ilegível, uma cópia dele é guardada à parte.
 * @param {Armazenamento | null} armazenamento
 * @returns {{ estado: Estado, ignorados: number, problema: string | null }}
 */
export function carregar(armazenamento) {
  if (!armazenamento) return { estado: estadoInicial(), ignorados: 0, problema: 'sem-armazenamento' };
  let texto = null;
  try {
    texto = armazenamento.getItem(CHAVE);
  } catch (erro) {
    return { estado: estadoInicial(), ignorados: 0, problema: 'sem-armazenamento' };
  }
  if (!texto) return { estado: estadoInicial(), ignorados: 0, problema: null };
  let bruto;
  try {
    bruto = JSON.parse(texto);
    if (!ehObjeto(bruto)) throw new Error('formato');
  } catch (erro) {
    try { armazenamento.setItem(CHAVE_COPIA_ILEGIVEL, texto); } catch (e) { /* sem espaço para a cópia */ }
    return { estado: estadoInicial(), ignorados: 0, problema: 'ilegivel' };
  }
  const o = /** @type {Record<string, unknown>} */ (bruto);
  const estado = estadoInicial();
  let ignorados = 0;
  const pessoasBrutas = Array.isArray(o.pessoas) ? o.pessoas : [];
  pessoasBrutas.forEach((p, i) => {
    try {
      const pessoa = normalizarPessoa(p, i);
      if (!estado.pessoas.some((x) => x.id === pessoa.id)) estado.pessoas.push(pessoa);
    } catch (erro) {
      ignorados += 1;
    }
  });
  const ids = new Set(estado.pessoas.map((p) => p.id));
  const lancamentosBrutos = Array.isArray(o.lancamentos) ? o.lancamentos : [];
  for (const l of lancamentosBrutos) {
    try {
      const lanc = normalizarLancamento(l, ids);
      if (!estado.lancamentos.some((x) => x.id === lanc.id)) estado.lancamentos.push(lanc);
    } catch (erro) {
      ignorados += 1;
    }
  }
  const pref = ehObjeto(o.preferencias) ? /** @type {Record<string, unknown>} */ (o.preferencias) : {};
  estado.preferencias = {
    boasVindasConcluidas: pref.boasVindasConcluidas === true,
    ultimoBackup: typeof pref.ultimoBackup === 'string' ? pref.ultimoBackup : null,
    avisoInstalarFechado: pref.avisoInstalarFechado === true,
  };
  if (ignorados > 0) {
    try { armazenamento.setItem(CHAVE_COPIA_ILEGIVEL, texto); } catch (e) { /* sem espaço para a cópia */ }
  }
  return { estado, ignorados, problema: ignorados > 0 ? 'itens-ignorados' : null };
}

/**
 * @param {Estado} estado
 * @param {Armazenamento | null} armazenamento
 * @returns {boolean} se conseguiu guardar
 */
export function salvar(estado, armazenamento) {
  if (!armazenamento) return false;
  try {
    armazenamento.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch (erro) {
    return false;
  }
}

/**
 * Conteúdo do arquivo de backup.
 * @param {Estado} estado
 * @param {string} agoraISO
 */
export function gerarBackup(estado, agoraISO) {
  return JSON.stringify({
    app: NOME_APP,
    formato: FORMATO_BACKUP,
    exportadoEm: agoraISO,
    pessoas: estado.pessoas,
    lancamentos: estado.lancamentos,
  }, null, 2);
}

/**
 * Lê um arquivo de backup. Só aceita o arquivo inteiro: se algo estiver errado, nada é importado.
 * @param {string} texto
 * @returns {{ ok: true, pessoas: Pessoa[], lancamentos: Lancamento[], exportadoEm: string | null } | { ok: false, motivo: string }}
 */
export function lerBackup(texto) {
  let bruto;
  try {
    bruto = JSON.parse(texto);
  } catch (erro) {
    return { ok: false, motivo: 'O arquivo não é um backup deste app (não está no formato JSON).' };
  }
  if (!ehObjeto(bruto) || bruto.app !== NOME_APP) {
    return { ok: false, motivo: 'O arquivo não é um backup do Controle de Despesas.' };
  }
  if (bruto.formato !== FORMATO_BACKUP) {
    return { ok: false, motivo: 'Este backup é de uma versão do app que esta versão não sabe ler.' };
  }
  try {
    /** @type {unknown[]} */
    const pessoasBrutas = Array.isArray(bruto.pessoas) ? bruto.pessoas : [];
    const pessoas = pessoasBrutas.map((p, i) => normalizarPessoa(p, i));
    const ids = new Set(pessoas.map((p) => p.id));
    if (ids.size !== pessoas.length) throw new Error('pessoas repetidas');
    /** @type {unknown[]} */
    const lancamentosBrutos = Array.isArray(bruto.lancamentos) ? bruto.lancamentos : [];
    const lancamentos = lancamentosBrutos.map((l) => normalizarLancamento(l, ids));
    if (new Set(lancamentos.map((l) => l.id)).size !== lancamentos.length) throw new Error('lançamentos repetidos');
    const exportadoEm = typeof bruto.exportadoEm === 'string' ? bruto.exportadoEm : null;
    return { ok: true, pessoas, lancamentos, exportadoEm };
  } catch (erro) {
    return { ok: false, motivo: `O backup está incompleto ou foi alterado (${/** @type {Error} */ (erro).message}). Nada foi importado.` };
  }
}
