/** Partes da interface que explicam e pedem a instalação do app. */

import { html, useEffect, useState } from '../vendor/preact-htm-3.1.1.module.js';
import { abertoComoApp, plataforma, podePedirInstalacao, pedirInstalacao, ouvirInstalacao } from './instalar.js';
import { useApp } from './contexto.js';
import { Icone, Folha } from './ui.js';
import { fecharAvisoInstalar } from './acoes.js';

export function useInstalacao() {
  const [, forcar] = useState(0);
  useEffect(() => ouvirInstalacao(() => forcar((n) => n + 1)), []);
  return { instalado: abertoComoApp(), podePedir: podePedirInstalacao(), aparelho: plataforma() };
}

/** Passo a passo de instalação para o aparelho em uso. */
export function InstrucoesInstalar() {
  const { avisar } = useApp();
  const { instalado, podePedir, aparelho } = useInstalacao();
  if (instalado) return html`<p>O app já está instalado e aberto pela tela inicial deste aparelho.</p>`;
  if (aparelho.dentroDeOutroApp) {
    return html`<p>O link foi aberto dentro de outro app (Instagram, Facebook ou parecido), e por ali não dá para instalar.
      Toque no menu desse app e escolha <strong>Abrir no navegador</strong> (Chrome no Android, Safari no iPhone).</p>`;
  }
  if (podePedir) {
    const instalar = async () => {
      const resultado = await pedirInstalacao();
      if (resultado === 'accepted') avisar('Instalando o app na tela inicial');
    };
    return html`<div style="display:flex;flex-direction:column;gap:8px">
      <p>Toque no botão abaixo e confirme. O ícone do app aparece na tela inicial.</p>
      <button type="button" class="botao botao-primario" onClick=${instalar}><${Icone} nome="baixar" tamanho=${18} />Instalar o app</button>
    </div>`;
  }
  if (aparelho.ios) {
    return html`<ol class="instrucoes">
      <li>No Safari, toque em <strong>Compartilhar</strong> <span class="icone-inline"><${Icone} nome="compartilhar" tamanho=${16} /></span> (na barra de baixo ou do endereço).</li>
      <li>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</li>
      <li>Toque em <strong>Adicionar</strong>. O ícone aparece na tela inicial.</li>
    </ol>`;
  }
  if (aparelho.android) {
    return html`<ol class="instrucoes">
      <li>Toque no menu do navegador <span class="icone-inline"><${Icone} nome="menu" tamanho=${16} /></span> (no Chrome, fica no canto de cima).</li>
      <li>Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
      <li>Confirme. O ícone aparece na tela inicial.</li>
    </ol>`;
  }
  return html`<p>No computador, use o Chrome ou o Edge e clique no ícone de instalar na barra de endereço.
    Para usar no celular, abra este mesmo link no navegador do celular.</p>`;
}

/** Cartão na tela inicial, enquanto o app não estiver instalado. */
export function AvisoInstalar() {
  const { estado, atualizar, abrir } = useApp();
  const { instalado, podePedir, aparelho } = useInstalacao();
  if (instalado || estado.preferencias.avisoInstalarFechado) return null;
  const instalar = async () => {
    const resultado = await pedirInstalacao();
    if (resultado === 'indisponivel') abrir({ tipo: 'instalar' });
  };
  return html`<section class="aviso-instalar" aria-labelledby="titulo-instalar">
    <span class="atalho-icone"><${Icone} nome="celular" tamanho=${18} /></span>
    <div class="aviso-instalar-texto">
      <strong id="titulo-instalar">Instale no celular</strong>
      <p>Fica na tela inicial como um app e funciona sem internet.</p>
      <div class="aviso-instalar-acoes">
        ${podePedir && !aparelho.dentroDeOutroApp
          ? html`<button type="button" class="botao botao-primario botao-pequeno" onClick=${instalar}>Instalar</button>`
          : html`<button type="button" class="botao botao-secundario botao-pequeno" onClick=${() => abrir({ tipo: 'instalar' })}>Como instalar</button>`}
      </div>
    </div>
    <button type="button" class="botao-icone" aria-label="Não mostrar este aviso de novo" onClick=${() => atualizar(fecharAvisoInstalar)}><${Icone} nome="fechar" tamanho=${18} /></button>
  </section>`;
}

export function FolhaInstalar({ aoFechar }) {
  return html`<${Folha} titulo="Instalar o app" aoFechar=${aoFechar}>
    <div class="cartao-info">
      <strong>Passo a passo</strong>
      <${InstrucoesInstalar} />
    </div>
    <p class="texto-folha">Instalado, o app abre pela tela inicial, funciona sem internet e os dados continuam guardados neste aparelho.</p>
  <//>`;
}
