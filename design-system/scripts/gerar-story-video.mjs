#!/usr/bin/env node
// Gera os vídeos de uma sequência de stories (1080×1920, MP4 H.264 com faixa de áudio
// muda) a partir de instagram/<pasta>/stories.json: uma cena por story, com kicker,
// título, linhas ou itens numerados, pergunta e ícone entrando um a um. O sticker
// (quiz, enquete, link) não sai daqui: a pessoa adiciona no app, no espaço livre acima
// do rodapé — o roteiro de qual sticker vai em cada story fica em stories.md, na mesma
// pasta.
//
// stories.json pode ter "publicacao": "api" (sem sticker: sai pela API,
// node scripts/instagram.mjs --publicar-stories) ou "manual" (padrão: com sticker, pelo app).
//
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta>            # story-NN.mp4 + story-NN.png (último quadro)
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --so-html  # só story-NN.html, para inspecionar no navegador
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --so 2     # só o story 2
//
// Como grava: abre cada HTML num Chromium headless (puppeteer-core, mesmo navegador do
// exportar.sh), pausa as animações CSS, avança o relógio quadro a quadro e tira uma
// captura por quadro; o ffmpeg (ffmpeg-static) junta tudo em MP4.

import { readFileSync, writeFileSync, unlinkSync, existsSync, accessSync, constants } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, esc } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));

export class ErroStoryVideo extends Error {}

export const LIMITES = {
  stories: { min: 1, max: 10 },
  duracao: { min: 5, max: 60 },            // segundos; o Instagram corta em 60
  fps: 30,
  campos: { kicker: 40, titulo: 60, linha: 90, item_titulo: 20, item_texto: 90, pergunta: 60, dica: 30, faixa: 40 },
  linhas: 6,
  itens: 4,
  folga: 2,                                // segundos de tela cheia depois do último bloco entrar
};

export const PUBLICACOES = ["api", "manual"];   // api: sem sticker, sai pela API; manual: com sticker, pelo app (ADR-0007)

// Instantes de entrada (segundos) de cada bloco da cena.
const RITMO = { kicker: 0, titulo: 0.3, primeiro: 1.2, linha: 1.1, item: 1.6, pergunta: 1.2, dica: 0.8 };

const tamanho = (s) => String(s ?? "").replace(/\n/g, "").length;

function checar(campo, valor, limite, onde) {
  if (tamanho(valor) > limite) throw new ErroStoryVideo(`${onde}: "${campo}" tem ${tamanho(valor)} caracteres; o máximo é ${limite}`);
}

// Valida stories.json e devolve os stories com os instantes de entrada calculados.
export function validar(spec) {
  if (spec?.tipo !== "stories" || !Array.isArray(spec.stories)) throw new ErroStoryVideo('stories.json precisa de "tipo": "stories" e uma lista "stories"');
  if (spec.publicacao != null && !PUBLICACOES.includes(spec.publicacao)) throw new ErroStoryVideo(`"publicacao" deve ser "api" (sem sticker, sai pela API) ou "manual" (com sticker, pelo app)`);
  const { min, max } = LIMITES.stories;
  if (spec.stories.length < min || spec.stories.length > max) throw new ErroStoryVideo(`a sequência tem ${spec.stories.length} stories; o permitido é de ${min} a ${max}`);
  return spec.stories.map((s, i) => {
    const onde = `story ${i + 1}`;
    const duracao = Number(s.duracao);
    if (!(duracao >= LIMITES.duracao.min && duracao <= LIMITES.duracao.max)) throw new ErroStoryVideo(`${onde}: "duracao" deve ser um número de ${LIMITES.duracao.min} a ${LIMITES.duracao.max} segundos`);
    if (!s.kicker && !s.titulo) throw new ErroStoryVideo(`${onde}: precisa de "kicker" ou "titulo"`);
    if (s.linhas && s.itens) throw new ErroStoryVideo(`${onde}: use "linhas" ou "itens", não os dois`);
    for (const c of ["kicker", "titulo", "pergunta", "dica", "faixa"]) if (s[c] != null) checar(c, s[c], LIMITES.campos[c], onde);
    const linhas = s.linhas ?? [], itens = s.itens ?? [];
    if (linhas.length > LIMITES.linhas) throw new ErroStoryVideo(`${onde}: ${linhas.length} linhas; o máximo é ${LIMITES.linhas}`);
    if (itens.length > LIMITES.itens) throw new ErroStoryVideo(`${onde}: ${itens.length} itens; o máximo é ${LIMITES.itens}`);
    linhas.forEach((l, j) => checar(`linhas[${j + 1}]`, l, LIMITES.campos.linha, onde));
    itens.forEach((it, j) => {
      if (!it?.titulo || !it?.texto) throw new ErroStoryVideo(`${onde}: itens[${j + 1}] precisa de "titulo" e "texto"`);
      checar(`itens[${j + 1}].titulo`, it.titulo, LIMITES.campos.item_titulo, onde);
      checar(`itens[${j + 1}].texto`, it.texto, LIMITES.campos.item_texto, onde);
    });
    if (s.icone && !existsSync(join(DS, "miniaturas/icones", `${s.icone}.svg`))) throw new ErroStoryVideo(`${onde}: ícone "${s.icone}" não existe em design-system/miniaturas/icones/`);

    // linha do tempo
    const t = { kicker: RITMO.kicker, titulo: RITMO.titulo, blocos: [], pergunta: null, dica: null };
    let cursor = RITMO.primeiro;
    const passo = itens.length ? RITMO.item : RITMO.linha;
    for (let j = 0; j < (linhas.length || itens.length); j++) { t.blocos.push(cursor); cursor += passo; }
    let fim = t.blocos.length ? t.blocos.at(-1) : t.titulo;
    if (s.pergunta) { t.pergunta = fim + RITMO.pergunta; fim = t.pergunta; }
    if (s.dica) { t.dica = fim + RITMO.dica; fim = t.dica; }
    const minimo = Math.ceil((fim + LIMITES.folga) * 10) / 10;
    if (duracao < minimo) throw new ErroStoryVideo(`${onde}: o último bloco entra aos ${fim.toFixed(1)} s; "duracao" precisa ser de pelo menos ${minimo} s`);
    return { ...s, duracao, linhas, itens, tempos: t };
  });
}

const anim = (t) => `class="sv__anim" style="--t: ${t}s"`;
const quebras = (s) => esc(s).replace(/\n/g, "<br>");

function conteudoHtml(s) {
  const { tempos: t } = s;
  const partes = [];
  if (s.kicker) partes.push(`    <p class="ig__kicker sv__anim" style="--t: ${t.kicker}s">${esc(s.kicker)}</p>`);
  if (s.titulo) partes.push(`    <h1 class="ig__titulo${tamanho(s.titulo) > 24 ? " ig__titulo--medio" : ""} sv__anim" style="--t: ${t.titulo}s">${quebras(s.titulo)}</h1>`);
  if (s.linhas.length) s.linhas.forEach((l, j) => partes.push(`    <p class="ig__corpo sv__anim" style="--t: ${t.blocos[j]}s">${quebras(l)}</p>`));
  if (s.itens.length) {
    partes.push(`    <ol class="sv__itens">`);
    s.itens.forEach((it, j) => partes.push(`      <li class="sv__item sv__anim" style="--t: ${t.blocos[j]}s"><span class="sv__item-numero">${j + 1}</span><h2 class="sv__item-titulo">${esc(it.titulo)}</h2><p class="sv__item-texto">${quebras(it.texto)}</p></li>`));
    partes.push(`    </ol>`);
  }
  if (s.pergunta) partes.push(`    <p class="sv__pergunta sv__anim" style="--t: ${t.pergunta}s">${quebras(s.pergunta)}</p>`);
  if (s.icone) partes.push(`    <div class="ig__icone sv__anim" style="--t: ${t.titulo}s"><img src="{{ds}}/miniaturas/icones/${esc(s.icone)}.svg" alt=""></div>`);
  return partes.join("\n");
}

export function htmlDaCena(s, ds, { semSticker = false } = {}) {
  const modelo = readFileSync(join(DS, "instagram/layouts/story-cena.html"), "utf8");
  const conteudo = conteudoHtml(s).replace(/\{\{ds\}\}/g, ds);
  return preencher(modelo, {
    ds, conteudo, usuario: canal.instagramUsuario,
    classe_extra: semSticker ? " ig--sem-sticker" : "",
    titulo_pagina: `${s.kicker ?? ""} ${s.titulo ?? ""} — story`.trim(),
    dica: s.dica, dica_t: s.tempos.dica, faixa: s.faixa,
  }, { brutos: ["ds", "conteudo"] });
}

// Mesma lista de candidatos do exportar.sh.
export function acharNavegador() {
  const home = process.env.HOME ?? "";
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ...["google-chrome", "chromium", "microsoft-edge"].map((n) => { try { return execSync(`command -v ${n}`, { stdio: "pipe" }).toString().trim(); } catch { return ""; } }),
  ];
  for (const c of candidatos) {
    if (!c) continue;
    try { accessSync(c, constants.X_OK); return c; } catch { /* próximo */ }
  }
  throw new ErroStoryVideo("nenhum Chrome/Chromium/Edge encontrado; defina CHROME=/caminho/do/navegador");
}

// A Meta rejeita MP4 sem faixa de áudio: entra uma faixa AAC muda (anullsrc), cortada no fim do vídeo (-shortest).
export function argsFfmpeg(mp4, fps = LIMITES.fps) {
  return [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    mp4,
  ];
}

export async function gravarCena(html, mp4, pngFinal, { duracao, largura, altura }) {
  const [{ default: puppeteer }, { default: ffmpeg }] = await Promise.all([import("puppeteer-core"), import("ffmpeg-static")]);
  const fps = LIMITES.fps, quadros = Math.round(duracao * fps);
  const browser = await puppeteer.launch({ executablePath: acharNavegador(), headless: true, args: ["--hide-scrollbars", "--disable-gpu"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready.then(() => { for (const a of document.getAnimations()) a.pause(); }));

    const ff = spawn(ffmpeg, argsFfmpeg(mp4, fps), { stdio: ["pipe", "inherit", "inherit"] });
    const terminou = new Promise((ok, falha) => { ff.on("error", falha); ff.on("close", (c) => (c === 0 ? ok() : falha(new ErroStoryVideo(`ffmpeg terminou com código ${c}`)))); });

    let ultimo;
    for (let i = 0; i < quadros; i++) {
      await page.evaluate((ms) => { for (const a of document.getAnimations()) a.currentTime = ms; }, (i * 1000) / fps);
      ultimo = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: largura, height: altura } });
      if (!ff.stdin.write(ultimo)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await terminou;
    writeFileSync(pngFinal, ultimo);
  } finally {
    await browser.close();
  }
}

// Grava cenas já validadas em <pasta>/<prefixo>-NN.mp4 (+ .png do último quadro); com numerar: false, <prefixo>.mp4.
export async function renderizarCenas(cenas, { pasta, prefixo = "story", numerar = true, soHtml = false, so = null, semSticker = false }) {
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const { largura, altura } = formatos.formatos.story;
  const saidas = [];
  for (const [i, s] of cenas.entries()) {
    if (so && so !== i + 1) continue;
    const base = numerar ? `${prefixo}-${String(i + 1).padStart(2, "0")}` : prefixo;
    const html = join(pasta, `${base}.html`);
    writeFileSync(html, htmlDaCena(s, ds, { semSticker }));
    if (soHtml) { saidas.push(html); continue; }
    const mp4 = join(pasta, `${base}.mp4`), png = join(pasta, `${base}.png`);
    await gravarCena(html, mp4, png, { duracao: s.duracao, largura, altura });
    unlinkSync(html);
    saidas.push(mp4);
  }
  return saidas;
}

export async function gerarStoryVideo(pasta, { soHtml = false, so = null } = {}) {
  const arquivo = join(pasta, "stories.json");
  if (!existsSync(arquivo)) throw new ErroStoryVideo(`não achei ${arquivo}`);
  const spec = JSON.parse(readFileSync(arquivo, "utf8"));
  return renderizarCenas(validar(spec), { pasta, soHtml, so, semSticker: spec.publicacao === "api" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  const so = args.includes("--so") ? Number(args[args.indexOf("--so") + 1]) : null;
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story-video.mjs instagram/<pasta> [--so-html] [--so N]"); process.exit(1); }
  try {
    for (const s of await gerarStoryVideo(resolve(pasta), { soHtml: args.includes("--so-html"), so })) console.log(relative(RAIZ, s));
  } catch (e) {
    if (e instanceof ErroStoryVideo) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
