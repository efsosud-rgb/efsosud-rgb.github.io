/**
 * Controle de Despesas: ponto de entrada.
 * Liga as telas, as abas, as folhas (com o botão Voltar do celular), os avisos e o funcionamento sem internet.
 */

import { html, render, useCallback, useEffect, useMemo, useRef, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { useLoja, atualizar, obterProblema, dispensarProblema } from './loja.js';
import { Contexto } from './contexto.js';
import { hoje, mesDaData, somarMesesAoMes } from './datas.js';
import { alternarBaixa as acaoAlternarBaixa } from './acoes.js';
import { TelaInicio, TelaDespesas, TelaRecebiveis, TelaFamilia, BarraAbas } from './telas.js';
import { FolhaFormulario, FolhaDetalhe, FolhaValor, FolhaExcluir, FolhaPessoa, FolhaAjustes, FolhaConfirmar } from './folhas.js';
import { FolhaInstalar } from './instalacao-ui.js';
import { BoasVindas } from './boas-vindas.js';
import { Avisos } from './ui.js';

const ABAS = ['inicio', 'despesas', 'recebiveis', 'familia'];
const ATALHOS = { 'nova-despesa': 'despesa', 'novo-recebivel': 'recebivel' };

function abaDoEndereco() {
  const aba = location.hash.slice(1);
  return ABAS.includes(aba) ? aba : 'inicio';
}

/* ---------------------------------------------------------------- versão nova do app (service worker) */

/** @type {ServiceWorker | null} */
let versaoEmEspera = null;
let pediuAtualizacao = false;
const ouvintesVersao = new Set();

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pediuAtualizacao) location.reload();
  });
  const registrar = async () => {
    try {
      const registro = await navigator.serviceWorker.register('./sw.js');
      const avisarEspera = (worker) => {
        versaoEmEspera = worker;
        ouvintesVersao.forEach((f) => f());
      };
      if (registro.waiting && navigator.serviceWorker.controller) avisarEspera(registro.waiting);
      registro.addEventListener('updatefound', () => {
        const novo = registro.installing;
        if (!novo) return;
        novo.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) avisarEspera(novo);
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) registro.update().catch(() => {});
      });
    } catch (erro) {
      /* Sem service worker o app funciona, só não abre sem internet. */
    }
  };
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar);
}

function atualizarAgora() {
  if (!versaoEmEspera) { location.reload(); return; }
  pediuAtualizacao = true;
  versaoEmEspera.postMessage('atualizar');
}

/* ---------------------------------------------------------------- hooks */

/** Data de hoje, conferida a cada minuto e quando o app volta a aparecer. */
function useHoje() {
  const [valor, setValor] = useState(() => hoje());
  useEffect(() => {
    const conferir = () => setValor(hoje());
    const intervalo = setInterval(conferir, 60000);
    document.addEventListener('visibilitychange', conferir);
    window.addEventListener('focus', conferir);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', conferir);
      window.removeEventListener('focus', conferir);
    };
  }, []);
  return valor;
}

function useVersaoNova() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintesVersao.add(f);
    return () => { ouvintesVersao.delete(f); };
  }, []);
  return versaoEmEspera !== null;
}

/* ---------------------------------------------------------------- faixas de aviso no topo */

function Faixas() {
  const { problema, ignorados } = obterProblema();
  const versaoNova = useVersaoNova();
  const faixas = [];
  if (versaoNova) {
    faixas.push(html`<div class="faixa" key="versao" role="status">
      <span>Há uma versão nova do app.</span>
      <button type="button" class="botao botao-primario botao-pequeno" onClick=${atualizarAgora}>Atualizar</button>
    </div>`);
  }
  if (problema === 'sem-armazenamento') {
    faixas.push(html`<div class="faixa faixa-alerta" key="armazenamento" role="alert">
      <span>Este navegador não deixa o app guardar dados (pode ser uma janela anônima). O que você lançar se perde ao fechar.</span>
    </div>`);
  } else if (problema === 'falha-ao-salvar') {
    faixas.push(html`<div class="faixa faixa-alerta" key="salvar" role="alert">
      <span>A última mudança não foi guardada no aparelho (pode estar sem espaço). Libere espaço e exporte um backup em Família › Ajustes.</span>
    </div>`);
  } else if (problema === 'ilegivel' || problema === 'itens-ignorados') {
    faixas.push(html`<div class="faixa faixa-alerta" key="leitura" role="alert">
      <span>${problema === 'ilegivel'
        ? 'Os dados guardados não puderam ser lidos. Uma cópia foi mantida no aparelho; se você tiver um backup, importe em Família › Ajustes.'
        : `${ignorados} ${ignorados === 1 ? 'item dos dados guardados não pôde ser lido e ficou' : 'itens dos dados guardados não puderam ser lidos e ficaram'} de fora. Uma cópia foi mantida no aparelho.`}</span>
      <button type="button" class="botao botao-secundario botao-pequeno" onClick=${dispensarProblema}>Entendi</button>
    </div>`);
  }
  return faixas;
}

/* ---------------------------------------------------------------- app */

let contadorFolhas = 0;
let contadorAvisos = 0;

function App() {
  const estado = useLoja();
  const hojeISO = useHoje();
  const [aba, setAba] = useState(abaDoEndereco);
  const [mes, setMes] = useState(() => mesDaData(hoje()));
  const [filtroPessoa, setFiltroPessoa] = useState(/** @type {string | null} */ (null));
  const [pilha, setPilha] = useState(/** @type {any[]} */ ([]));
  const pilhaRef = useRef(/** @type {any[]} */ ([]));
  const depoisRef = useRef(/** @type {null | (() => void)} */ (null));
  const [avisos, setAvisos] = useState(/** @type {{ id: number, texto: string }[]} */ ([]));

  const avisar = useCallback((texto) => {
    contadorAvisos += 1;
    const id = contadorAvisos;
    setAvisos([{ id, texto }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 3200);
  }, []);

  /* Cada folha aberta ganha uma entrada no histórico: o botão Voltar do celular fecha a folha. */
  const abrir = useCallback((folha) => {
    contadorFolhas += 1;
    pilhaRef.current = [...pilhaRef.current, { ...folha, id: contadorFolhas }];
    history.pushState({ folhas: pilhaRef.current.length }, '');
    setPilha(pilhaRef.current);
  }, []);

  const fechar = useCallback((n = 1, depois) => {
    const quantas = Math.min(n, pilhaRef.current.length);
    if (quantas <= 0) { if (depois) depois(); return; }
    depoisRef.current = depois || null;
    history.go(-quantas);
  }, []);

  useEffect(() => {
    const aoVoltar = (e) => {
      const n = (e.state && e.state.folhas) || 0;
      if (n < pilhaRef.current.length) {
        pilhaRef.current = pilhaRef.current.slice(0, n);
        setPilha(pilhaRef.current);
      }
      const depois = depoisRef.current;
      depoisRef.current = null;
      if (depois) depois();
    };
    window.addEventListener('popstate', aoVoltar);
    if (history.state && history.state.folhas) history.replaceState({ folhas: 0 }, '');
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);

  const irPara = useCallback((destino) => {
    history.replaceState(history.state, '', `#${destino}`);
    setAba(destino);
    window.scrollTo(0, 0);
  }, []);

  const mudarMes = useCallback((n) => setMes((m) => somarMesesAoMes(m, n)), []);
  const irParaHoje = useCallback(() => setMes(mesDaData(hoje())), []);

  const alternarBaixa = useCallback((oc) => {
    const estava = Boolean(oc.pagoEm);
    const despesa = oc.lancamento.tipo === 'despesa';
    atualizar((est) => acaoAlternarBaixa(est, oc.lancamento.id, oc.indice, hoje()));
    if (estava) avisar(despesa ? 'Pagamento desmarcado' : 'Recebimento desmarcado');
    else avisar(despesa ? 'Marcada como paga' : 'Marcado como recebido');
  }, [avisar]);

  /* Atalhos do ícone do app (pressionar o ícone): "Nova despesa" e "Novo recebível". */
  useEffect(() => {
    const atalho = ATALHOS[location.hash.slice(1)];
    if (!atalho) return;
    history.replaceState(history.state, '', '#inicio');
    if (estado.preferencias.boasVindasConcluidas) abrir({ tipo: 'formulario', tipoLancamento: atalho });
  }, []);

  const pessoasPorId = useMemo(() => new Map(estado.pessoas.map((p) => [p.id, p])), [estado.pessoas]);

  const contexto = {
    estado, hojeISO, mes, mudarMes, irParaHoje, aba, irPara, abrir, fechar, avisar, atualizar,
    alternarBaixa, pessoasPorId, filtroPessoa, setFiltroPessoa,
  };

  const folhas = pilha.map((f) => {
    switch (f.tipo) {
      case 'formulario': return html`<${FolhaFormulario} key=${f.id} folha=${f} />`;
      case 'detalhe': return html`<${FolhaDetalhe} key=${f.id} folha=${f} />`;
      case 'valor': return html`<${FolhaValor} key=${f.id} folha=${f} />`;
      case 'excluir': return html`<${FolhaExcluir} key=${f.id} folha=${f} />`;
      case 'pessoa': return html`<${FolhaPessoa} key=${f.id} folha=${f} />`;
      case 'ajustes': return html`<${FolhaAjustes} key=${f.id} folha=${f} />`;
      case 'confirmar': return html`<${FolhaConfirmar} key=${f.id} folha=${f} />`;
      case 'instalar': return html`<${FolhaInstalar} key=${f.id} aoFechar=${() => fechar()} />`;
      default: return null;
    }
  });

  if (!estado.preferencias.boasVindasConcluidas) {
    return html`<${Contexto.Provider} value=${contexto}>
      <${Faixas} />
      <${BoasVindas} />
      ${folhas}
      <${Avisos} lista=${avisos} />
    <//>`;
  }

  let tela;
  if (aba === 'despesas') tela = html`<${TelaDespesas} />`;
  else if (aba === 'recebiveis') tela = html`<${TelaRecebiveis} />`;
  else if (aba === 'familia') tela = html`<${TelaFamilia} />`;
  else tela = html`<${TelaInicio} />`;

  return html`<${Contexto.Provider} value=${contexto}>
    <div class="app">
      <${Faixas} />
      ${tela}
    </div>
    <${BarraAbas} rota=${aba} />
    ${folhas}
    <${Avisos} lista=${avisos} />
  <//>`;
}

const raiz = document.getElementById('app');
if (raiz) {
  raiz.textContent = '';
  render(html`<${App} />`, raiz);
}
registrarServiceWorker();
