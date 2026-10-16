// Página do motor: carrega uma composição, mede o CSS, prepara imagens e grão, e expõe
// window.__carregar(comp) e window.__quadro(t) para quem grava. Sem ?render na URL, vira a prévia:
// lista os vídeos de /composicoes.json, toca com o som e deixa arrastar a linha do tempo.

import { desenharQuadro } from "./quadro.mjs";
import { medirLayout } from "./layout.mjs";
import { mulberry32 } from "./util.mjs";
import MOVIMENTO from "./movimento.mjs";

const canvas = document.getElementById("quadro");
const ctx = canvas.getContext("2d");
let comp = null, kit = null;

const carregarImagem = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

function texturaGrao() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d"), img = g.createImageData(256, 256), r = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}

window.__carregar = async (c) => {
  comp = c;
  document.getElementById("molde").className = c.classes;
  await document.fonts.ready;
  await Promise.all(["800 32px Poppins", "600 32px Poppins", '400 32px "Archivo Black"', '700 32px "Baloo 2"', "400 32px Nunito"].map((f) => document.fonts.load(f)));
  const icones = {};
  for (const nome of new Set(c.cenas.map((x) => x.icone).filter(Boolean))) icones[nome] = await carregarImagem(`../miniaturas/icones/${nome}.svg`);
  kit = { ...medirLayout(document), movimento: MOVIMENTO, usuario: c.usuario, imagens: { logo: await carregarImagem("../assets/Marca/logo-po-fundo-escuro.png"), icones }, grao: texturaGrao() };
  desenharQuadro(ctx, comp, 0, kit);
  return true;
};

window.__quadro = (t) => desenharQuadro(ctx, comp, t, kit);

async function iniciarPrevia() {
  const r = await fetch("/composicoes.json");
  if (!r.ok) return;
  const itens = await r.json();
  document.body.classList.add("previa");
  const $ = (id) => document.getElementById(id);
  const qual = $("qual"), botao = $("tocar"), tempo = $("tempo"), relogio = $("relogio");
  const audio = new Audio();
  let atual = 0, tocando = false, t = 0, inicioRelogio = 0;
  itens.forEach((it, i) => qual.add(new Option(it.nome, String(i))));
  const mostrar = () => { window.__quadro(t); tempo.value = String(t); relogio.textContent = `${t.toFixed(1).replace(".", ",")} s`; };
  const parar = () => { tocando = false; audio.pause(); botao.textContent = "▶ Tocar"; };
  async function escolher(i) {
    parar(); atual = i; t = 0;
    await window.__carregar(itens[i].comp);
    tempo.max = String(itens[i].comp.duracao);
    audio.src = itens[i].audio ?? "";
    mostrar();
  }
  function laco() {
    if (!tocando) return;
    t = itens[atual].audio ? audio.currentTime : (performance.now() - inicioRelogio) / 1000;
    if (t >= itens[atual].comp.duracao) { t = itens[atual].comp.duracao; mostrar(); parar(); return; }
    mostrar();
    requestAnimationFrame(laco);
  }
  botao.onclick = () => {
    if (tocando) { parar(); return; }
    if (t >= itens[atual].comp.duracao - 0.05) t = 0;
    tocando = true; botao.textContent = "❚❚ Pausar";
    inicioRelogio = performance.now() - t * 1000;
    if (itens[atual].audio) { audio.currentTime = t; audio.play(); }
    requestAnimationFrame(laco);
  };
  tempo.oninput = () => { t = Number(tempo.value); if (tocando) { inicioRelogio = performance.now() - t * 1000; audio.currentTime = t; } mostrar(); };
  qual.onchange = () => escolher(Number(qual.value));
  document.addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); botao.click(); }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { t = Math.max(0, Math.min(itens[atual].comp.duracao, t + (e.key === "ArrowRight" ? 1 : -1) / 30)); mostrar(); }
  });
  await escolher(0);
}

if (!new URLSearchParams(location.search).has("render")) iniciarPrevia();
