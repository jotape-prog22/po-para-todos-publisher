#!/usr/bin/env node
// Gera instagram/<pasta>/reel.mp4 (1080×1920) a partir de reel.json.
//   tipo "cenas": Cenas do motor de motion (design-system/motion/GUIA.md) num vídeo contínuo, com Trilha ("trilha": "<id>" de
//   design-system/audio/biblioteca.json, opcional) e Efeitos sonoros; as trocas de Cena caem no compasso da Trilha.
//   tipo "corte": trecho de um vídeo já publicado no YouTube, baixado com yt-dlp e posto numa moldura de marca.
// Corte exige yt-dlp instalado (README) e vídeo público (ADR-0008); reel.json: { "tipo": "corte", "video": "<slug>", "inicio": "mm:ss", "fim": "mm:ss", "titulo": "…", "faixa": "…", "legenda": { … } }
// (titulo ≤ 40 caracteres e faixa ≤ 40: é o que cabe na moldura acima e abaixo do vídeo; o título encolhe em
// três tamanhos conforme o comprimento — a conta está em instagram/reel.css)
//
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta>            # reel.mp4 + reel.png (capa)
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta> --ver      # prévia no navegador, com som (tipo cenas)
// Legenda: node scripts/legenda.mjs instagram/<pasta> --reel  → reel-legenda.txt. Publicar: node scripts/instagram.mjs --publicar-reel instagram/<pasta>.

import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validarCenas, gravarComposicao, USUARIO, ErroStoryVideo } from "./gerar-story-video.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { renderizar as renderizarMotion } from "./motion/renderizar.mjs";
import { mixar as mixarAudio, rodar as rodarProcesso, MOVIMENTO } from "./motion/mixagem.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";
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

export function validarReel(dados, { biblioteca = null } = {}) {
  if (!TIPOS_DE_REEL.includes(dados?.tipo)) return [`tipo "${dados?.tipo}" não existe (${TIPOS_DE_REEL.join(", ")})`];
  const erros = [];
  if (!dados.legenda) erros.push('falta "legenda" (gancho, corpo, hashtags_tema)');
  else erros.push(...validarLegenda(dados.legenda, "reel").map((e) => `legenda: ${e}`));
  if (dados.tipo === "cenas") {
    if (!Array.isArray(dados.cenas) || !dados.cenas.length) erros.push('tipo cenas precisa de uma lista "cenas"');
    else {
      try {
        validarCenas(dados.cenas, { formato: "reel", rotulo: "cena" });
      } catch (e) {
        if (e instanceof ErroStoryVideo) erros.push(e.message); else throw e;
      }
      const total = dados.cenas.reduce((s, c) => s + Number(c.duracao || 0), 0);
      if (total < DURACAO_REEL.min || total > DURACAO_REEL.max) erros.push(`as cenas somam ${total} s; um reel tem de ${DURACAO_REEL.min} a ${DURACAO_REEL.max} s`);
    }
    if (dados.trilha != null) {
      const b = biblioteca ?? carregarBiblioteca();
      if (!b.trilhas.some((t) => t.id === dados.trilha)) erros.push(`trilha "${dados.trilha}" não está em design-system/audio/biblioteca.json`);
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
    if (dados.titulo && dados.titulo.length > 40) erros.push(`corte: "titulo" tem ${dados.titulo.length} caracteres — máximo 40`);
    if (dados.faixa && dados.faixa.length > 40) erros.push(`corte: "faixa" tem ${dados.faixa.length} caracteres — máximo 40`);
  }
  return erros;
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
    // -framerate 30: sem isso o loop da moldura (PNG) entra a 25 fps (padrão do image2) e reamostra o vídeo de 30 fps.
    "-y", "-loglevel", "error", "-framerate", "30", "-loop", "1", "-i", moldura, "-i", bruto,
    "-filter_complex", "[1:v]scale=1080:-2:flags=lanczos[v];[0:v][v]overlay=0:(H-h)/2:shortest=1,format=yuv420p[out]",
    "-map", "[out]", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    saida,
  ];
}

// Tamanho do título pelo comprimento (até 20 cheio, 21–30 médio, 31–40 pequeno): ver a conta em instagram/reel.css.
export function htmlDaMoldura({ titulo, faixa, ds }) {
  const modelo = readFileSync(join(DS, "instagram/layouts/reel-moldura.html"), "utf8");
  return preencher(modelo, { ds, usuario: canal.instagramUsuario, titulo, titulo_classe: titulo.length > 30 ? "ig__titulo--pequeno" : titulo.length > 20 ? "ig__titulo--medio" : "", faixa: faixa ?? "", titulo_pagina: `${titulo} — reel` });
}

// Roda um programa externo e falha com a saída de erro dele (injetável nos testes).
export const rodar = (binario, args) => rodarProcesso(binario, args, ErroReel);

async function ffmpeg() { return (await import("ffmpeg-static")).default; }

export function composicaoDoReel(dados, { biblioteca }) {
  const cenas = validarCenas(dados.cenas, { formato: "reel", rotulo: "cena" });
  const trilha = dados.trilha ? biblioteca.trilhas.find((t) => t.id === dados.trilha) : null;
  const comp = montarComposicao(cenas, { formato: "reel", trilha, usuario: USUARIO });
  if (comp.duracao > DURACAO_REEL.max) throw new ErroReel(`encaixadas no compasso da Trilha, as cenas dão ${comp.duracao} s; um reel tem até ${DURACAO_REEL.max} s — encurte uma cena`);
  return comp;
}

async function gerarDeCenas(dados, pasta, { ver, renderizar, mixar, biblioteca }) {
  const comp = composicaoDoReel(dados, { biblioteca });
  if (ver) return verComposicoes([{ nome: "reel", comp, trilhaId: dados.trilha ?? null }], { biblioteca, mixar });
  const capaEm = Math.max(0, comp.cenas[0].fim - MOVIMENTO.duracoes.saida - 0.1);   // a 1ª Cena inteira, antes de sair
  return gravarComposicao(comp, { pasta, base: "reel", trilhaId: dados.trilha ?? null, capaEm, renderizar, mixar, biblioteca });
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

export async function gerarReel(pasta, { ver = false, renderizar = renderizarMotion, mixar = mixarAudio, biblioteca = carregarBiblioteca(), executar = rodar, raizVideos = join(RAIZ, "videos"), ytDlp = null, exportar = exportarPng } = {}) {
  const arquivo = join(pasta, "reel.json");
  if (!existsSync(arquivo)) throw new ErroReel(`não achei ${arquivo} — rode a skill reel`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarReel(dados, { biblioteca });
  if (erros.length) throw new ErroReel(`reel.json inválido:\n- ${erros.join("\n- ")}`);
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { ver, renderizar, mixar, biblioteca });
  if (ver) throw new ErroReel('--ver só vale para tipo "cenas" — o corte é conferido no reel.mp4');
  return gerarDeCorte(dados, pasta, { executar, raizVideos, ytDlp, exportar });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-reel.mjs instagram/<pasta> [--ver]"); process.exit(1); }
  try {
    if (args.includes("--ver")) {
      const { url } = await gerarReel(resolve(pasta), { ver: true });
      console.log(`Abri a prévia no navegador: ${url}\nQuando terminar de olhar, feche aqui com Ctrl+C.`);
    } else {
      for (const s of [].concat(await gerarReel(resolve(pasta)))) console.log(relative(RAIZ, s));
    }
  } catch (e) {
    if (e?.constructor?.name?.startsWith("Erro")) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
