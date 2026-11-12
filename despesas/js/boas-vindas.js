/** Primeira tela, só no primeiro uso: logo 3D, nome (opcional) e como instalar. */

import { html, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { concluirBoasVindas, novoId, validarNome } from './acoes.js';
import { useApp } from './contexto.js';
import { Logo3D } from './ui.js';
import { InstrucoesInstalar, useInstalacao } from './instalacao-ui.js';

export function BoasVindas() {
  const { atualizar } = useApp();
  const { instalado } = useInstalacao();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState(/** @type {string | null} */ (null));

  const comecar = (e) => {
    e.preventDefault();
    if (nome.trim()) {
      const problema = validarNome(nome);
      if (problema) { setErro(problema); return; }
    }
    atualizar((est) => concluirBoasVindas(est, { nome, id: novoId('p'), agoraISO: new Date().toISOString() }));
    window.scrollTo(0, 0);
  };

  return html`<main class="boas-vindas" aria-labelledby="titulo-boas-vindas">
    <div class="boas-vindas-topo">
      <${Logo3D} tamanho=${200} />
      <h1 id="titulo-boas-vindas">Controle de Despesas</h1>
      <p class="boas-vindas-texto">Despesas, recebíveis e a renda de cada pessoa da família em um só lugar.</p>
    </div>
    <form onSubmit=${comecar} novalidate>
      <div class="campo">
        <label class="campo-rotulo" for="campo-nome">Como você se chama? <span style="font-weight:400">(opcional)</span></label>
        <input id="campo-nome" class="campo-entrada" type="text" maxlength="40" autocomplete="given-name" autocapitalize="words" enterkeyhint="go"
          value=${nome} onInput=${(e) => { setNome(e.currentTarget.value); setErro(null); }}
          aria-invalid=${erro ? 'true' : 'false'} aria-describedby=${erro ? 'erro-nome' : 'dica-nome'} />
        ${erro
          ? html`<p class="campo-erro" id="erro-nome">${erro}</p>`
          : html`<p class="campo-dica" id="dica-nome">Serve para separar a sua renda da renda das outras pessoas da família.</p>`}
      </div>
      <button type="submit" class="botao botao-primario botao-largo">Começar</button>
    </form>
    <div class="cartao-info">
      <strong>Seus dados ficam só neste aparelho</strong>
      <p>Não precisa de conta nem de internet. Para levar os dados para outro aparelho, exporte um backup em Família › Ajustes.</p>
    </div>
    ${instalado
      ? null
      : html`<div class="cartao-info">
          <strong>Instale no celular</strong>
          <${InstrucoesInstalar} />
        </div>`}
  </main>`;
}
