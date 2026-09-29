#!/usr/bin/env node
// Recorte de tela de um site para o campo "imagem" dos cards (capa e ideia) — ver instagram/formatos.json.
//
//   node design-system/scripts/recortar-tela.mjs <url> --saida instagram/<pasta>/tela-home.png
//   node design-system/scripts/recortar-tela.mjs <url> --saida …/tela-trilhas.png --seletor "#disciplinas"
//   node design-system/scripts/recortar-tela.mjs <url> --saida …/tela-aula.png --largura 1000 --altura 520 --rolar-ate h1
//   node design-system/scripts/recortar-tela.mjs <url1> <url2> --saida …/tela-celular.png --celular
//
// Computador: janela de 1440×720 (--largura/--altura mudam; janela mais estreita = letra maior no card),
// com o topo da página, ou a partir do elemento de --rolar-ate; com --seletor, só aquele pedaço da página.
// --celular: cada URL numa tela de celular (390×844); várias URLs ficam lado a lado numa imagem 2:1
// (o formato do espaço do recorte no card), grandes e cortadas embaixo para lerem no feed. Sites feitos em JavaScript são esperados até carregar.

import puppeteer from "puppeteer-core";
import { writeFileSync, unlinkSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { acharNavegador } from "./gerar-story-video.mjs";

const COMPUTADOR = { width: 1440, height: 720, deviceScaleFactor: 1 };
const CELULAR = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function abrir(browser, url, viewport, seletor, rolarAte) {
  const pagina = await browser.newPage();
  await pagina.setViewport(viewport);
  await pagina.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));   // animações de entrada
  if (rolarAte) {
    const ok = await pagina.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; scrollTo(0, e.getBoundingClientRect().top + scrollY); return true; }, rolarAte);
    if (!ok) throw new Error(`não achei "${rolarAte}" em ${url}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!seletor) return { pagina, alvo: null };
  const alvo = await pagina.$(seletor);
  if (!alvo) throw new Error(`não achei "${seletor}" em ${url}`);
  await alvo.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await new Promise((r) => setTimeout(r, 400));
  return { pagina, alvo };
}

export async function recortarTela({ urls, saida, seletor, rolarAte, largura, altura, celular = false }) {
  const browser = await puppeteer.launch({ executablePath: acharNavegador(), headless: true, args: ["--hide-scrollbars"] });
  try {
    if (!celular) {
      const janela = { ...COMPUTADOR, ...(largura && { width: largura }), ...(altura && { height: altura }) };
      const { pagina, alvo } = await abrir(browser, urls[0], janela, seletor, rolarAte);
      await (alvo ?? pagina).screenshot({ path: saida });
      return saida;
    }
    const telas = [];
    for (const url of urls) {
      const { pagina } = await abrir(browser, url, CELULAR, null, rolarAte);
      telas.push(`data:image/png;base64,${Buffer.from(await pagina.screenshot()).toString("base64")}`);
      await pagina.close();
    }
    if (telas.length === 1) { writeFileSync(saida, Buffer.from(telas[0].split(",")[1], "base64")); return saida; }
    const html = join(tmpdir(), `recorte-${process.pid}.html`);
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>
      html,body{margin:0} body{width:1440px;height:720px;overflow:hidden;background:#eef2f7;display:flex;align-items:flex-start;justify-content:center;gap:96px;padding-top:56px;box-sizing:border-box}
      img{height:1100px;border-radius:48px;box-shadow:0 16px 48px rgb(0 0 0 / .25)}</style>
      ${telas.map((t) => `<img src="${t}">`).join("")}`);
    try {
      const pagina = await browser.newPage();
      await pagina.setViewport({ width: 1440, height: 720, deviceScaleFactor: 2 });
      await pagina.goto(pathToFileURL(html).href, { waitUntil: "load" });
      await pagina.screenshot({ path: saida });
    } finally { unlinkSync(html); }
    return saida;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  const OPCOES = ["--saida", "--seletor", "--rolar-ate", "--largura", "--altura"];
  const saida = valor("--saida"), seletor = valor("--seletor"), rolarAte = valor("--rolar-ate");
  const largura = Number(valor("--largura")) || undefined, altura = Number(valor("--altura")) || undefined;
  const urls = args.filter((a, i) => !a.startsWith("--") && !OPCOES.includes(args[i - 1]));
  if (!urls.length || !saida) {
    console.error('uso: node design-system/scripts/recortar-tela.mjs <url> [<url> …] --saida instagram/<pasta>/tela-x.png [--seletor "#secao" | --rolar-ate "h1"] [--largura 1440 --altura 720] [--celular]');
    process.exit(1);
  }
  try {
    console.log(relative(process.cwd(), await recortarTela({ urls, saida: resolve(saida), seletor, rolarAte, largura, altura, celular: args.includes("--celular") })));
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
