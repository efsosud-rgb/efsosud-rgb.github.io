/*
 * Service worker do Controle de Despesas: guarda os arquivos do app para ele abrir sem internet.
 *
 * O bloco entre os marcadores abaixo é gerado. Depois de mudar QUALQUER arquivo do app, rode:
 *   node ferramentas/atualizar-sw.mjs
 * Isso muda a VERSAO; o navegador baixa a versão nova inteira e o app mostra "Há uma versão nova".
 * Os testes (npm test) falham se este bloco estiver desatualizado.
 */

// <gerado por ferramentas/atualizar-sw.mjs: não edite à mão>
const VERSAO = 'e0d1fe8201d1';
const ARQUIVOS = [
  "./",
  "./css/app.css",
  "./fontes/LICENCA-Inter-OFL.txt",
  "./fontes/LICENCA-Space-Grotesk-OFL.txt",
  "./fontes/inter-latin-wght-normal.woff2",
  "./fontes/space-grotesk-latin-600-normal.woff2",
  "./icones/apple-touch-icon.png",
  "./icones/favicon-32.png",
  "./icones/icone-192.png",
  "./icones/icone-512.png",
  "./icones/icone-maskable-192.png",
  "./icones/icone-maskable-512.png",
  "./index.html",
  "./js/acoes.js",
  "./js/app.js",
  "./js/boas-vindas.js",
  "./js/categorias.js",
  "./js/contexto.js",
  "./js/dados.js",
  "./js/datas.js",
  "./js/dinheiro.js",
  "./js/folhas.js",
  "./js/instalacao-ui.js",
  "./js/instalar.js",
  "./js/logo3d.js",
  "./js/loja.js",
  "./js/recorrencia.js",
  "./js/resumo.js",
  "./js/telas.js",
  "./js/ui.js",
  "./manifest.webmanifest",
  "./vendor/LICENCAS.txt",
  "./vendor/preact-htm-3.1.1.module.js",
  "./vendor/three-0.159.0.module.min.js"
];
// </gerado>

const CACHE = `controle-despesas-${VERSAO}`;

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('controle-despesas-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'atualizar') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const pagina = await cache.match('./index.html');
      if (pagina) return pagina;
      return fetch(pedido);
    })());
    return;
  }

  evento.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(pedido, { ignoreSearch: true });
    return guardado || fetch(pedido);
  })());
});
