#!/usr/bin/env node
// Gera instagram/<pasta>/reel.mp4 (1080×1920) a partir de reel.json.
//   tipo "cenas": cenas no formato de stories.json, gravadas uma a uma e emendadas num vídeo só.
//   tipo "corte": trecho de um vídeo já publicado no YouTube, baixado com yt-dlp e posto numa moldura de marca.
// Corte exige yt-dlp instalado (README) e vídeo público (ADR-0008); reel.json: { "tipo": "corte", "video": "<slug>", "inicio": "mm:ss", "fim": "mm:ss", "titulo": "…", "faixa": "…", "legenda": { … } }
//
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta>            # reel.mp4 + reel.png (capa)
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta> --so-html  # só os HTML das cenas (tipo cenas)
// Legenda: node scripts/legenda.mjs instagram/<pasta> --reel  → reel-legenda.txt. Publicar: node scripts/instagram.mjs --publicar-reel instagram/<pasta>.

import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validar, renderizarCenas, ErroStoryVideo } from "./gerar-story-video.mjs";
import { validarLegenda } from "../../scripts/legenda.mjs";
import { preencher, exportarPng } from "./modelo-html.mjs";
import { segundos, DURACAO_CORTE } from "../../scripts/corte.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));

export class ErroReel extends Error {}
export const TIPOS_DE_REEL = ["cenas", "corte"];
export const DURACAO_REEL = { min: 15, max: 90 };   // segundos

export function validarReel(dados) {
  if (!TIPOS_DE_REEL.includes(dados?.tipo)) return [`tipo "${dados?.tipo}" não existe (${TIPOS_DE_REEL.join(", ")})`];
  const erros = [];
  if (!dados.legenda) erros.push('falta "legenda" (gancho, corpo, hashtags_tema)');
  else erros.push(...validarLegenda(dados.legenda, "reel").map((e) => `legenda: ${e}`));
  if (dados.tipo === "cenas") {
    if (!Array.isArray(dados.cenas) || !dados.cenas.length) erros.push('tipo cenas precisa de uma lista "cenas"');
    else {
      try {
        validar({ tipo: "stories", publicacao: "api", stories: dados.cenas });
      } catch (e) {
        if (e instanceof ErroStoryVideo) erros.push(e.message.replace(/^story (\d+)/, "cena $1")); else throw e;
      }
      const total = dados.cenas.reduce((s, c) => s + Number(c.duracao || 0), 0);
      if (total < DURACAO_REEL.min || total > DURACAO_REEL.max) erros.push(`as cenas somam ${total} s; um reel tem de ${DURACAO_REEL.min} a ${DURACAO_REEL.max} s`);
    }
  }
  if (dados.tipo === "corte") {
    for (const c of ["video", "inicio", "fim", "titulo"]) if (!dados[c] || !String(dados[c]).trim()) erros.push(`corte: falta "${c}"`);
    let ini, fim;
    try { ini = segundos(dados.inicio); fim = segundos(dados.fim); } catch (e) { erros.push(`corte: ${e.message}`); }
    if (ini != null && fim != null) {
      if (fim <= ini) erros.push('corte: "fim" precisa vir depois do início');
      else if (fim - ini < DURACAO_CORTE.min || fim - ini > DURACAO_CORTE.max) erros.push(`corte: ${fim - ini} s; um reel tem de ${DURACAO_CORTE.min} a ${DURACAO_CORTE.max} s`);
    }
    if (dados.titulo && dados.titulo.length > 60) erros.push(`corte: "titulo" tem ${dados.titulo.length} caracteres — máximo 60`);
    if (dados.faixa && dados.faixa.length > 40) erros.push(`corte: "faixa" tem ${dados.faixa.length} caracteres — máximo 40`);
  }
  return erros;
}

export function argsConcat(lista, saida) {
  return ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", saida];
}

export function acharYtDlp(executarSync = (cmd) => execSync(cmd, { stdio: "pipe" }).toString()) {
  try {
    return executarSync(process.platform === "win32" ? "where yt-dlp" : "command -v yt-dlp").split(/\r?\n/)[0].trim();
  } catch {
    throw new ErroReel('yt-dlp não encontrado — instale (README, "O que você vai instalar", item opcional "yt-dlp") e tente de novo');
  }
}

// Baixa só o trecho, em MP4 até 1080p; o corte durante o download usa o ffmpeg do projeto.
export function argsYtDlp({ url, inicio, fim, saida, ffmpegDir }) {
  return [
    "--quiet", "--no-warnings", "--no-playlist",
    "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4",
    "--download-sections", `*${inicio}-${fim}`, "--force-keyframes-at-cuts",
    "--ffmpeg-location", ffmpegDir,
    "-o", saida, url,
  ];
}

// Moldura (PNG 9:16) por baixo, vídeo 16:9 redimensionado à largura e centrado; áudio original se houver.
export function argsMoldura({ moldura, bruto, saida }) {
  return [
    "-y", "-loglevel", "error", "-loop", "1", "-i", moldura, "-i", bruto,
    "-filter_complex", "[1:v]scale=1080:-2:flags=lanczos[v];[0:v][v]overlay=0:(H-h)/2:shortest=1,format=yuv420p[out]",
    "-map", "[out]", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    saida,
  ];
}

export function htmlDaMoldura({ titulo, faixa, ds }) {
  const modelo = readFileSync(join(DS, "instagram/layouts/reel-moldura.html"), "utf8");
  return preencher(modelo, { ds, usuario: canal.instagramUsuario, titulo, titulo_classe: titulo.length > 24 ? "ig__titulo--medio" : "", faixa: faixa ?? "", titulo_pagina: `${titulo} — reel` });
}

// Roda um programa externo e falha com a saída de erro dele (injetável nos testes).
export function rodar(binario, args) {
  return new Promise((ok, falha) => {
    const p = spawn(binario, args, { stdio: ["ignore", "inherit", "pipe"] });
    let erro = "";
    p.stderr.on("data", (d) => { erro += d; });
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroReel(`${binario.split("/").pop()} terminou com código ${c}${erro ? `: ${erro.trim()}` : ""}`))));
  });
}

async function ffmpeg() { return (await import("ffmpeg-static")).default; }

async function gerarDeCenas(dados, pasta, { soHtml, executar, renderizar }) {
  const cenas = validar({ tipo: "stories", publicacao: "api", stories: dados.cenas });
  const saidas = await renderizar(cenas, { pasta, prefixo: "reel-cena", soHtml, semSticker: true });
  if (soHtml) return saidas;
  const lista = join(pasta, "lista-cenas.txt");
  writeFileSync(lista, saidas.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const reel = join(pasta, "reel.mp4");
  try {
    await executar(await ffmpeg(), argsConcat(lista, reel));
  } finally {
    unlinkSync(lista);
    for (const s of saidas) if (existsSync(s)) unlinkSync(s);
  }
  // capa: último quadro da primeira cena
  const png1 = join(pasta, "reel-cena-01.png");
  if (existsSync(png1)) renameSync(png1, join(pasta, "reel.png"));
  for (let i = 2; i <= cenas.length; i++) { const p = join(pasta, `reel-cena-${String(i).padStart(2, "0")}.png`); if (existsSync(p)) unlinkSync(p); }
  return reel;
}

async function gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar }) {
  const pub = join(raizVideos, dados.video, "publicacao.json");
  if (!existsSync(pub)) throw new ErroReel(`não achei ${pub} — o vídeo "${dados.video}" precisa estar publicado`);
  const publicacao = JSON.parse(readFileSync(pub, "utf8"));
  if (publicacao.privacidade !== "public") throw new ErroReel(`o vídeo "${dados.video}" precisa estar público (publicacao.json diz "${publicacao.privacidade}") — se já tornou público, troque para "public" no arquivo`);
  const ff = await ffmpeg();
  const bruto = join(pasta, "corte-bruto.mp4"), html = join(pasta, "reel-moldura.html"), moldura = join(pasta, "reel-moldura.png"), reel = join(pasta, "reel.mp4");
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  try {
    await executar(ytDlp ?? acharYtDlp(), argsYtDlp({ url: publicacao.url, inicio: dados.inicio, fim: dados.fim, saida: bruto, ffmpegDir: dirname(ff) }));
    if (!existsSync(bruto)) throw new ErroReel("yt-dlp terminou sem gerar corte-bruto.mp4 — o vídeo está público? a URL em publicacao.json está certa?");
    writeFileSync(html, htmlDaMoldura({ titulo: dados.titulo, faixa: dados.faixa, ds }));
    const { largura, altura } = formatos.formatos.story;
    exportar(html, moldura, { largura, altura });
    await executar(ff, argsMoldura({ moldura, bruto, saida: reel }));
    renameSync(moldura, join(pasta, "reel.png"));   // capa: a moldura com o título
  } finally {
    for (const a of [bruto, html]) if (existsSync(a)) unlinkSync(a);
    if (existsSync(moldura)) unlinkSync(moldura);
  }
  return reel;
}

export async function gerarReel(pasta, { soHtml = false, executar = rodar, renderizar = renderizarCenas, raizVideos = join(RAIZ, "videos"), ytDlp = null, exportar = exportarPng } = {}) {
  const arquivo = join(pasta, "reel.json");
  if (!existsSync(arquivo)) throw new ErroReel(`não achei ${arquivo} — rode a skill reel`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarReel(dados);
  if (erros.length) throw new ErroReel(`reel.json inválido:\n- ${erros.join("\n- ")}`);
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { soHtml, executar, renderizar });
  return gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-reel.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    const r = await gerarReel(resolve(pasta), { soHtml: args.includes("--so-html") });
    for (const s of [].concat(r)) console.log(relative(RAIZ, s));
  } catch (e) {
    if (e instanceof ErroReel || e instanceof ErroStoryVideo) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
