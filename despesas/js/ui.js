/** Peças de interface usadas em várias telas. */

import { html, useEffect, useRef, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { formatarReais, formatarComSinal } from './dinheiro.js';
import { rotuloCurtoDoMes, formatarCurta, diasEntre } from './datas.js';
import { situacao } from './resumo.js';
import { rotuloCurto } from './recorrencia.js';
import { nomeDaCategoria, iniciais } from './categorias.js';
import { useApp } from './contexto.js';

/* ---------------------------------------------------------------- ícones (traço de 2 px, 24 × 24) */

const DESENHOS = {
  inicio: () => html`<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path>`,
  sai: () => html`<path d="M7 17 17 7"></path><path d="M8 7h9v9"></path>`,
  entra: () => html`<path d="M17 7 7 17"></path><path d="M16 17H7V8"></path>`,
  mais: () => html`<path d="M12 5v14"></path><path d="M5 12h14"></path>`,
  pessoas: () => html`<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"></path><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"></path><path d="M18 14.3c2.1.8 3.5 2.8 3.5 5.7"></path>`,
  ajustes: () => html`<path d="M4 7h10"></path><path d="M18 7h2"></path><circle cx="16" cy="7" r="2"></circle><path d="M4 17h2"></path><path d="M10 17h10"></path><circle cx="8" cy="17" r="2"></circle>`,
  anterior: () => html`<path d="m15 6-6 6 6 6"></path>`,
  proximo: () => html`<path d="m9 6 6 6-6 6"></path>`,
  fechar: () => html`<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>`,
  check: () => html`<path d="m5 12.5 4.5 4.5L19 7.5"></path>`,
  repetir: () => html`<path d="M17 2.5 21 6.5l-4 4"></path><path d="M3 11.5v-1a4 4 0 0 1 4-4h14"></path><path d="M7 21.5 3 17.5l4-4"></path><path d="M21 12.5v1a4 4 0 0 1-4 4H3"></path>`,
  lixeira: () => html`<path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"></path><path d="M9 7V4h6v3"></path>`,
  editar: () => html`<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="m13 7 4 4"></path>`,
  compartilhar: () => html`<path d="M12 3v12"></path><path d="m8 7 4-4 4 4"></path><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"></path>`,
  baixar: () => html`<path d="M12 4v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path>`,
  enviar: () => html`<path d="M12 20V9"></path><path d="m7 14 5-5 5 5"></path><path d="M5 4h14"></path>`,
  menu: () => html`<circle cx="12" cy="5" r="1.2"></circle><circle cx="12" cy="12" r="1.2"></circle><circle cx="12" cy="19" r="1.2"></circle>`,
  celular: () => html`<rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><path d="M11 18.5h2"></path>`,
  alerta: () => html`<path d="M12 4 2.8 19.5a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5z"></path><path d="M12 10v4.5"></path><path d="M12 17.5v.01"></path>`,
};

/** @param {{ nome: keyof typeof DESENHOS, tamanho?: number, classe?: string }} props */
export function Icone({ nome, tamanho = 22, classe = '' }) {
  const desenho = DESENHOS[nome];
  return html`<svg class=${`icone ${classe}`} viewBox="0 0 24 24" width=${tamanho} height=${tamanho} aria-hidden="true" focusable="false">${desenho ? desenho() : null}</svg>`;
}

/** A marca em versão plana (aparece enquanto o 3D carrega ou se ele não funcionar). */
export function LogoPlana({ classe = '' }) {
  return html`<svg class=${classe} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <rect x="20" y="20" width="200" height="200" rx="46" fill="#24313B"></rect>
    <g fill="none" stroke-width="21" stroke-linecap="round" stroke-linejoin="round">
      <path d="M120 128.75H58.75V67.5" stroke="#7DD3FF"></path>
      <path d="M58.75 128.75 137.5 50" stroke="#7DD3FF"></path>
      <path d="M120 111.25H181.25V172.5" stroke="#F5853B"></path>
      <path d="M181.25 111.25 102.5 190" stroke="#F5853B"></path>
    </g>
  </svg>`;
}

/** Logo 3D interativa. O Three.js só é baixado quando a logo aparece. */
export function Logo3D({ tamanho = 200, rotulo = 'Logo do Controle de Despesas em 3D. Arraste para girar ou toque para dar uma volta.' }) {
  const palco = useRef(null);
  const tela = useRef(null);
  const [com3d, setCom3d] = useState(false);
  useEffect(() => {
    let cancelado = false;
    /** @type {{ destruir: () => void } | null} */
    let controle = null;
    import('./logo3d.js')
      .then((modulo) => {
        if (cancelado || !palco.current || !tela.current) return;
        controle = modulo.montarLogo3D(palco.current, tela.current, { aoPrimeiroQuadro: () => { if (!cancelado) setCom3d(true); } });
      })
      .catch(() => { /* sem 3D: fica a marca plana */ });
    return () => {
      cancelado = true;
      if (controle) controle.destruir();
    };
  }, []);
  return html`<button type="button" ref=${palco} class=${`logo3d${com3d ? ' com-3d' : ''}`} style=${`width:${tamanho}px;height:${tamanho}px`} aria-label=${rotulo}>
    <span class="logo3d-sombra" aria-hidden="true"></span>
    <${LogoPlana} classe="logo3d-plana" />
    <canvas ref=${tela} aria-hidden="true"></canvas>
  </button>`;
}

/* ---------------------------------------------------------------- peças pequenas */

/** @param {{ pessoa: { nome: string, cor: string }, pequeno?: boolean }} props */
export function Avatar({ pessoa, pequeno = false }) {
  return html`<span class=${`avatar${pequeno ? ' pequeno' : ''}`} style=${`background:${pessoa.cor}`} aria-hidden="true">${iniciais(pessoa.nome)}</span>`;
}

export function MesNav({ mes, aoMudar }) {
  return html`<div class="mes-nav" role="group" aria-label="Escolher o mês">
    <button type="button" class="botao-icone" aria-label="Mês anterior" onClick=${() => aoMudar(-1)}><${Icone} nome="anterior" /></button>
    <span class="mes-nav-rotulo" aria-live="polite">${rotuloCurtoDoMes(mes)}</span>
    <button type="button" class="botao-icone" aria-label="Próximo mês" onClick=${() => aoMudar(1)}><${Icone} nome="proximo" /></button>
  </div>`;
}

export function Vazio({ titulo, texto, children }) {
  return html`<div class="vazio">
    <p class="vazio-titulo">${titulo}</p>
    ${texto ? html`<p class="vazio-texto">${texto}</p>` : null}
    ${children}
  </div>`;
}

/**
 * Texto do prazo de uma ocorrência: "vence amanhã, 12/11", "paga em 08/11"...
 * @param {import('./recorrencia.js').Ocorrencia} oc
 * @param {string} hojeISO
 */
export function textoDoPrazo(oc, hojeISO) {
  const despesa = oc.lancamento.tipo === 'despesa';
  if (oc.pagoEm) return `${despesa ? 'paga' : 'recebido'} em ${formatarCurta(oc.pagoEm)}`;
  const n = diasEntre(hojeISO, oc.data);
  const curta = formatarCurta(oc.data);
  if (despesa) {
    if (n === 0) return 'vence hoje';
    if (n === 1) return `vence amanhã, ${curta}`;
    if (n === -1) return `venceu ontem, ${curta}`;
    return n < 0 ? `venceu em ${curta}` : `vence em ${curta}`;
  }
  if (n === 0) return 'previsto para hoje';
  if (n === 1) return `previsto para amanhã, ${curta}`;
  if (n < 0) return `previsto para ${curta}, não recebido`;
  return `previsto para ${curta}`;
}

/**
 * Uma linha de lançamento: botão de pagar/receber à esquerda e o resto abre o detalhe.
 * @param {{ oc: import('./recorrencia.js').Ocorrencia, mostrar?: 'categoria' | 'pessoa' | 'ambos', comSinal?: boolean }} props
 */
export function LinhaOcorrencia({ oc, mostrar = 'categoria', comSinal = false }) {
  const { hojeISO, pessoasPorId, alternarBaixa, abrir } = useApp();
  const lanc = oc.lancamento;
  const despesa = lanc.tipo === 'despesa';
  const sit = situacao(oc, hojeISO);
  const descricao = lanc.descricao;
  const rotuloBaixa = despesa
    ? (sit === 'paga' ? `Desmarcar o pagamento de ${descricao}` : `Marcar ${descricao} como paga`)
    : (sit === 'paga' ? `Desmarcar o recebimento de ${descricao}` : `Marcar ${descricao} como recebido`);
  let anel = 'baixa-anel';
  if (sit === 'paga') anel += ' paga';
  else if (despesa && sit === 'atrasada') anel += ' atrasada';
  else if (!despesa) anel += ' entra';

  const partes = [textoDoPrazo(oc, hojeISO)];
  if (despesa && (mostrar === 'categoria' || mostrar === 'ambos')) partes.push(nomeDaCategoria(lanc.categoria));
  if (!despesa && (mostrar === 'pessoa' || mostrar === 'ambos')) {
    const pessoa = pessoasPorId.get(lanc.pessoaId);
    if (pessoa) partes.push(pessoa.nome);
  }
  let tomValor = '';
  if (sit !== 'paga') tomValor = despesa ? (sit === 'atrasada' ? 'tom-sai' : '') : 'tom-entra';
  const valorTexto = comSinal ? formatarComSinal(oc.valorCentavos, despesa ? 'sai' : 'entra') : formatarReais(oc.valorCentavos);
  const tag = rotuloCurto(oc);
  const repete = lanc.repeticao.tipo === 'semanal' || lanc.repeticao.tipo === 'mensal' || lanc.repeticao.tipo === 'anual';

  return html`<li class=${`linha${sit === 'paga' ? ' paga' : ''}`}>
    <button type="button" class="baixa" aria-pressed=${sit === 'paga' ? 'true' : 'false'} aria-label=${rotuloBaixa} onClick=${() => alternarBaixa(oc)}>
      <span class=${anel}>${sit === 'paga' ? html`<${Icone} nome="check" tamanho=${14} />` : null}</span>
    </button>
    <button type="button" class="linha-corpo" onClick=${() => abrir({ tipo: 'detalhe', lancamentoId: lanc.id, indice: oc.indice })}>
      <span class="linha-texto">
        <span class="linha-titulo">${descricao}</span>
        <span class=${`linha-meta${despesa && sit === 'atrasada' ? ' tom-sai' : ''}`}>${partes.join(' · ')}</span>
      </span>
      <span class="linha-valor">
        <span class=${`valor ${tomValor}`}>${valorTexto}</span>
        ${tag ? html`<span class="linha-tag">${repete ? html`<${Icone} nome="repetir" tamanho=${12} />` : null}${tag}</span>` : null}
      </span>
    </button>
  </li>`;
}

/* ---------------------------------------------------------------- folhas (diálogos) */

let folhasAbertas = 0;

/**
 * Folha que sobe de baixo (ou ocupa a tela toda). Usa <dialog>, que prende o foco e fecha com Esc.
 * @param {{ titulo: string, aoFechar: () => void, cheia?: boolean, children?: any, rodape?: any, rotuloFechar?: string }} props
 */
export function Folha({ titulo, aoFechar, cheia = false, children, rodape, rotuloFechar = 'Fechar' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialogo = /** @type {HTMLDialogElement | null} */ (ref.current);
    if (dialogo && !dialogo.open) {
      try { dialogo.showModal(); } catch (erro) { dialogo.setAttribute('open', ''); }
    }
    folhasAbertas += 1;
    document.documentElement.classList.add('com-folha');
    return () => {
      folhasAbertas -= 1;
      if (folhasAbertas <= 0) document.documentElement.classList.remove('com-folha');
    };
  }, []);
  const aoCancelar = (e) => { e.preventDefault(); aoFechar(); };
  const aoClicar = (e) => { if (e.target === ref.current) aoFechar(); };
  return html`<dialog ref=${ref} class=${`folha${cheia ? ' folha-cheia' : ''}`} aria-label=${titulo} onCancel=${aoCancelar} onClick=${aoClicar}>
    <header class="folha-topo">
      <button type="button" class="botao-icone" aria-label=${rotuloFechar} onClick=${aoFechar}><${Icone} nome="fechar" /></button>
      <h2 class="folha-titulo">${titulo}</h2>
      <span class="espaco-icone" aria-hidden="true"></span>
    </header>
    <div class="folha-corpo">${children}</div>
    ${rodape ? html`<div class="folha-rodape">${rodape}</div>` : null}
  </dialog>`;
}

/** Avisos curtos que somem sozinhos (lidos pelo leitor de tela). */
export function Avisos({ lista }) {
  return html`<div class="avisos" role="status" aria-live="polite">
    ${lista.map((a) => html`<div class="aviso" key=${a.id}>${a.texto}</div>`)}
  </div>`;
}
