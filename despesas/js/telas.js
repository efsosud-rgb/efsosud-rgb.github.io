/** As quatro telas principais e a barra de abas. */

import { html, useMemo, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { formatarReais, formatarSaldo } from './dinheiro.js';
import { NOMES_MESES, capitalizar, mesDaData, mesmoMes, rotuloDoMes, diasNoMes, lerData } from './datas.js';
import { resumoDoMes, pendencias, ocorrenciasDoMes, situacao, rendaPorPessoa } from './resumo.js';
import { useApp } from './contexto.js';
import { Icone, MesNav, LinhaOcorrencia, Vazio, Avatar } from './ui.js';
import { AvisoInstalar } from './instalacao-ui.js';

const LIMITE_PENDENCIAS = 8;

/* ---------------------------------------------------------------- início */

function CartaoSaldo({ resumo, mes, referencia }) {
  const nomeMes = rotuloDoMes(mes, referencia);
  const vazio = resumo.quantidade === 0;
  const e = resumo.entradas;
  const s = resumo.saidas;
  const saldo = resumo.saldoPrevistoCentavos;
  return html`<section class="cartao" aria-labelledby="rotulo-saldo">
    <h2 class="cartao-rotulo" id="rotulo-saldo">Saldo previsto de ${nomeMes}</h2>
    <div class="saldo-valor">
      ${vazio
        ? html`<span class="saldo-vazio" aria-label="sem valor">—</span>`
        : html`<span class=${`saldo-numero${saldo < 0 ? ' negativo' : ''}`}>${formatarSaldo(saldo)}</span>`}
    </div>
    <p class="saldo-nota">${vazio ? 'Sem lançamentos neste mês.' : 'Tudo o que entra menos tudo o que sai no mês, pago ou não.'}</p>
    <div class="mini-cartoes">
      <div class="mini-cartao">
        <div class="mini-rotulo"><span class="tom-entra"><${Icone} nome="entra" tamanho=${14} /></span>Entradas</div>
        ${e.quantidade
          ? html`<div class="mini-valor">${formatarReais(e.totalCentavos)}</div>
              <div class=${`mini-nota${e.emAbertoCentavos ? ' tom-entra' : ''}`}>${e.emAbertoCentavos ? `${formatarReais(e.emAbertoCentavos)} a receber` : 'tudo recebido'}</div>`
          : html`<div class="mini-valor sem-valor">—</div><div class="mini-nota">nenhum recebível</div>`}
      </div>
      <div class="mini-cartao">
        <div class="mini-rotulo"><span class="tom-sai"><${Icone} nome="sai" tamanho=${14} /></span>Saídas</div>
        ${s.quantidade
          ? html`<div class="mini-valor">${formatarReais(s.totalCentavos)}</div>
              <div class=${`mini-nota${s.emAbertoCentavos ? ' tom-sai' : ''}`}>${s.emAbertoCentavos ? `${formatarReais(s.emAbertoCentavos)} a pagar` : 'tudo pago'}</div>`
          : html`<div class="mini-valor sem-valor">—</div><div class="mini-nota">nenhuma despesa</div>`}
      </div>
    </div>
  </section>`;
}

function LinhaDoMes({ dias, mes, hojeISO }) {
  const hoje = lerData(hojeISO);
  const esteMes = hoje && hoje.ano === mes.ano && hoje.mes0 === mes.mes0;
  const passado = (dia) => {
    if (!hoje) return false;
    if (mes.ano !== hoje.ano) return mes.ano < hoje.ano;
    if (mes.mes0 !== hoje.mes0) return mes.mes0 < hoje.mes0;
    return dia < hoje.dia;
  };
  const n = diasNoMes(mes.ano, mes.mes0);
  const comEntrada = dias.filter((d) => d.entra).map((d) => d.dia);
  const comSaida = dias.filter((d) => d.sai).map((d) => d.dia);
  const descricao = `Linha do mês. ${comEntrada.length ? `Entradas nos dias ${comEntrada.join(', ')}.` : 'Sem entradas.'} ${comSaida.length ? `Saídas nos dias ${comSaida.join(', ')}.` : 'Sem saídas.'}${esteMes && hoje ? ` Hoje é dia ${hoje.dia}.` : ''}`;
  const marcas = [...new Set([1, 5, 10, 15, 20, 25, n, ...(esteMes && hoje ? [hoje.dia] : [])])]
    .filter((d) => d <= n)
    .filter((d) => !(esteMes && hoje && d !== hoje.dia && Math.abs(d - hoje.dia) < 3));
  return html`<section class="cartao linha-mes" aria-labelledby="rotulo-linha">
    <div class="linha-mes-topo">
      <h2 class="cartao-rotulo" id="rotulo-linha" style="font-weight:600">${capitalizar(NOMES_MESES[mes.mes0])}, dia a dia</h2>
      <div class="legenda" aria-hidden="true">
        <span><span class="legenda-ponto" style="background:var(--entra)"></span>entra</span>
        <span><span class="legenda-ponto" style="background:var(--sai)"></span>sai</span>
        ${esteMes ? html`<span><span class="legenda-traco"></span>hoje</span>` : null}
      </div>
    </div>
    <div class="linha-mes-dias" role="img" aria-label=${descricao}>
      ${dias.map((d) => html`<div key=${d.dia} class=${`dia${passado(d.dia) ? ' passado' : ''}${esteMes && hoje && d.dia === hoje.dia ? ' hoje' : ''}`}>
        <span class=${`dia-ponto${d.entra ? ' entra' : ''}`}></span>
        <span class="dia-traco"></span>
        <span class=${`dia-ponto${d.sai ? ' sai' : ''}`}></span>
      </div>`)}
    </div>
    <div class="linha-mes-numeros" aria-hidden="true">
      ${marcas.map((d) => html`<span key=${d} class=${esteMes && hoje && d === hoje.dia ? 'hoje' : ''} style=${`left:${((d - 0.5) / n) * 100}%`}>${d}</span>`)}
    </div>
  </section>`;
}

function ParaComecar() {
  const { abrir } = useApp();
  const itens = [
    { titulo: 'Cadastrar a família', nota: 'Quem tem renda para lançar', icone: 'pessoas', tom: '', acao: () => abrir({ tipo: 'pessoa' }) },
    { titulo: 'Lançar um recebível', nota: 'Salário, freelas e outras entradas', icone: 'entra', tom: 'tom-entra', acao: () => abrir({ tipo: 'formulario', tipoLancamento: 'recebivel' }) },
    { titulo: 'Lançar uma despesa', nota: 'Única, futura ou recorrente', icone: 'sai', tom: 'tom-sai', acao: () => abrir({ tipo: 'formulario', tipoLancamento: 'despesa' }) },
  ];
  return html`<section aria-labelledby="titulo-comecar" style="display:flex;flex-direction:column;gap:8px">
    <h2 class="secao-titulo" id="titulo-comecar" style="padding:0 4px">Para começar</h2>
    <ul class="atalhos">
      ${itens.map((i) => html`<li key=${i.titulo}>
        <button type="button" class="atalho" onClick=${i.acao}>
          <span class=${`atalho-icone ${i.tom}`}><${Icone} nome=${i.icone} tamanho=${18} /></span>
          <span class="atalho-texto"><span class="atalho-titulo">${i.titulo}</span><span class="atalho-nota">${i.nota}</span></span>
          <${Icone} nome="proximo" tamanho=${18} />
        </button>
      </li>`)}
    </ul>
  </section>`;
}

export function TelaInicio() {
  const { estado, hojeISO, mes, mudarMes, irParaHoje, irPara } = useApp();
  const mesDeHoje = mesDaData(hojeISO);
  const esteMes = mesmoMes(mes, mesDeHoje);
  const resumo = useMemo(() => resumoDoMes(estado.lancamentos, mes, hojeISO), [estado.lancamentos, mes, hojeISO]);
  const abertas = useMemo(() => pendencias(estado.lancamentos, mes, hojeISO), [estado.lancamentos, mes, hojeISO]);
  const semNada = estado.lancamentos.length === 0;
  const visiveis = abertas.slice(0, LIMITE_PENDENCIAS);
  const titulo = esteMes ? 'Em aberto' : (mes.ano * 12 + mes.mes0 < mesDeHoje.ano * 12 + mesDeHoje.mes0 ? `Ficou em aberto em ${NOMES_MESES[mes.mes0]}` : `Em aberto em ${NOMES_MESES[mes.mes0]}`);
  return html`<main class="tela" aria-labelledby="titulo-inicio">
    <header class="cabecalho">
      <h1 class="titulo-tela" id="titulo-inicio">${capitalizar(NOMES_MESES[mes.mes0])} <span class="titulo-ano">${mes.ano}</span></h1>
      <div class="cabecalho-acoes"><${MesNav} mes=${mes} aoMudar=${mudarMes} /></div>
    </header>
    ${esteMes ? null : html`<button type="button" class="chip-hoje" onClick=${irParaHoje}>Voltar para ${NOMES_MESES[mesDeHoje.mes0]}</button>`}
    <${CartaoSaldo} resumo=${resumo} mes=${mes} referencia=${mesDeHoje} />
    <${LinhaDoMes} dias=${resumo.dias} mes=${mes} hojeISO=${hojeISO} />
    <${AvisoInstalar} />
    ${semNada
      ? html`<${ParaComecar} />`
      : html`<section aria-labelledby="titulo-abertos" style="display:flex;flex-direction:column;gap:8px">
          <div class="secao-topo">
            <h2 class="secao-titulo" id="titulo-abertos">${titulo}</h2>
            ${abertas.length ? html`<span class="secao-nota numero">${abertas.length}</span>` : null}
          </div>
          ${visiveis.length
            ? html`<ul class="lista">${visiveis.map((oc) => html`<${LinhaOcorrencia} key=${oc.chave} oc=${oc} mostrar="ambos" comSinal=${true} />`)}</ul>`
            : html`<${Vazio} titulo="Nada em aberto" texto=${esteMes ? 'Nenhuma conta atrasada e nada a vencer até o fim do mês.' : 'Nada para pagar ou receber neste mês.'} />`}
          ${abertas.length > visiveis.length
            ? html`<p class="mais-pendencias">
                <span>Mais ${abertas.length - visiveis.length} em aberto.</span>
                <button type="button" class="botao botao-texto" onClick=${() => irPara('despesas')}>Ver despesas</button>
                <button type="button" class="botao botao-texto" onClick=${() => irPara('recebiveis')}>Ver recebíveis</button>
              </p>`
            : null}
        </section>`}
  </main>`;
}

/* ---------------------------------------------------------------- despesas */

const FILTROS_DESPESAS = [
  { id: 'todas', nome: 'Todas' },
  { id: 'apagar', nome: 'A pagar' },
  { id: 'atrasadas', nome: 'Atrasadas' },
  { id: 'pagas', nome: 'Pagas' },
  { id: 'recorrentes', nome: 'Recorrentes' },
];

function ResumoTres({ itens }) {
  return html`<section class="cartao resumo-tres" aria-label="Resumo do mês">
    ${itens.map((i) => html`<div class="resumo-item" key=${i.rotulo}>
      <div class="resumo-rotulo">${i.rotulo}</div>
      <div class=${`resumo-valor ${i.tom || ''}${i.vazio ? ' sem-valor' : ''}`}>${i.vazio ? '—' : formatarReais(i.centavos)}</div>
    </div>`)}
  </section>`;
}

export function TelaDespesas() {
  const { estado, hojeISO, mes, mudarMes, abrir } = useApp();
  const [filtro, setFiltro] = useState('todas');
  const ocs = useMemo(() => ocorrenciasDoMes(estado.lancamentos, mes, 'despesa'), [estado.lancamentos, mes]);
  const total = ocs.reduce((s, oc) => s + oc.valorCentavos, 0);
  const pagas = ocs.filter((oc) => oc.pagoEm);
  const pago = pagas.reduce((s, oc) => s + oc.valorCentavos, 0);
  const filtradas = filtro === 'recorrentes' ? ocs.filter((oc) => oc.lancamento.repeticao.tipo !== 'nao') : ocs;
  const atrasadas = filtradas.filter((oc) => situacao(oc, hojeISO) === 'atrasada');
  const aVencer = filtradas.filter((oc) => situacao(oc, hojeISO) === 'aberta');
  const quitadas = filtradas.filter((oc) => situacao(oc, hojeISO) === 'paga');
  const grupos = [
    { id: 'atrasadas', titulo: 'Atrasadas', itens: atrasadas, alerta: true, mostrar: ['todas', 'apagar', 'atrasadas', 'recorrentes'] },
    { id: 'avencer', titulo: 'A vencer', itens: aVencer, alerta: false, mostrar: ['todas', 'apagar', 'recorrentes'] },
    { id: 'pagas', titulo: 'Pagas', itens: quitadas, alerta: false, mostrar: ['todas', 'pagas', 'recorrentes'] },
  ].filter((g) => g.mostrar.includes(filtro) && g.itens.length);
  const nomeMes = rotuloDoMes(mes, mesDaData(hojeISO));
  return html`<main class="tela" aria-labelledby="titulo-despesas">
    <header class="cabecalho">
      <h1 class="titulo-tela" id="titulo-despesas">Despesas</h1>
      <div class="cabecalho-acoes"><${MesNav} mes=${mes} aoMudar=${mudarMes} /></div>
    </header>
    <${ResumoTres} itens=${[
      { rotulo: 'Total do mês', centavos: total, vazio: !ocs.length },
      { rotulo: 'Pagas', centavos: pago, vazio: !ocs.length },
      { rotulo: 'A pagar', centavos: total - pago, vazio: !ocs.length, tom: total - pago > 0 ? 'tom-sai' : '' },
    ]} />
    ${ocs.length
      ? html`<div class="filtros" role="group" aria-label="Filtrar despesas">
          ${FILTROS_DESPESAS.map((f) => html`<button type="button" key=${f.id} class="filtro" aria-pressed=${filtro === f.id ? 'true' : 'false'} onClick=${() => setFiltro(f.id)}><span>${f.nome}</span></button>`)}
        </div>`
      : null}
    ${!ocs.length
      ? html`<${Vazio} titulo=${`Nenhuma despesa em ${nomeMes}`} texto="As despesas lançadas aparecem aqui, separadas entre atrasadas, a vencer e pagas.">
          <button type="button" class="botao botao-secundario botao-pequeno" onClick=${() => abrir({ tipo: 'formulario', tipoLancamento: 'despesa' })}>Lançar despesa</button>
        <//>`
      : grupos.length
        ? grupos.map((g) => html`<section class="grupo" key=${g.id} aria-labelledby=${`grupo-${g.id}`}>
            <h2 class=${`grupo-titulo${g.alerta ? ' tom-alerta' : ''}`} id=${`grupo-${g.id}`}>${g.titulo} · ${g.itens.length}</h2>
            <ul class="lista">${g.itens.map((oc) => html`<${LinhaOcorrencia} key=${oc.chave} oc=${oc} mostrar="categoria" />`)}</ul>
          </section>`)
        : html`<${Vazio} titulo="Nada com este filtro" texto="Escolha outro filtro para ver as demais despesas do mês." />`}
  </main>`;
}

/* ---------------------------------------------------------------- recebíveis */

export function TelaRecebiveis() {
  const { estado, hojeISO, mes, mudarMes, abrir, filtroPessoa, setFiltroPessoa } = useApp();
  const ocs = useMemo(() => ocorrenciasDoMes(estado.lancamentos, mes, 'recebivel'), [estado.lancamentos, mes]);
  const pessoaFiltrada = estado.pessoas.find((p) => p.id === filtroPessoa) || null;
  const total = ocs.reduce((s, oc) => s + oc.valorCentavos, 0);
  const recebido = ocs.filter((oc) => oc.pagoEm).reduce((s, oc) => s + oc.valorCentavos, 0);
  const pessoasMostradas = pessoaFiltrada ? [pessoaFiltrada] : estado.pessoas;
  const grupos = pessoasMostradas
    .map((p) => ({ pessoa: p, itens: ocs.filter((oc) => oc.lancamento.pessoaId === p.id) }))
    .filter((g) => g.itens.length);
  const nomeMes = rotuloDoMes(mes, mesDaData(hojeISO));
  return html`<main class="tela" aria-labelledby="titulo-recebiveis">
    <header class="cabecalho">
      <h1 class="titulo-tela" id="titulo-recebiveis">Recebíveis</h1>
      <div class="cabecalho-acoes"><${MesNav} mes=${mes} aoMudar=${mudarMes} /></div>
    </header>
    <${ResumoTres} itens=${[
      { rotulo: 'Previsto no mês', centavos: total, vazio: !ocs.length },
      { rotulo: 'Recebido', centavos: recebido, vazio: !ocs.length },
      { rotulo: 'A receber', centavos: total - recebido, vazio: !ocs.length, tom: total - recebido > 0 ? 'tom-entra' : '' },
    ]} />
    ${estado.pessoas.length > 1
      ? html`<div class="filtros" role="group" aria-label="Filtrar por pessoa">
          <button type="button" class="filtro" aria-pressed=${pessoaFiltrada ? 'false' : 'true'} onClick=${() => setFiltroPessoa(null)}><span>Todos</span></button>
          ${estado.pessoas.map((p) => html`<button type="button" key=${p.id} class="filtro" aria-pressed=${pessoaFiltrada && pessoaFiltrada.id === p.id ? 'true' : 'false'} onClick=${() => setFiltroPessoa(p.id)}>
            <span><span class="bolinha" style=${`background:${p.cor}`}></span>${p.nome}</span>
          </button>`)}
        </div>`
      : null}
    ${!estado.pessoas.length
      ? html`<${Vazio} titulo="Cadastre quem tem renda" texto="Cada recebível pertence a uma pessoa da família. Comece cadastrando quem recebe.">
          <button type="button" class="botao botao-secundario botao-pequeno" onClick=${() => abrir({ tipo: 'pessoa' })}>Cadastrar pessoa</button>
        <//>`
      : !grupos.length
        ? html`<${Vazio} titulo=${pessoaFiltrada ? `Nenhum recebível de ${pessoaFiltrada.nome} em ${nomeMes}` : `Nenhum recebível em ${nomeMes}`} texto="Salários, freelas e outras entradas lançadas aparecem aqui, separados por pessoa.">
            <button type="button" class="botao botao-secundario botao-pequeno" onClick=${() => abrir({ tipo: 'formulario', tipoLancamento: 'recebivel', pessoaId: pessoaFiltrada ? pessoaFiltrada.id : undefined })}>Lançar recebível</button>
          <//>`
        : grupos.map((g) => {
          const previsto = g.itens.reduce((s, oc) => s + oc.valorCentavos, 0);
          return html`<section class="grupo" key=${g.pessoa.id} aria-labelledby=${`pessoa-${g.pessoa.id}`}>
            <div class="pessoa-topo">
              <${Avatar} pessoa=${g.pessoa} pequeno=${true} />
              <h2 id=${`pessoa-${g.pessoa.id}`}>${g.pessoa.nome}</h2>
              <span class="numero">${formatarReais(previsto)} previstos</span>
            </div>
            <ul class="lista">${g.itens.map((oc) => html`<${LinhaOcorrencia} key=${oc.chave} oc=${oc} mostrar="nenhum" />`)}</ul>
          </section>`;
        })}
  </main>`;
}

/* ---------------------------------------------------------------- família */

export function TelaFamilia() {
  const { estado, hojeISO, mes, mudarMes, abrir } = useApp();
  const renda = useMemo(() => rendaPorPessoa(estado.lancamentos, estado.pessoas, mes), [estado.lancamentos, estado.pessoas, mes]);
  const total = renda.reduce((s, r) => s + r.previstoCentavos, 0);
  const nomeMes = rotuloDoMes(mes, mesDaData(hojeISO));
  return html`<main class="tela" aria-labelledby="titulo-familia">
    <header class="cabecalho">
      <h1 class="titulo-tela" id="titulo-familia">Família</h1>
      <div class="cabecalho-acoes">
        <${MesNav} mes=${mes} aoMudar=${mudarMes} />
        <button type="button" class="botao-icone" aria-label="Ajustes e backup" onClick=${() => abrir({ tipo: 'ajustes' })}><${Icone} nome="ajustes" /></button>
      </div>
    </header>
    ${estado.pessoas.length
      ? html`<section class="cartao" aria-labelledby="rotulo-renda">
          <h2 class="cartao-rotulo" id="rotulo-renda">Renda prevista da família em ${nomeMes}</h2>
          ${total
            ? html`<div class="saldo-valor"><span class="saldo-numero" style="font-size:34px;line-height:40px">${formatarReais(total)}</span></div>
                <div class="barra-renda" aria-hidden="true">
                  ${renda.filter((r) => r.previstoCentavos).map((r) => html`<span key=${r.pessoa.id} style=${`width:${(r.previstoCentavos / total) * 100}%;background:${r.pessoa.cor}`}></span>`)}
                </div>
                <ul class="legenda-renda">
                  ${renda.map((r) => html`<li key=${r.pessoa.id}>
                    <span class="bolinha" style=${`background:${r.pessoa.cor};width:8px;height:8px`}></span>
                    <span class="nome">${r.pessoa.nome}</span>
                    <span class="numero" style="font-weight:600">${r.previstoCentavos ? formatarReais(r.previstoCentavos) : '—'}</span>
                    <span class="pct">${r.previstoCentavos ? `${Math.round((r.previstoCentavos / total) * 100)}%` : ''}</span>
                  </li>`)}
                </ul>`
            : html`<div class="saldo-valor"><span class="saldo-vazio">—</span></div><p class="saldo-nota">Nenhum recebível lançado para ${nomeMes}.</p>`}
        </section>
        <section aria-labelledby="titulo-pessoas" style="display:flex;flex-direction:column;gap:8px">
          <h2 class="secao-titulo" id="titulo-pessoas" style="padding:0 4px">Pessoas com renda</h2>
          <ul class="pessoas">
            ${renda.map((r) => html`<li key=${r.pessoa.id}>
              <button type="button" class="cartao-pessoa" onClick=${() => abrir({ tipo: 'pessoa', pessoaId: r.pessoa.id })} aria-label=${`${r.pessoa.nome}: ver opções`}>
                <span class="cartao-pessoa-topo">
                  <${Avatar} pessoa=${r.pessoa} />
                  <span class="cartao-pessoa-nome">
                    <strong>${r.pessoa.nome}${r.pessoa.eu ? html`<span class="etiqueta">você</span>` : null}</strong>
                    <span>${r.quantidade === 0 ? `Nenhum recebível em ${nomeMes}` : `${r.quantidade} ${r.quantidade === 1 ? 'recebível' : 'recebíveis'} em ${nomeMes}`}</span>
                  </span>
                  <${Icone} nome="proximo" tamanho=${20} classe="tom-cinza" />
                </span>
                ${r.quantidade
                  ? html`<span style="display:block">
                      <span class="progresso-linha">
                        <span class="rotulo">Recebido</span>
                        <span class="numero"><strong>${formatarReais(r.recebidoCentavos)}</strong> <span style="color:var(--texto-3)">de ${formatarReais(r.previstoCentavos)}</span></span>
                      </span>
                      <span class="progresso" aria-hidden="true"><span style=${`width:${(r.recebidoCentavos / r.previstoCentavos) * 100}%;background:${r.pessoa.cor}`}></span></span>
                    </span>`
                  : null}
              </button>
            </li>`)}
          </ul>
          <button type="button" class="botao botao-tracejado" onClick=${() => abrir({ tipo: 'pessoa' })}><${Icone} nome="mais" tamanho=${18} />Adicionar pessoa</button>
        </section>`
      : html`<${Vazio} titulo="Ninguém cadastrado ainda" texto="Cadastre as pessoas da família que têm renda (salário, freelas, pensão...). Cada recebível fica no nome de quem recebe.">
          <button type="button" class="botao botao-secundario botao-pequeno" onClick=${() => abrir({ tipo: 'pessoa' })}>Adicionar pessoa</button>
        <//>`}
    <button type="button" class="botao botao-secundario botao-largo" onClick=${() => abrir({ tipo: 'ajustes' })}><${Icone} nome="ajustes" tamanho=${18} />Ajustes e backup dos dados</button>
  </main>`;
}

/* ---------------------------------------------------------------- abas */

const ABAS = [
  { id: 'inicio', nome: 'Início', icone: 'inicio' },
  { id: 'despesas', nome: 'Despesas', icone: 'sai' },
  { id: 'recebiveis', nome: 'Recebíveis', icone: 'entra' },
  { id: 'familia', nome: 'Família', icone: 'pessoas' },
];

export function BarraAbas({ rota }) {
  const { irPara, abrir } = useApp();
  const aba = (a) => html`<a href=${`#${a.id}`} key=${a.id} class="aba" aria-current=${rota === a.id ? 'page' : null}
      onClick=${(e) => { e.preventDefault(); irPara(a.id); }}>
    <${Icone} nome=${a.icone} />
    <span>${a.nome}</span>
  </a>`;
  const novo = () => abrir({ tipo: 'formulario', tipoLancamento: rota === 'recebiveis' ? 'recebivel' : 'despesa' });
  return html`<nav class="abas" aria-label="Navegação principal">
    ${aba(ABAS[0])}
    ${aba(ABAS[1])}
    <button type="button" class="aba-mais" aria-label=${rota === 'recebiveis' ? 'Novo recebível' : 'Novo lançamento'} onClick=${novo}><${Icone} nome="mais" tamanho=${26} /></button>
    ${aba(ABAS[2])}
    ${aba(ABAS[3])}
  </nav>`;
}
