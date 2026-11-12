/*
 * O Controle de Despesas mudou para https://efsosud-rgb.github.io/controle-despesas/
 * (repositório efsosud-rgb/controle-despesas).
 *
 * Este arquivo substitui o service worker do endereço antigo. Quando um app instalado pelo endereço antigo
 * procura atualização, recebe este: ele apaga o cache antigo, leva as janelas abertas para o endereço novo
 * e se desliga. O cache do app novo tem outro nome e não é tocado.
 */

const NOVO = '/controle-despesas/';
const CACHE_ANTIGO = /^controle-despesas-[0-9a-f]{12}$/;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((nome) => CACHE_ANTIGO.test(nome)).map((nome) => caches.delete(nome)));
    await self.clients.claim();
    const janelas = await self.clients.matchAll({ type: 'window' });
    await Promise.all(janelas.map((janela) => janela.navigate(NOVO + new URL(janela.url).hash).catch(() => null)));
    await self.registration.unregister();
  })());
});
