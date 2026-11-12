/**
 * Tudo o que muda os dados. Cada função recebe o estado e devolve um estado novo, sem alterar o anterior.
 */

import { dataValida, diaDaSemana, diaDoMes, formatarCompleta, NOMES_DIAS, NOMES_MESES, lerData } from './datas.js';
import { formatarReais } from './dinheiro.js';
import { categoriaValida, corDaPessoa } from './categorias.js';
import { LIMITE_DESCRICAO, LIMITE_NOME, estadoInicial } from './dados.js';
import { dataDaOcorrencia, mesmaRepeticao } from './recorrencia.js';

/**
 * @typedef {import('./dados.js').Estado} Estado
 * @typedef {import('./recorrencia.js').Lancamento} Lancamento
 * @typedef {import('./recorrencia.js').Repeticao} Repeticao
 * @typedef {import('./resumo.js').Pessoa} Pessoa
 * @typedef {{
 *   tipo: 'despesa' | 'recebivel',
 *   valorCentavos: number,
 *   descricao: string,
 *   categoria: string,
 *   pessoaId: string,
 *   data: string,
 *   repetir: 'nao' | 'semanal' | 'mensal' | 'anual' | 'parcelado',
 *   fim: 'nunca' | 'vezes' | 'data',
 *   vezes: string,
 *   ate: string,
 *   parcelas: string,
 *   jaPago: boolean
 * }} Formulario
 * @typedef {{ tipo: 'despesa' | 'recebivel', descricao: string, valorCentavos: number, categoria: string | null,
 *   pessoaId: string | null, data: string, repeticao: Repeticao }} CamposLancamento
 */

/** @param {string} prefixo */
export function novoId(prefixo) {
  const aleatorio = globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefixo}_${aleatorio}`;
}

/* ---------------------------------------------------------------- formulário */

/**
 * Formulário vazio para um lançamento novo.
 * @param {'despesa' | 'recebivel'} tipo
 * @param {string} hojeISO
 * @param {Pessoa[]} pessoas
 * @returns {Formulario}
 */
export function formularioNovo(tipo, hojeISO, pessoas) {
  const eu = pessoas.find((p) => p.eu);
  const pessoaId = pessoas.length === 1 ? pessoas[0].id : (eu ? eu.id : '');
  return {
    tipo,
    valorCentavos: 0,
    descricao: '',
    categoria: '',
    pessoaId,
    data: hojeISO,
    repetir: 'nao',
    fim: 'nunca',
    vezes: '',
    ate: '',
    parcelas: '',
    jaPago: false,
  };
}

/**
 * Formulário preenchido com um lançamento que já existe.
 * @param {Lancamento} lanc
 * @returns {Formulario}
 */
export function formularioDe(lanc) {
  const r = lanc.repeticao;
  return {
    tipo: lanc.tipo,
    valorCentavos: lanc.valorCentavos,
    descricao: lanc.descricao,
    categoria: lanc.categoria || '',
    pessoaId: lanc.pessoaId || '',
    data: lanc.data,
    repetir: r.tipo,
    fim: r.tipo === 'semanal' || r.tipo === 'mensal' || r.tipo === 'anual' ? r.fim.tipo : 'nunca',
    vezes: (r.tipo === 'semanal' || r.tipo === 'mensal' || r.tipo === 'anual') && r.fim.tipo === 'vezes' ? String(r.fim.vezes) : '',
    ate: (r.tipo === 'semanal' || r.tipo === 'mensal' || r.tipo === 'anual') && r.fim.tipo === 'data' ? r.fim.data : '',
    parcelas: r.tipo === 'parcelado' ? String(r.parcelas) : '',
    jaPago: false,
  };
}

/**
 * @param {string} texto
 * @param {number} min
 * @param {number} max
 */
function inteiroEntre(texto, min, max) {
  const limpo = String(texto).trim();
  if (!/^\d+$/.test(limpo)) return null;
  const n = Number(limpo);
  return n >= min && n <= max ? n : null;
}

/**
 * Confere o formulário. Devolve os erros por campo e, se não houver erro, os campos do lançamento.
 * @param {Formulario} f
 * @param {Pessoa[]} pessoas
 * @returns {{ erros: Partial<Record<'valor' | 'descricao' | 'pessoa' | 'data' | 'vezes' | 'ate' | 'parcelas', string>>, campos: CamposLancamento | null }}
 */
export function validarFormulario(f, pessoas) {
  /** @type {Partial<Record<'valor' | 'descricao' | 'pessoa' | 'data' | 'vezes' | 'ate' | 'parcelas', string>>} */
  const erros = {};
  if (!(f.valorCentavos > 0)) erros.valor = 'Informe um valor maior que zero.';
  const descricao = f.descricao.trim();
  if (!descricao) erros.descricao = 'Escreva uma descrição.';
  else if (descricao.length > LIMITE_DESCRICAO) erros.descricao = `Use até ${LIMITE_DESCRICAO} letras.`;
  if (f.tipo === 'recebivel' && !pessoas.some((p) => p.id === f.pessoaId)) {
    erros.pessoa = pessoas.length ? 'Escolha quem recebe.' : 'Cadastre quem recebe: toque em Nova pessoa.';
  }
  if (!dataValida(f.data)) erros.data = 'Escolha a data.';

  /** @type {Repeticao} */
  let repeticao = { tipo: 'nao' };
  if (f.repetir === 'parcelado') {
    const n = inteiroEntre(f.parcelas, 2, 360);
    if (n === null) erros.parcelas = 'Informe de 2 a 360 parcelas.';
    else repeticao = { tipo: 'parcelado', parcelas: n };
  } else if (f.repetir === 'semanal' || f.repetir === 'mensal' || f.repetir === 'anual') {
    if (f.fim === 'vezes') {
      const n = inteiroEntre(f.vezes, 2, 999);
      if (n === null) erros.vezes = 'Informe de 2 a 999 vezes.';
      else repeticao = { tipo: f.repetir, fim: { tipo: 'vezes', vezes: n } };
    } else if (f.fim === 'data') {
      if (!dataValida(f.ate)) erros.ate = 'Escolha a data final.';
      else if (dataValida(f.data) && f.ate < f.data) erros.ate = 'A data final precisa ser igual ou depois da primeira data.';
      else repeticao = { tipo: f.repetir, fim: { tipo: 'data', data: f.ate } };
    } else {
      repeticao = { tipo: f.repetir, fim: { tipo: 'nunca' } };
    }
  }

  if (Object.keys(erros).length) return { erros, campos: null };
  return {
    erros,
    campos: {
      tipo: f.tipo,
      descricao,
      valorCentavos: f.valorCentavos,
      categoria: f.tipo === 'despesa' ? (categoriaValida(f.categoria) ? f.categoria : 'outras') : null,
      pessoaId: f.tipo === 'recebivel' ? f.pessoaId : null,
      data: f.data,
      repeticao,
    },
  };
}

/**
 * Frase que explica a repetição escolhida, embaixo das opções.
 * @param {Formulario} f
 */
export function explicarRepeticao(f) {
  const despesa = f.tipo === 'despesa';
  if (!lerData(f.data)) return '';
  const dia = diaDoMes(f.data);
  if (f.repetir === 'nao') return despesa ? 'Lançamento único, na data de vencimento.' : 'Recebimento único, na data prevista.';
  if (f.repetir === 'parcelado') {
    const n = inteiroEntre(f.parcelas, 2, 360);
    if (n === null || !(f.valorCentavos > 0)) return 'Uma parcela por mês, a partir da primeira data. O valor acima é o de cada parcela.';
    const ultima = dataDaOcorrencia(/** @type {Lancamento} */ ({ data: f.data, repeticao: { tipo: 'parcelado', parcelas: n } }), n - 1);
    return `${n} parcelas de ${formatarReais(f.valorCentavos)}, de ${formatarCompleta(f.data)} a ${formatarCompleta(/** @type {string} */ (ultima))}. Total: ${formatarReais(f.valorCentavos * n)}.`;
  }
  let frase = '';
  if (f.repetir === 'semanal') {
    const ds = diaDaSemana(f.data);
    frase = `Repete ${ds === 0 || ds === 6 ? 'todo' : 'toda'} ${NOMES_DIAS[ds]}.`;
  } else if (f.repetir === 'mensal') {
    frase = `Repete todo mês, no dia ${dia}.${dia > 28 ? ' Nos meses mais curtos, no último dia.' : ''}`;
  } else {
    const partes = /** @type {{ mes0: number }} */ (lerData(f.data));
    frase = `Repete todo ano, em ${dia} de ${NOMES_MESES[partes.mes0]}.`;
  }
  if (f.fim === 'vezes') {
    const n = inteiroEntre(f.vezes, 2, 999);
    if (n !== null) {
      const ultima = dataDaOcorrencia(/** @type {Lancamento} */ ({ data: f.data, repeticao: { tipo: f.repetir, fim: { tipo: 'vezes', vezes: n } } }), n - 1);
      frase += ` São ${n} vezes, a última em ${formatarCompleta(/** @type {string} */ (ultima))}.`;
    }
  } else if (f.fim === 'data' && dataValida(f.ate) && f.ate >= f.data) {
    frase += ` Até ${formatarCompleta(f.ate)}.`;
  }
  return frase;
}

/* ---------------------------------------------------------------- lançamentos */

/**
 * @param {Estado} estado
 * @param {string} id
 * @param {(l: Lancamento) => Lancamento | null} mudar  devolve null para apagar o lançamento
 * @returns {Estado}
 */
function mudarLancamento(estado, id, mudar) {
  const lancamentos = [];
  let mudou = false;
  for (const l of estado.lancamentos) {
    if (l.id !== id) { lancamentos.push(l); continue; }
    mudou = true;
    const novo = mudar(l);
    if (novo) lancamentos.push(novo);
  }
  return mudou ? { ...estado, lancamentos } : estado;
}

/**
 * Cria um lançamento novo ou salva as mudanças de um existente.
 * Ao editar, pagamentos e ajustes continuam valendo para as mesmas ocorrências;
 * se a regra de repetição mudou, um "encerrar a partir desta" anterior deixa de valer.
 * @param {Estado} estado
 * @param {CamposLancamento} campos
 * @param {{ id?: string | null, agoraISO: string, novoId?: string, pagoEm?: string | null }} opcoes
 * @returns {Estado}
 */
export function salvarLancamento(estado, campos, opcoes) {
  if (opcoes.id) {
    return mudarLancamento(estado, opcoes.id, (l) => ({
      ...l,
      descricao: campos.descricao,
      valorCentavos: campos.valorCentavos,
      categoria: l.tipo === 'despesa' ? campos.categoria : null,
      pessoaId: l.tipo === 'recebivel' ? campos.pessoaId : null,
      data: campos.data,
      repeticao: campos.repeticao,
      corte: mesmaRepeticao(l.repeticao, campos.repeticao) ? l.corte : null,
      atualizadoEm: opcoes.agoraISO,
    }));
  }
  /** @type {Lancamento} */
  const novo = {
    id: opcoes.novoId || novoId('l'),
    ...campos,
    baixas: opcoes.pagoEm ? { 0: opcoes.pagoEm } : {},
    excluidas: [],
    ajustes: {},
    corte: null,
    criadoEm: opcoes.agoraISO,
    atualizadoEm: opcoes.agoraISO,
  };
  return { ...estado, lancamentos: [...estado.lancamentos, novo] };
}

/**
 * Marca como paga (ou recebida) hoje; se já estava, desmarca.
 * @param {Estado} estado
 * @param {string} id
 * @param {number} indice
 * @param {string} hojeISO
 */
export function alternarBaixa(estado, id, indice, hojeISO) {
  return mudarLancamento(estado, id, (l) => {
    const baixas = { ...l.baixas };
    if (baixas[indice]) delete baixas[indice];
    else baixas[indice] = hojeISO;
    return { ...l, baixas };
  });
}

/**
 * Valor diferente só nesta ocorrência. `centavos` null volta ao valor normal.
 * @param {Estado} estado
 * @param {string} id
 * @param {number} indice
 * @param {number | null} centavos
 */
export function ajustarValor(estado, id, indice, centavos) {
  return mudarLancamento(estado, id, (l) => {
    const ajustes = { ...l.ajustes };
    if (centavos === null || centavos === l.valorCentavos) delete ajustes[indice];
    else ajustes[indice] = { valorCentavos: centavos };
    return { ...l, ajustes };
  });
}

/**
 * Apaga só esta ocorrência. Num lançamento que não repete, apaga o lançamento.
 * @param {Estado} estado
 * @param {string} id
 * @param {number} indice
 */
export function excluirOcorrencia(estado, id, indice) {
  return mudarLancamento(estado, id, (l) => {
    if (l.repeticao.tipo === 'nao') return null;
    return { ...l, excluidas: [...new Set([...l.excluidas, indice])].sort((a, b) => a - b) };
  });
}

/**
 * Apaga esta ocorrência e as próximas. Na primeira, apaga o lançamento inteiro.
 * @param {Estado} estado
 * @param {string} id
 * @param {number} indice
 */
export function encerrarAPartirDe(estado, id, indice) {
  return mudarLancamento(estado, id, (l) => (indice <= 0 ? null : { ...l, corte: l.corte == null ? indice : Math.min(l.corte, indice) }));
}

/**
 * @param {Estado} estado
 * @param {string} id
 */
export function excluirLancamento(estado, id) {
  return mudarLancamento(estado, id, () => null);
}

/* ---------------------------------------------------------------- pessoas */

/** @param {string} nome */
export function validarNome(nome) {
  const limpo = nome.trim();
  if (!limpo) return 'Escreva o nome.';
  if (limpo.length > LIMITE_NOME) return `Use até ${LIMITE_NOME} letras.`;
  return null;
}

/**
 * @param {Estado} estado
 * @param {{ id: string, nome: string, eu?: boolean, agoraISO: string }} dados
 * @returns {Estado}
 */
export function adicionarPessoa(estado, dados) {
  const usadas = new Set(estado.pessoas.map((p) => p.cor));
  let cor = corDaPessoa(estado.pessoas.length);
  for (let i = 0; i < 6; i += 1) {
    if (!usadas.has(corDaPessoa(i))) { cor = corDaPessoa(i); break; }
  }
  const pessoas = estado.pessoas.map((p) => (dados.eu ? { ...p, eu: false } : p));
  pessoas.push({ id: dados.id, nome: dados.nome.trim().slice(0, LIMITE_NOME), cor, eu: Boolean(dados.eu), criadoEm: dados.agoraISO });
  return { ...estado, pessoas };
}

/**
 * @param {Estado} estado
 * @param {string} id
 * @param {{ nome: string, eu: boolean }} dados
 */
export function editarPessoa(estado, id, dados) {
  return {
    ...estado,
    pessoas: estado.pessoas.map((p) => {
      if (p.id === id) return { ...p, nome: dados.nome.trim().slice(0, LIMITE_NOME), eu: dados.eu };
      return dados.eu ? { ...p, eu: false } : p;
    }),
  };
}

/**
 * Remove a pessoa e os recebíveis dela.
 * @param {Estado} estado
 * @param {string} id
 */
export function removerPessoa(estado, id) {
  return {
    ...estado,
    pessoas: estado.pessoas.filter((p) => p.id !== id),
    lancamentos: estado.lancamentos.filter((l) => !(l.tipo === 'recebivel' && l.pessoaId === id)),
  };
}

/* ---------------------------------------------------------------- preferências e backup */

/**
 * @param {Estado} estado
 * @param {{ nome: string, id: string, agoraISO: string }} dados  nome vazio = não cadastra ninguém
 */
export function concluirBoasVindas(estado, dados) {
  const comPessoa = dados.nome.trim() ? adicionarPessoa(estado, { id: dados.id, nome: dados.nome, eu: true, agoraISO: dados.agoraISO }) : estado;
  return { ...comPessoa, preferencias: { ...comPessoa.preferencias, boasVindasConcluidas: true } };
}

/** @param {Estado} estado */
export function fecharAvisoInstalar(estado) {
  return { ...estado, preferencias: { ...estado.preferencias, avisoInstalarFechado: true } };
}

/**
 * @param {Estado} estado
 * @param {string} agoraISO
 */
export function marcarBackup(estado, agoraISO) {
  return { ...estado, preferencias: { ...estado.preferencias, ultimoBackup: agoraISO } };
}

/**
 * Troca todos os dados pelos do backup, mantendo as preferências deste aparelho.
 * @param {Estado} estado
 * @param {{ pessoas: Pessoa[], lancamentos: Lancamento[] }} backup
 */
export function restaurarBackup(estado, backup) {
  return { ...estado, pessoas: backup.pessoas, lancamentos: backup.lancamentos, preferencias: { ...estado.preferencias, boasVindasConcluidas: true } };
}

/** Apaga tudo e volta para a tela de boas-vindas. */
export function apagarTudo() {
  return estadoInicial();
}
