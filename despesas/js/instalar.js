/**
 * Instalação na tela inicial do celular.
 * Android/Chrome avisa que o app pode ser instalado (evento beforeinstallprompt); o iPhone não avisa,
 * então lá o app mostra o passo a passo do botão Compartilhar.
 */

/** @type {any} */
let pedidoGuardado = null;
let instaladoAgora = false;
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoGuardado = e;
  avisar();
});
window.addEventListener('appinstalled', () => {
  pedidoGuardado = null;
  instaladoAgora = true;
  avisar();
});

/** O app está aberto como app instalado (e não dentro do navegador)? */
export function abertoComoApp() {
  return instaladoAgora
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || /** @type {any} */ (navigator).standalone === true;
}

/** Em que aparelho e navegador o app foi aberto. */
export function plataforma() {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const dentroDeOutroApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat|LinkedInApp/i.test(ua);
  return { ios, android, dentroDeOutroApp, computador: !ios && !android };
}

export function podePedirInstalacao() {
  return Boolean(pedidoGuardado);
}

/** Abre a janela de instalação do navegador. Devolve 'accepted', 'dismissed' ou 'indisponivel'. */
export async function pedirInstalacao() {
  if (!pedidoGuardado) return 'indisponivel';
  const pedido = pedidoGuardado;
  pedidoGuardado = null;
  avisar();
  try {
    await pedido.prompt();
    const escolha = await pedido.userChoice;
    return escolha && escolha.outcome ? escolha.outcome : 'dismissed';
  } catch (erro) {
    return 'indisponivel';
  }
}

/** @param {() => void} funcao */
export function ouvirInstalacao(funcao) {
  ouvintes.add(funcao);
  return () => ouvintes.delete(funcao);
}
