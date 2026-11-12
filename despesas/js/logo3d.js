/**
 * Logo 3D interativa: placa escura com duas setas em alturas diferentes
 * (azul = o que entra, laranja = o que sai). Arrastar gira; tocar ou Enter dá uma volta.
 * Balança alguns segundos ao aparecer e depois de cada interação, e então para (economiza bateria).
 * Com "reduzir movimento" ligado no aparelho, fica parada.
 */

import * as THREE from '../vendor/three-0.159.0.module.min.js';

/* Medidas de desenho, em unidades da cena. São proporções da marca, não medidas reais. */
const PLACA = { lado: 2.0, raio: 0.46, espessura: 0.30, chanfro: 0.05 };
const SETA = { barra: 0.6125, haste: 1.114, meiaLargura: 0.105, espessura: 0.12, chanfro: 0.02 };
const ALTURA_ENTRA = 0.06;
const ALTURA_SAI = 0.30;
const REPOUSO = { giro: -0.32, inclinacao: -0.2 };
const DURACAO_OCIOSO = 4500;

/** Tira pontos repetidos do contorno; um ponto dobrado deforma o chanfro. */
function contornoLimpo(forma, divisoes) {
  const pontos = forma.getPoints(divisoes);
  const limpos = [];
  for (const ponto of pontos) {
    const anterior = limpos[limpos.length - 1];
    if (!anterior || anterior.distanceTo(ponto) > 1e-5) limpos.push(ponto);
  }
  if (limpos.length > 1 && limpos[0].distanceTo(limpos[limpos.length - 1]) <= 1e-5) limpos.pop();
  return new THREE.Shape(limpos);
}

function formaPlaca(lado, raio) {
  const m = lado / 2;
  const s = new THREE.Shape();
  s.moveTo(0, -m);
  s.lineTo(m - raio, -m);
  s.absarc(m - raio, -m + raio, raio, -Math.PI / 2, 0, false);
  s.lineTo(m, m - raio);
  s.absarc(m - raio, m - raio, raio, 0, Math.PI / 2, false);
  s.lineTo(-m + raio, m);
  s.absarc(-m + raio, m - raio, raio, Math.PI / 2, Math.PI, false);
  s.lineTo(-m, -m + raio);
  s.absarc(-m + raio, -m + raio, raio, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Seta com o canto na origem: barra para a direita, barra para cima e a haste na diagonal. */
function formaSeta(barra, haste, t) {
  const d = haste / Math.SQRT2;
  const q = t / Math.SQRT2;
  const j = t * (1 + Math.SQRT2);
  const s = new THREE.Shape();
  s.moveTo(barra / 2, -t);
  s.lineTo(barra, -t);
  s.absarc(barra, 0, t, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(j, t);
  s.lineTo(d + q, d - q);
  s.absarc(d, d, t, -Math.PI / 4, Math.PI * 0.75, false);
  s.lineTo(t, j);
  s.lineTo(t, barra);
  s.absarc(0, barra, t, 0, Math.PI, false);
  s.lineTo(-t, 0);
  s.absarc(0, 0, t, Math.PI, Math.PI * 1.5, false);
  return s;
}

const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const voltaCurta = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/**
 * Monta a cena no canvas. `palco` é o botão que recebe arraste, toque e teclado.
 * @param {HTMLElement} palco
 * @param {HTMLCanvasElement} canvas
 * @param {{ aoPrimeiroQuadro?: () => void }} [opcoes]
 * @returns {{ destruir: () => void } | null} null se o aparelho não liberar o 3D
 */
export function montarLogo3D(palco, canvas, opcoes = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (erro) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);
  const logo = new THREE.Group();
  cena.add(logo);

  const geoPlaca = new THREE.ExtrudeGeometry(contornoLimpo(formaPlaca(PLACA.lado - 2 * PLACA.chanfro, PLACA.raio - PLACA.chanfro), 20), {
    depth: PLACA.espessura, bevelEnabled: true, bevelThickness: PLACA.chanfro, bevelSize: PLACA.chanfro, bevelSegments: 4,
  });
  geoPlaca.translate(0, 0, -PLACA.espessura / 2);
  const matPlaca = new THREE.MeshStandardMaterial({ color: 0x24313B, roughness: 0.5, metalness: 0.2 });
  const placa = new THREE.Mesh(geoPlaca, matPlaca);
  placa.receiveShadow = true;
  placa.castShadow = true;
  logo.add(placa);
  const topoPlaca = PLACA.espessura / 2 + PLACA.chanfro;

  const geoSeta = new THREE.ExtrudeGeometry(contornoLimpo(formaSeta(SETA.barra, SETA.haste, SETA.meiaLargura - SETA.chanfro), 14), {
    depth: SETA.espessura, bevelEnabled: true, bevelThickness: SETA.chanfro, bevelSize: SETA.chanfro, bevelSegments: 3,
  });
  geoSeta.translate(0, 0, SETA.chanfro);
  const matEntra = new THREE.MeshStandardMaterial({ color: 0x7DD3FF, roughness: 0.42, metalness: 0.05 });
  const matSai = new THREE.MeshStandardMaterial({ color: 0xF5853B, roughness: 0.42, metalness: 0.05 });
  const setaEntra = new THREE.Mesh(geoSeta, matEntra);
  setaEntra.position.set(-SETA.barra, -0.0875, topoPlaca + ALTURA_ENTRA);
  const setaSai = new THREE.Mesh(geoSeta, matSai);
  setaSai.rotation.z = Math.PI;
  setaSai.position.set(SETA.barra, 0.0875, topoPlaca + ALTURA_SAI);
  for (const seta of [setaEntra, setaSai]) {
    seta.castShadow = true;
    seta.receiveShadow = true;
    logo.add(seta);
  }

  cena.add(new THREE.HemisphereLight(0xffffff, 0x4a5863, 1.7));
  const luz = new THREE.DirectionalLight(0xffffff, 1.9);
  luz.position.set(-2.4, 3.6, 5.4);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  Object.assign(luz.shadow.camera, { near: 1, far: 14, left: -1.9, right: 1.9, top: 1.9, bottom: -1.9 });
  luz.shadow.bias = -0.0004;
  luz.shadow.normalBias = 0.02;
  luz.shadow.radius = 5;
  cena.add(luz);
  const contorno = new THREE.DirectionalLight(0x9fd8ff, 0.9);
  contorno.position.set(3.2, -1.6, 2.6);
  cena.add(contorno);

  const atual = { giro: REPOUSO.giro, inclinacao: REPOUSO.inclinacao };
  const veloc = { giro: 0, inclinacao: 0 };
  const fixo = { giro: REPOUSO.giro, inclinacao: REPOUSO.inclinacao };
  let arraste = null;
  let ponteiro = null;
  let volta = null;
  let tempo = 0;
  let quadro = 0;
  let ultimo = 0;
  let primeiroQuadro = false;
  let encerrado = false;
  let naTela = true;
  let animarAte = performance.now() + DURACAO_OCIOSO;
  const consultaMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduzido = consultaMovimento.matches;
  const visivel = () => naTela && !document.hidden && !encerrado;
  const renovarOcioso = () => { animarAte = performance.now() + DURACAO_OCIOSO; };

  function ajustarTamanho() {
    const largura = palco.clientWidth || 200;
    const altura = palco.clientHeight || 200;
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
  }

  function desenhar(forca) {
    let extra = 0;
    if (volta) {
      const parte = limitar((performance.now() - volta.inicio) / volta.duracao, 0, 1);
      extra = Math.PI * 2 * suave(parte);
      if (parte >= 1) { volta = null; extra = 0; renovarOcioso(); }
    }
    logo.rotation.y = atual.giro + extra;
    logo.rotation.x = atual.inclinacao;
    logo.position.y = Math.sin(tempo * 0.9) * 0.03 * forca;
    renderer.render(cena, camera);
    if (!primeiroQuadro) {
      primeiroQuadro = true;
      canvas.dataset.chamadas = String(renderer.info.render.calls);
      canvas.dataset.triangulos = String(renderer.info.render.triangles);
      if (opcoes.aoPrimeiroQuadro) opcoes.aoPrimeiroQuadro();
    }
  }

  function passo(agora) {
    quadro = 0;
    if (encerrado) return;
    const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
    ultimo = agora;
    let parado = true;
    const forca = reduzido ? 0 : limitar((animarAte - agora) / 800, 0, 1);
    if (reduzido) {
      if (!arraste) { atual.giro = fixo.giro; atual.inclinacao = fixo.inclinacao; }
      veloc.giro = 0;
      veloc.inclinacao = 0;
    } else if (!arraste) {
      let alvoGiro = REPOUSO.giro;
      let alvoInclinacao = REPOUSO.inclinacao;
      if (forca > 0) {
        tempo += dt;
        const amplitude = (ponteiro ? 0.3 : 1) * forca;
        alvoGiro += Math.sin(tempo * 0.55) * 0.3 * amplitude;
        alvoInclinacao += Math.sin(tempo * 0.41 + 1) * 0.06 * amplitude;
        parado = false;
      }
      if (ponteiro) { alvoGiro += ponteiro.x * 0.55; alvoInclinacao += ponteiro.y * 0.4; }
      const rigidez = 38;
      const amortecimento = 2 * Math.sqrt(rigidez);
      veloc.giro += ((alvoGiro - atual.giro) * rigidez - veloc.giro * amortecimento) * dt;
      veloc.inclinacao += ((alvoInclinacao - atual.inclinacao) * rigidez - veloc.inclinacao * amortecimento) * dt;
      atual.giro += veloc.giro * dt;
      atual.inclinacao += veloc.inclinacao * dt;
      if (Math.abs(veloc.giro) + Math.abs(veloc.inclinacao) > 0.002
        || Math.abs(alvoGiro - atual.giro) + Math.abs(alvoInclinacao - atual.inclinacao) > 0.002) parado = false;
    } else {
      parado = false;
    }
    if (volta) parado = false;
    desenhar(forca);
    if (!parado) acordar();
  }

  function acordar() {
    if (quadro || !visivel()) return;
    ultimo = performance.now();
    quadro = requestAnimationFrame(passo);
  }

  function darUmaVolta() {
    if (reduzido) { fixo.giro = voltaCurta(fixo.giro + Math.PI); acordar(); return; }
    if (volta) return;
    volta = { inicio: performance.now(), duracao: 800 };
    acordar();
  }

  function aoApertar(e) {
    if (e.button !== undefined && e.button !== 0) return;
    arraste = { id: e.pointerId, x: e.clientX, y: e.clientY, giro: atual.giro, inclinacao: atual.inclinacao, andou: 0, ut: performance.now() };
    veloc.giro = 0;
    veloc.inclinacao = 0;
    try { palco.setPointerCapture(e.pointerId); } catch (erro) { /* o arraste segue dentro do palco */ }
    palco.classList.add('arrastando');
    acordar();
  }
  function aoMover(e) {
    if (arraste && e.pointerId === arraste.id) {
      const dx = e.clientX - arraste.x;
      const dy = e.clientY - arraste.y;
      arraste.andou = Math.max(arraste.andou, Math.abs(dx) + Math.abs(dy));
      const agora = performance.now();
      const dt = Math.max((agora - arraste.ut) / 1000, 0.001);
      const novoGiro = arraste.giro + dx * 0.009;
      const novaInclinacao = limitar(arraste.inclinacao + dy * 0.007, -1.1, 1.1);
      veloc.giro = limitar((novoGiro - atual.giro) / dt, -12, 12);
      veloc.inclinacao = limitar((novaInclinacao - atual.inclinacao) / dt, -12, 12);
      atual.giro = novoGiro;
      atual.inclinacao = novaInclinacao;
      arraste.ut = agora;
      acordar();
      return;
    }
    if (e.pointerType === 'mouse' && !reduzido) {
      const caixa = palco.getBoundingClientRect();
      ponteiro = {
        x: limitar((e.clientX - caixa.left) / caixa.width - 0.5, -0.5, 0.5),
        y: limitar((e.clientY - caixa.top) / caixa.height - 0.5, -0.5, 0.5),
      };
      acordar();
    }
  }
  function soltar(e, cancelado) {
    if (!arraste || e.pointerId !== arraste.id) return;
    const foiToque = !cancelado && arraste.andou < 6;
    arraste = null;
    palco.classList.remove('arrastando');
    if (reduzido) { fixo.giro = voltaCurta(atual.giro); fixo.inclinacao = atual.inclinacao; }
    else atual.giro = REPOUSO.giro + voltaCurta(atual.giro - REPOUSO.giro);
    renovarOcioso();
    if (foiToque) { veloc.giro = 0; veloc.inclinacao = 0; darUmaVolta(); }
    acordar();
  }
  const aoSoltar = (e) => soltar(e, false);
  const aoCancelar = (e) => soltar(e, true);
  const aoSair = () => { ponteiro = null; renovarOcioso(); acordar(); };
  /* Clique vindo do teclado (Enter ou espaço). Toque e mouse já são tratados ao soltar. */
  const aoClicar = (e) => { if (e.detail === 0) darUmaVolta(); };
  const aoMudarMovimento = () => {
    reduzido = consultaMovimento.matches;
    if (reduzido) { volta = null; ponteiro = null; fixo.giro = REPOUSO.giro; fixo.inclinacao = REPOUSO.inclinacao; } else renovarOcioso();
    acordar();
  };
  const aoMudarVisibilidade = () => acordar();
  const observadorTamanho = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { ajustarTamanho(); acordar(); }) : null;
  const observadorTela = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((itens) => { naTela = itens[itens.length - 1].isIntersecting; acordar(); })
    : null;

  palco.addEventListener('pointerdown', aoApertar);
  palco.addEventListener('pointermove', aoMover);
  palco.addEventListener('pointerup', aoSoltar);
  palco.addEventListener('pointercancel', aoCancelar);
  palco.addEventListener('pointerleave', aoSair);
  palco.addEventListener('click', aoClicar);
  if (consultaMovimento.addEventListener) consultaMovimento.addEventListener('change', aoMudarMovimento);
  document.addEventListener('visibilitychange', aoMudarVisibilidade);
  if (observadorTamanho) observadorTamanho.observe(palco);
  if (observadorTela) observadorTela.observe(palco);
  const aoPerderContexto = (e) => { e.preventDefault(); encerrado = true; if (quadro) cancelAnimationFrame(quadro); quadro = 0; };
  canvas.addEventListener('webglcontextlost', aoPerderContexto);

  /* Leitura da pose, usada nos testes automáticos. */
  canvas.lerPose = () => ({ giro: logo.rotation.y, inclinacao: logo.rotation.x, rodando: quadro !== 0 });

  ajustarTamanho();
  acordar();

  return {
    destruir() {
      encerrado = true;
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
      palco.removeEventListener('pointerdown', aoApertar);
      palco.removeEventListener('pointermove', aoMover);
      palco.removeEventListener('pointerup', aoSoltar);
      palco.removeEventListener('pointercancel', aoCancelar);
      palco.removeEventListener('pointerleave', aoSair);
      palco.removeEventListener('click', aoClicar);
      if (consultaMovimento.removeEventListener) consultaMovimento.removeEventListener('change', aoMudarMovimento);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      canvas.removeEventListener('webglcontextlost', aoPerderContexto);
      if (observadorTamanho) observadorTamanho.disconnect();
      if (observadorTela) observadorTela.disconnect();
      geoPlaca.dispose();
      geoSeta.dispose();
      matPlaca.dispose();
      matEntra.dispose();
      matSai.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
