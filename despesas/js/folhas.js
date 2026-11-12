/** Folhas (janelas que sobem de baixo): lançamento, detalhe, exclusão, pessoa, ajustes e confirmação. */

import { html, useEffect, useRef, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { formatarReais, centavosDoTexto, textoDoCampo } from './dinheiro.js';
import { formatarCompleta, formatarComDiaDaSemana, hoje, diasEntre, formatarCurta } from './datas.js';
import { ocorrenciaNoIndice, descreverRepeticao, quantidadePrevista } from './recorrencia.js';
import { situacao } from './resumo.js';
import { CATEGORIAS, nomeDaCategoria } from './categorias.js';
import { gerarBackup, lerBackup } from './dados.js';
import {
  formularioNovo, formularioDe, validarFormulario, explicarRepeticao, salvarLancamento, novoId, adicionarPessoa,
  editarPessoa, removerPessoa, validarNome, ajustarValor, excluirOcorrencia, encerrarAPartirDe, excluirLancamento,
  marcarBackup, restaurarBackup, apagarTudo,
} from './acoes.js';
import { useApp } from './contexto.js';
import { Folha, Icone, Logo3D } from './ui.js';
import { InstrucoesInstalar } from './instalacao-ui.js';
import { plataforma } from './instalar.js';

export const VERSAO_APP = '1.0.0';

const REPETICOES = [
  { id: 'nao', nome: 'Não repete' },
  { id: 'semanal', nome: 'Semanal' },
  { id: 'mensal', nome: 'Mensal' },
  { id: 'anual', nome: 'Anual' },
  { id: 'parcelado', nome: 'Parcelado' },
];
const FINS = [
  { id: 'nunca', nome: 'Sem data para acabar' },
  { id: 'vezes', nome: 'Nº de vezes' },
  { id: 'data', nome: 'Até uma data' },
];
const ORDEM_ERROS = [
  ['valor', 'campo-valor'],
  ['descricao', 'campo-descricao'],
  ['pessoa', 'campo-pessoa'],
  ['data', 'campo-data'],
  ['parcelas', 'campo-parcelas'],
  ['vezes', 'campo-vezes'],
  ['ate', 'campo-ate'],
];

/** Mensagem de erro de um campo, ligada a ele por aria-describedby. */
function Erro({ id, texto }) {
  return texto ? html`<p class="campo-erro" id=${id}>${texto}</p>` : null;
}

/** @param {any} props */
function Opcao({ nome, valor, marcado, aoEscolher, children }) {
  return html`<label class="opcao">
    <input type="radio" name=${nome} value=${valor} checked=${marcado} onChange=${aoEscolher} />
    <span>${children}</span>
  </label>`;
}

/* ---------------------------------------------------------------- lançamento (novo ou edição) */

export function FolhaFormulario({ folha }) {
  const { estado, hojeISO, fechar, abrir, avisar, atualizar } = useApp();
  const existente = folha.lancamentoId ? estado.lancamentos.find((l) => l.id === folha.lancamentoId) || null : null;
  const [form, setForm] = useState(() => {
    if (existente) return formularioDe(existente);
    const novo = formularioNovo(folha.tipoLancamento || 'despesa', hojeISO, estado.pessoas);
    return folha.pessoaId ? { ...novo, pessoaId: folha.pessoaId } : novo;
  });
  const inicial = useRef(JSON.stringify(form));
  const [tentou, setTentou] = useState(false);
  const [novaPessoa, setNovaPessoa] = useState(/** @type {null | { nome: string, erro: string | null }} */ (null));
  const validacao = validarFormulario(form, estado.pessoas);
  const erros = tentou ? validacao.erros : {};
  const despesa = form.tipo === 'despesa';
  const recorrente = form.repetir !== 'nao';
  const mudar = (campos) => setForm((f) => ({ ...f, ...campos }));

  useEffect(() => {
    if (novaPessoa && novaPessoa.nome === '' && !novaPessoa.erro) {
      const campo = document.getElementById('campo-nova-pessoa');
      if (campo) campo.focus();
    }
  }, [novaPessoa !== null]);

  function focarPrimeiroErro(lista) {
    const par = ORDEM_ERROS.find(([chave]) => lista[chave]);
    if (!par) return;
    setTimeout(() => {
      const alvo = document.getElementById(par[1]);
      if (!alvo) return;
      const foco = alvo.matches('input, select, button') ? alvo : alvo.querySelector('input, button');
      if (foco) /** @type {HTMLElement} */ (foco).focus();
      alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  }

  function salvar(e) {
    e.preventDefault();
    if (!validacao.campos) {
      setTentou(true);
      focarPrimeiroErro(validacao.erros);
      return;
    }
    const campos = validacao.campos;
    const pagoEm = !existente && form.jaPago ? (campos.data <= hojeISO ? campos.data : hojeISO) : null;
    atualizar((est) => salvarLancamento(est, campos, { id: existente ? existente.id : null, agoraISO: new Date().toISOString(), pagoEm }));
    fechar(folha.voltarDuas ? 2 : 1);
    avisar(existente ? 'Alterações salvas' : (despesa ? 'Despesa lançada' : 'Recebível lançado'));
  }

  function aoFechar() {
    if (JSON.stringify(form) === inicial.current) { fechar(); return; }
    abrir({
      tipo: 'confirmar',
      titulo: existente ? 'Descartar as mudanças?' : 'Descartar o lançamento?',
      texto: 'O que você preencheu aqui será perdido.',
      botao: 'Descartar',
      perigo: true,
      aoConfirmar: () => fechar(2),
    });
  }

  function adicionarNovaPessoa() {
    if (!novaPessoa) return;
    const erro = validarNome(novaPessoa.nome);
    if (erro) { setNovaPessoa({ ...novaPessoa, erro }); return; }
    const id = novoId('p');
    atualizar((est) => adicionarPessoa(est, { id, nome: novaPessoa.nome, agoraISO: new Date().toISOString() }));
    mudar({ pessoaId: id });
    setNovaPessoa(null);
  }

  const titulo = existente ? (despesa ? 'Editar despesa' : 'Editar recebível') : 'Novo lançamento';
  const rotuloData = despesa ? (recorrente ? 'Primeiro vencimento' : 'Vencimento') : (recorrente ? 'Primeira data' : 'Data prevista');
  const rotuloPago = despesa ? (recorrente ? 'A primeira já está paga' : 'Já está paga') : (recorrente ? 'Já recebi o primeiro' : 'Já recebi');
  const aoMudarData = (e) => mudar({ data: e.currentTarget.value });
  const aoMudarAte = (e) => mudar({ ate: e.currentTarget.value });

  const campoData = html`<div class="campo">
    <label class="campo-rotulo" for="campo-data">${rotuloData}</label>
    <input id="campo-data" class="campo-entrada" type="date" value=${form.data} onInput=${aoMudarData} onChange=${aoMudarData}
      aria-invalid=${erros.data ? 'true' : 'false'} aria-describedby=${erros.data ? 'erro-data' : null} />
    <${Erro} id="erro-data" texto=${erros.data} />
  </div>`;

  const rodape = html`<button type="submit" form="form-lancamento" class="botao botao-primario botao-largo">
    ${existente ? 'Salvar alterações' : (despesa ? 'Salvar despesa' : 'Salvar recebível')}
  </button>`;

  return html`<${Folha} titulo=${titulo} cheia=${true} aoFechar=${aoFechar} rotuloFechar="Fechar sem salvar" rodape=${rodape}>
    <form id="form-lancamento" class="formulario" style="gap:14px" onSubmit=${salvar} novalidate>
      ${existente && existente.repeticao.tipo !== 'nao'
        ? html`<p class="nota-edicao">As mudanças valem para todas as vezes deste lançamento. O que já foi marcado como ${despesa ? 'pago' : 'recebido'} continua assim.</p>`
        : null}
      ${existente
        ? null
        : html`<fieldset class="segmentos">
            <legend class="sr-only">Tipo de lançamento</legend>
            <label class="segmento">
              <input type="radio" name="tipo" value="despesa" checked=${despesa} onChange=${() => mudar({ tipo: 'despesa' })} />
              <span><${Icone} nome="sai" tamanho=${16} />Despesa</span>
            </label>
            <label class="segmento">
              <input type="radio" name="tipo" value="recebivel" checked=${!despesa} onChange=${() => mudar({ tipo: 'recebivel' })} />
              <span><${Icone} nome="entra" tamanho=${16} />Recebível</span>
            </label>
          </fieldset>`}

      <div class="campo">
        <label class="campo-rotulo" for="campo-valor">${form.repetir === 'parcelado' ? 'Valor de cada parcela' : 'Valor'}<span class="sr-only"> em reais</span></label>
        <div class=${`campo-valor${erros.valor ? ' invalido' : ''}`}>
          <span class="moeda" aria-hidden="true">R$</span>
          <input id="campo-valor" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="next" placeholder="0,00"
            value=${textoDoCampo(form.valorCentavos)}
            aria-invalid=${erros.valor ? 'true' : 'false'} aria-describedby=${erros.valor ? 'erro-valor' : null}
            onInput=${(e) => {
              const centavos = centavosDoTexto(e.currentTarget.value);
              e.currentTarget.value = textoDoCampo(centavos);
              mudar({ valorCentavos: centavos });
            }} />
        </div>
        <${Erro} id="erro-valor" texto=${erros.valor} />
      </div>

      <div class="campo">
        <label class="campo-rotulo" for="campo-descricao">Descrição</label>
        <input id="campo-descricao" class="campo-entrada" type="text" maxlength="60" autocomplete="off" autocapitalize="sentences" enterkeyhint="next"
          placeholder=${despesa ? 'Ex.: aluguel, energia, mercado' : 'Ex.: salário, freela, comissão'}
          value=${form.descricao} onInput=${(e) => mudar({ descricao: e.currentTarget.value })}
          aria-invalid=${erros.descricao ? 'true' : 'false'} aria-describedby=${erros.descricao ? 'erro-descricao' : null} />
        <${Erro} id="erro-descricao" texto=${erros.descricao} />
      </div>

      ${despesa
        ? html`<div class="duas-colunas">
            <div class="campo">
              <label class="campo-rotulo" for="campo-categoria">Categoria</label>
              <select id="campo-categoria" class="campo-entrada" value=${form.categoria} onChange=${(e) => mudar({ categoria: e.currentTarget.value })}>
                <option value="">Escolher</option>
                ${CATEGORIAS.map((c) => html`<option key=${c.id} value=${c.id}>${c.nome}</option>`)}
              </select>
            </div>
            ${campoData}
          </div>`
        : html`<fieldset class="grupo-opcoes" id="campo-pessoa" aria-describedby=${erros.pessoa ? 'erro-pessoa' : null}>
            <legend>Quem recebe</legend>
            <div class="opcoes">
              ${estado.pessoas.map((p) => html`<${Opcao} key=${p.id} nome="pessoa" valor=${p.id} marcado=${form.pessoaId === p.id} aoEscolher=${() => mudar({ pessoaId: p.id })}>
                <span class="bolinha" style=${`background:${p.cor}`}></span>${p.nome}
              <//>`)}
              ${novaPessoa === null
                ? html`<button type="button" class="opcao opcao-nova" onClick=${() => setNovaPessoa({ nome: '', erro: null })}>
                    <span><${Icone} nome="mais" tamanho=${14} />Nova pessoa</span>
                  </button>`
                : null}
            </div>
            ${novaPessoa !== null
              ? html`<div class="nova-pessoa">
                  <div class="campo">
                    <label class="sr-only" for="campo-nova-pessoa">Nome da nova pessoa</label>
                    <input id="campo-nova-pessoa" class="campo-entrada" type="text" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="Nome"
                      value=${novaPessoa.nome}
                      aria-invalid=${novaPessoa.erro ? 'true' : 'false'} aria-describedby=${novaPessoa.erro ? 'erro-nova-pessoa' : null}
                      onInput=${(e) => setNovaPessoa({ nome: e.currentTarget.value, erro: null })}
                      onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarNovaPessoa(); } }} />
                    <${Erro} id="erro-nova-pessoa" texto=${novaPessoa.erro} />
                  </div>
                  <button type="button" class="botao botao-secundario" onClick=${adicionarNovaPessoa}>Adicionar</button>
                </div>`
              : null}
            <${Erro} id="erro-pessoa" texto=${erros.pessoa} />
          </fieldset>
          ${campoData}`}

      <fieldset class="grupo-opcoes">
        <legend>Repetir</legend>
        <div class="opcoes">
          ${REPETICOES.map((r) => html`<${Opcao} key=${r.id} nome="repetir" valor=${r.id} marcado=${form.repetir === r.id} aoEscolher=${() => mudar({ repetir: r.id })}>${r.nome}<//>`)}
        </div>
        <p class="campo-dica" aria-live="polite">${explicarRepeticao(form)}</p>
      </fieldset>

      ${form.repetir === 'parcelado'
        ? html`<div class="campo">
            <label class="campo-rotulo" for="campo-parcelas">Número de parcelas</label>
            <input id="campo-parcelas" class="campo-entrada" type="text" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="Ex.: 10"
              value=${form.parcelas} onInput=${(e) => mudar({ parcelas: e.currentTarget.value.replace(/\D/g, '') })}
              aria-invalid=${erros.parcelas ? 'true' : 'false'} aria-describedby=${erros.parcelas ? 'erro-parcelas' : null} />
            <${Erro} id="erro-parcelas" texto=${erros.parcelas} />
          </div>`
        : null}

      ${form.repetir === 'semanal' || form.repetir === 'mensal' || form.repetir === 'anual'
        ? html`<fieldset class="grupo-opcoes">
            <legend>Termina</legend>
            <div class="opcoes">
              ${FINS.map((f) => html`<${Opcao} key=${f.id} nome="fim" valor=${f.id} marcado=${form.fim === f.id} aoEscolher=${() => mudar({ fim: f.id })}>${f.nome}<//>`)}
            </div>
          </fieldset>
          ${form.fim === 'vezes'
            ? html`<div class="campo">
                <label class="campo-rotulo" for="campo-vezes">Quantas vezes, contando a primeira</label>
                <input id="campo-vezes" class="campo-entrada" type="text" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="Ex.: 12"
                  value=${form.vezes} onInput=${(e) => mudar({ vezes: e.currentTarget.value.replace(/\D/g, '') })}
                  aria-invalid=${erros.vezes ? 'true' : 'false'} aria-describedby=${erros.vezes ? 'erro-vezes' : null} />
                <${Erro} id="erro-vezes" texto=${erros.vezes} />
              </div>`
            : null}
          ${form.fim === 'data'
            ? html`<div class="campo">
                <label class="campo-rotulo" for="campo-ate">Repetir até</label>
                <input id="campo-ate" class="campo-entrada" type="date" value=${form.ate} min=${form.data} onInput=${aoMudarAte} onChange=${aoMudarAte}
                  aria-invalid=${erros.ate ? 'true' : 'false'} aria-describedby=${erros.ate ? 'erro-ate' : null} />
                <${Erro} id="erro-ate" texto=${erros.ate} />
              </div>`
            : null}`
        : null}

      ${existente
        ? null
        : html`<label class="interruptor">
            <span class="interruptor-texto">${rotuloPago}</span>
            <input type="checkbox" role="switch" checked=${form.jaPago} onChange=${(e) => mudar({ jaPago: e.currentTarget.checked })} />
            <span class="trilho" aria-hidden="true"></span>
          </label>`}
    </form>
  <//>`;
}

/* ---------------------------------------------------------------- detalhe de uma ocorrência */

export function FolhaDetalhe({ folha }) {
  const { estado, hojeISO, fechar, abrir, alternarBaixa, pessoasPorId } = useApp();
  const lanc = estado.lancamentos.find((l) => l.id === folha.lancamentoId);
  const oc = lanc ? ocorrenciaNoIndice(lanc, folha.indice) : null;
  if (!lanc || !oc) {
    return html`<${Folha} titulo="Lançamento" aoFechar=${() => fechar()}>
      <p class="texto-folha">Este lançamento não existe mais.</p>
      <button type="button" class="botao botao-secundario" onClick=${() => fechar()}>Fechar</button>
    <//>`;
  }
  const despesa = lanc.tipo === 'despesa';
  const sit = situacao(oc, hojeISO);
  const pessoa = lanc.pessoaId ? pessoasPorId.get(lanc.pessoaId) : null;
  const recorrente = lanc.repeticao.tipo !== 'nao';
  const total = quantidadePrevista(lanc.repeticao);
  const dias = diasEntre(hojeISO, oc.data);
  let selo;
  if (sit === 'paga') selo = `${despesa ? 'Paga' : 'Recebido'} em ${formatarCompleta(/** @type {string} */ (oc.pagoEm))}`;
  else if (sit === 'atrasada') selo = despesa ? `Atrasada · venceu em ${formatarCurta(oc.data)}` : `Não recebido · previsto para ${formatarCurta(oc.data)}`;
  else if (dias === 0) selo = despesa ? 'Vence hoje' : 'Previsto para hoje';
  else selo = despesa ? `Em aberto · vence em ${formatarCurta(oc.data)}` : `A receber · previsto para ${formatarCurta(oc.data)}`;
  let tomValor = '';
  if (sit !== 'paga') tomValor = despesa ? (sit === 'atrasada' ? 'tom-sai' : '') : 'tom-entra';

  const marcar = () => { alternarBaixa(oc); fechar(); };
  return html`<${Folha} titulo=${despesa ? 'Despesa' : 'Recebível'} aoFechar=${() => fechar()}>
    <div class="detalhe-cabeca">
      <p class=${`detalhe-valor ${tomValor}`}>${formatarReais(oc.valorCentavos)}</p>
      <p class="detalhe-titulo">${lanc.descricao}</p>
      <p class=${`selo ${sit}`}>${selo}</p>
    </div>
    <dl class="detalhe-lista">
      <div><dt>${despesa ? 'Vencimento' : 'Data prevista'}</dt><dd>${formatarComDiaDaSemana(oc.data)}</dd></div>
      ${despesa
        ? html`<div><dt>Categoria</dt><dd>${nomeDaCategoria(lanc.categoria)}</dd></div>`
        : html`<div><dt>Quem recebe</dt><dd>${pessoa ? pessoa.nome : '—'}</dd></div>`}
      <div><dt>Repetição</dt><dd>${descreverRepeticao(lanc.repeticao)}</dd></div>
      ${recorrente && Number.isFinite(total)
        ? html`<div><dt>${lanc.repeticao.tipo === 'parcelado' ? 'Parcela' : 'Vez'}</dt><dd>${oc.indice + 1} de ${total}</dd></div>`
        : null}
      ${oc.ajustado
        ? html`<div><dt>Valor de sempre</dt><dd>${formatarReais(lanc.valorCentavos)} (alterado só nesta)</dd></div>`
        : null}
    </dl>
    <div class="acoes">
      <button type="button" class=${`botao ${sit === 'paga' ? 'botao-secundario' : 'botao-primario'}`} onClick=${marcar}>
        ${sit === 'paga'
          ? (despesa ? 'Desmarcar pagamento' : 'Desmarcar recebimento')
          : html`<${Icone} nome="check" tamanho=${18} />${despesa ? 'Marcar como paga' : 'Marcar como recebido'}`}
      </button>
      ${recorrente
        ? html`<button type="button" class="botao botao-secundario" onClick=${() => abrir({ tipo: 'valor', lancamentoId: lanc.id, indice: oc.indice })}>
            Alterar o valor só ${lanc.repeticao.tipo === 'semanal' ? 'desta semana' : 'desta vez'}
          </button>`
        : null}
      <button type="button" class="botao botao-secundario" onClick=${() => abrir({ tipo: 'formulario', lancamentoId: lanc.id, voltarDuas: true })}>
        <${Icone} nome="editar" tamanho=${18} />Editar ${recorrente ? 'o lançamento' : (despesa ? 'a despesa' : 'o recebível')}
      </button>
      <button type="button" class="botao botao-perigo" onClick=${() => abrir({ tipo: 'excluir', lancamentoId: lanc.id, indice: oc.indice })}>
        <${Icone} nome="lixeira" tamanho=${18} />Excluir
      </button>
    </div>
  <//>`;
}

/* ---------------------------------------------------------------- valor só de uma ocorrência */

export function FolhaValor({ folha }) {
  const { estado, fechar, atualizar, avisar } = useApp();
  const lanc = estado.lancamentos.find((l) => l.id === folha.lancamentoId);
  const oc = lanc ? ocorrenciaNoIndice(lanc, folha.indice) : null;
  const [centavos, setCentavos] = useState(oc ? oc.valorCentavos : 0);
  const [erro, setErro] = useState(/** @type {string | null} */ (null));
  if (!lanc || !oc) return html`<${Folha} titulo="Alterar valor" aoFechar=${() => fechar()}><p class="texto-folha">Este lançamento não existe mais.</p><//>`;
  const salvar = (e) => {
    e.preventDefault();
    if (!(centavos > 0)) { setErro('Informe um valor maior que zero.'); return; }
    atualizar((est) => ajustarValor(est, lanc.id, oc.indice, centavos));
    fechar();
    avisar('Valor alterado só nesta vez');
  };
  const voltar = () => {
    atualizar((est) => ajustarValor(est, lanc.id, oc.indice, null));
    fechar();
    avisar('Valor de sempre restaurado');
  };
  return html`<${Folha} titulo="Alterar valor" aoFechar=${() => fechar()}>
    <p class="texto-folha">Novo valor de <strong>${lanc.descricao}</strong> só em ${formatarCompleta(oc.data)}. As outras vezes continuam com ${formatarReais(lanc.valorCentavos)}.</p>
    <form class="formulario" style="gap:14px" onSubmit=${salvar} novalidate>
      <div class="campo">
        <label class="campo-rotulo" for="campo-valor-unico">Valor<span class="sr-only"> em reais</span></label>
        <div class=${`campo-valor${erro ? ' invalido' : ''}`}>
          <span class="moeda" aria-hidden="true">R$</span>
          <input id="campo-valor-unico" type="text" inputmode="numeric" autocomplete="off" placeholder="0,00" value=${textoDoCampo(centavos)}
            aria-invalid=${erro ? 'true' : 'false'} aria-describedby=${erro ? 'erro-valor-unico' : null}
            onInput=${(e) => { const c = centavosDoTexto(e.currentTarget.value); e.currentTarget.value = textoDoCampo(c); setCentavos(c); setErro(null); }} />
        </div>
        <${Erro} id="erro-valor-unico" texto=${erro} />
      </div>
      <div class="acoes">
        <button type="submit" class="botao botao-primario">Salvar valor</button>
        ${oc.ajustado ? html`<button type="button" class="botao botao-secundario" onClick=${voltar}>Voltar ao valor de sempre (${formatarReais(lanc.valorCentavos)})</button>` : null}
      </div>
    </form>
  <//>`;
}

/* ---------------------------------------------------------------- excluir */

export function FolhaExcluir({ folha }) {
  const { estado, fechar, atualizar, avisar } = useApp();
  const lanc = estado.lancamentos.find((l) => l.id === folha.lancamentoId);
  const oc = lanc ? ocorrenciaNoIndice(lanc, folha.indice) : null;
  if (!lanc || !oc) return html`<${Folha} titulo="Excluir" aoFechar=${() => fechar()}><p class="texto-folha">Este lançamento não existe mais.</p><//>`;
  const despesa = lanc.tipo === 'despesa';
  const recorrente = lanc.repeticao.tipo !== 'nao';
  const feito = (mudanca, texto) => {
    fechar(2, () => {
      atualizar(mudanca);
      avisar(texto);
    });
  };
  const nome = despesa ? 'despesa' : 'recebível';
  if (!recorrente) {
    return html`<${Folha} titulo=${`Excluir ${nome}?`} aoFechar=${() => fechar()}>
      <p class="texto-folha"><strong>${lanc.descricao}</strong> de ${formatarCompleta(oc.data)} será apagado. Não dá para desfazer.</p>
      <div class="acoes">
        <button type="button" class="botao botao-perigo" onClick=${() => feito((est) => excluirLancamento(est, lanc.id), `${despesa ? 'Despesa excluída' : 'Recebível excluído'}`)}>
          Excluir ${nome}
        </button>
        <button type="button" class="botao botao-secundario" onClick=${() => fechar()}>Cancelar</button>
      </div>
    <//>`;
  }
  return html`<${Folha} titulo="Excluir o quê?" aoFechar=${() => fechar()}>
    <p class="texto-folha"><strong>${lanc.descricao}</strong> se repete (${descreverRepeticao(lanc.repeticao).toLowerCase()}). Não dá para desfazer.</p>
    <div class="acoes">
      <button type="button" class="botao botao-perigo" onClick=${() => feito((est) => excluirOcorrencia(est, lanc.id, oc.indice), `Excluída a de ${formatarCurta(oc.data)}`)}>
        Só a de ${formatarCompleta(oc.data)}
      </button>
      ${oc.indice > 0
        ? html`<button type="button" class="botao botao-perigo" onClick=${() => feito((est) => encerrarAPartirDe(est, lanc.id, oc.indice), `Encerrado a partir de ${formatarCurta(oc.data)}`)}>
            Esta e as próximas
          </button>`
        : null}
      <button type="button" class="botao botao-perigo" onClick=${() => feito((est) => excluirLancamento(est, lanc.id), 'Lançamento excluído')}>
        Todas, inclusive as anteriores
      </button>
      <button type="button" class="botao botao-secundario" onClick=${() => fechar()}>Cancelar</button>
    </div>
  <//>`;
}

/* ---------------------------------------------------------------- pessoa */

export function FolhaPessoa({ folha }) {
  const { estado, fechar, abrir, atualizar, avisar, irPara, setFiltroPessoa } = useApp();
  const pessoa = folha.pessoaId ? estado.pessoas.find((p) => p.id === folha.pessoaId) || null : null;
  const [nome, setNome] = useState(pessoa ? pessoa.nome : '');
  const [eu, setEu] = useState(pessoa ? pessoa.eu : estado.pessoas.length === 0);
  const [erro, setErro] = useState(/** @type {string | null} */ (null));
  if (folha.pessoaId && !pessoa) return html`<${Folha} titulo="Pessoa" aoFechar=${() => fechar()}><p class="texto-folha">Esta pessoa não está mais cadastrada.</p><//>`;
  const recebiveis = pessoa ? estado.lancamentos.filter((l) => l.tipo === 'recebivel' && l.pessoaId === pessoa.id).length : 0;

  const salvar = (e) => {
    e.preventDefault();
    const problema = validarNome(nome);
    if (problema) { setErro(problema); document.getElementById('campo-nome-pessoa')?.focus(); return; }
    if (pessoa) atualizar((est) => editarPessoa(est, pessoa.id, { nome, eu }));
    else atualizar((est) => adicionarPessoa(est, { id: novoId('p'), nome, eu, agoraISO: new Date().toISOString() }));
    fechar();
    avisar(pessoa ? 'Pessoa atualizada' : 'Pessoa adicionada');
  };
  const remover = () => abrir({
    tipo: 'confirmar',
    titulo: `Remover ${pessoa.nome}?`,
    texto: recebiveis
      ? `${recebiveis === 1 ? 'O recebível lançado' : `Os ${recebiveis} recebíveis lançados`} para ${pessoa.nome} também ${recebiveis === 1 ? 'será apagado' : 'serão apagados'}. Não dá para desfazer.`
      : `${pessoa.nome} não tem recebíveis lançados. Nada mais será apagado.`,
    botao: 'Remover',
    perigo: true,
    aoConfirmar: () => fechar(2, () => { atualizar((est) => removerPessoa(est, pessoa.id)); avisar('Pessoa removida'); }),
  });
  const verRecebiveis = () => fechar(1, () => { setFiltroPessoa(pessoa.id); irPara('recebiveis'); });

  return html`<${Folha} titulo=${pessoa ? pessoa.nome : 'Nova pessoa'} aoFechar=${() => fechar()}>
    <form class="formulario" style="gap:14px" onSubmit=${salvar} novalidate>
      <div class="campo">
        <label class="campo-rotulo" for="campo-nome-pessoa">Nome</label>
        <input id="campo-nome-pessoa" class="campo-entrada" type="text" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="done"
          value=${nome} onInput=${(e) => { setNome(e.currentTarget.value); setErro(null); }}
          aria-invalid=${erro ? 'true' : 'false'} aria-describedby=${erro ? 'erro-nome-pessoa' : 'dica-nome-pessoa'} />
        ${erro ? html`<${Erro} id="erro-nome-pessoa" texto=${erro} />` : html`<p class="campo-dica" id="dica-nome-pessoa">Quem tem renda na família: salário, freelas, pensão...</p>`}
      </div>
      <label class="interruptor">
        <span class="interruptor-texto">Esta pessoa sou eu</span>
        <input type="checkbox" role="switch" checked=${eu} onChange=${(e) => setEu(e.currentTarget.checked)} />
        <span class="trilho" aria-hidden="true"></span>
      </label>
      <button type="submit" class="botao botao-primario">${pessoa ? 'Salvar' : 'Adicionar pessoa'}</button>
    </form>
    ${pessoa
      ? html`<div class="acoes">
          <button type="button" class="botao botao-secundario" onClick=${verRecebiveis}>
            <${Icone} nome="entra" tamanho=${18} />Ver recebíveis${recebiveis ? ` (${recebiveis})` : ''}
          </button>
          <button type="button" class="botao botao-perigo" onClick=${remover}><${Icone} nome="lixeira" tamanho=${18} />Remover pessoa</button>
        </div>`
      : null}
  <//>`;
}

/* ---------------------------------------------------------------- ajustes e backup */

export function FolhaAjustes() {
  const { estado, hojeISO, fechar, abrir, atualizar, avisar } = useApp();
  const entrada = useRef(null);
  const ultimo = estado.preferencias.ultimoBackup;

  async function exportar() {
    const agora = new Date();
    const texto = gerarBackup(estado, agora.toISOString());
    const nome = `controle-despesas-backup-${hojeISO}.json`;
    const arquivo = new File([texto], nome, { type: 'application/json' });
    try {
      if (plataforma().ios && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Backup do Controle de Despesas' });
      } else {
        const url = URL.createObjectURL(arquivo);
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      atualizar((est) => marcarBackup(est, agora.toISOString()));
      avisar('Backup exportado');
    } catch (erro) {
      if (erro && /** @type {Error} */ (erro).name === 'AbortError') return;
      avisar('Não foi possível exportar o backup');
    }
  }

  async function importar(e) {
    const arquivo = e.currentTarget.files && e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!arquivo) return;
    let texto = '';
    try { texto = await arquivo.text(); } catch (erro) { texto = ''; }
    const lido = lerBackup(texto);
    if (!lido.ok) {
      abrir({ tipo: 'confirmar', titulo: 'Não foi possível importar', texto: lido.motivo, botao: 'Entendi', somenteOk: true });
      return;
    }
    const quando = lido.exportadoEm && !Number.isNaN(Date.parse(lido.exportadoEm)) ? ` de ${formatarCompleta(hoje(new Date(lido.exportadoEm)))}` : '';
    abrir({
      tipo: 'confirmar',
      titulo: 'Trocar os dados pelo backup?',
      texto: `O backup${quando} tem ${lido.lancamentos.length} ${lido.lancamentos.length === 1 ? 'lançamento' : 'lançamentos'} e ${lido.pessoas.length} ${lido.pessoas.length === 1 ? 'pessoa' : 'pessoas'}. Tudo o que está neste aparelho agora será trocado por ele.`,
      botao: 'Trocar pelos dados do backup',
      perigo: true,
      aoConfirmar: () => fechar(2, () => { atualizar((est) => restaurarBackup(est, lido)); avisar('Backup importado'); }),
    });
  }

  const apagar = () => abrir({
    tipo: 'confirmar',
    titulo: 'Apagar todos os dados?',
    texto: 'Todos os lançamentos e pessoas deste aparelho serão apagados e o app volta para a tela de boas-vindas. Se quiser guardar uma cópia, exporte um backup antes.',
    botao: 'Apagar tudo',
    perigo: true,
    aoConfirmar: () => fechar(2, () => { atualizar(() => apagarTudo()); }),
  });

  return html`<${Folha} titulo="Ajustes e backup" aoFechar=${() => fechar()}>
    <div class="ajustes-topo">
      <${Logo3D} tamanho=${104} />
      <div>
        <strong>Controle de Despesas</strong>
        <p>Versão ${VERSAO_APP}</p>
      </div>
    </div>
    <section class="secao-folha" aria-labelledby="titulo-dados">
      <h3 id="titulo-dados">Seus dados</h3>
      <p class="texto-folha">Ficam guardados só neste aparelho, sem conta e sem internet. Se o app for desinstalado ou os dados do navegador forem apagados, eles se perdem. Exporte um backup de vez em quando e guarde o arquivo.</p>
      <p class="texto-folha">Último backup: <strong>${ultimo && !Number.isNaN(Date.parse(ultimo)) ? formatarCompleta(hoje(new Date(ultimo))) : 'nenhum ainda'}</strong></p>
      <button type="button" class="botao botao-primario" onClick=${exportar}><${Icone} nome="baixar" tamanho=${18} />Exportar backup</button>
      <button type="button" class="botao botao-secundario" onClick=${() => entrada.current && entrada.current.click()}><${Icone} nome="enviar" tamanho=${18} />Importar backup</button>
      <input ref=${entrada} type="file" accept="application/json,.json" class="sr-only" tabindex="-1" aria-hidden="true" onChange=${importar} />
    </section>
    <section class="secao-folha" aria-labelledby="titulo-instalar-ajustes">
      <h3 id="titulo-instalar-ajustes">Instalar no celular</h3>
      <div class="cartao-info"><${InstrucoesInstalar} /></div>
    </section>
    <section class="secao-folha" aria-labelledby="titulo-apagar">
      <h3 id="titulo-apagar">Recomeçar do zero</h3>
      <button type="button" class="botao botao-perigo" onClick=${apagar}><${Icone} nome="lixeira" tamanho=${18} />Apagar todos os dados</button>
    </section>
  <//>`;
}

/* ---------------------------------------------------------------- confirmação */

export function FolhaConfirmar({ folha }) {
  const { fechar } = useApp();
  const confirmar = folha.somenteOk ? () => fechar() : folha.aoConfirmar;
  return html`<${Folha} titulo=${folha.titulo} aoFechar=${() => fechar()}>
    <p class="texto-folha">${folha.texto}</p>
    <div class="acoes">
      <button type="button" class=${`botao ${folha.perigo ? 'botao-perigo' : 'botao-primario'}`} onClick=${confirmar}>${folha.botao}</button>
      ${folha.somenteOk ? null : html`<button type="button" class="botao botao-secundario" onClick=${() => fechar()}>Cancelar</button>`}
    </div>
  <//>`;
}
