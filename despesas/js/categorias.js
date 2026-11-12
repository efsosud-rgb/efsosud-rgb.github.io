/** Categorias de despesa e cores das pessoas da família. */

export const CATEGORIAS = [
  { id: 'moradia', nome: 'Moradia' },
  { id: 'alimentacao', nome: 'Alimentação' },
  { id: 'contas', nome: 'Contas' },
  { id: 'transporte', nome: 'Transporte' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'educacao', nome: 'Educação' },
  { id: 'lazer', nome: 'Lazer' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'outras', nome: 'Outras' },
];

const IDS = new Set(CATEGORIAS.map((c) => c.id));

/** @param {unknown} id */
export function categoriaValida(id) {
  return typeof id === 'string' && IDS.has(id);
}

/** @param {string | null} id */
export function nomeDaCategoria(id) {
  const categoria = CATEGORIAS.find((c) => c.id === id);
  return categoria ? categoria.nome : 'Outras';
}

/** Cores claras, para o texto escuro das iniciais ficar legível. O laranja das saídas fica de fora. */
export const CORES_PESSOAS = ['#7DD3FF', '#5FD4B0', '#B9A6FF', '#FFD166', '#F29BC1', '#A9C1CF'];

/** @param {number} posicao */
export function corDaPessoa(posicao) {
  return CORES_PESSOAS[posicao % CORES_PESSOAS.length];
}

/** @param {string} nome  ex.: "Ana Paula Souza" → "AS" */
export function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : (primeira[1] || '');
  return (primeira[0] + segunda).toUpperCase();
}
