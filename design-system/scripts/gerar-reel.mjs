#!/usr/bin/env node
// Gera instagram/<pasta>/reel.mp4 (1080×1920) a partir de reel.json.
//   tipo "cenas": cenas no formato de stories.json, gravadas uma a uma e emendadas num vídeo só.
//   tipo "corte": trecho de um vídeo já publicado no YouTube, baixado com yt-dlp e posto numa moldura de marca (Task 10).
//
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta>            # reel.mp4 + reel.png (capa)
//   node design-system/scripts/gerar-reel.mjs instagram/<pasta> --so-html  # só os HTML das cenas (tipo cenas)
// Legenda: node scripts/legenda.mjs instagram/<pasta> --reel  → reel-legenda.txt. Publicar: node scripts/instagram.mjs --publicar-reel instagram/<pasta>.

import { readFileSync, writeFileSync, unlinkSync, existsSync, renameSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validar, renderizarCenas, ErroStoryVideo } from "./gerar-story-video.mjs";
import { validarLegenda } from "../../scripts/legenda.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");

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
  return erros;
}

export function argsConcat(lista, saida) {
  return ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", "-movflags", "+faststart", saida];
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

export async function gerarReel(pasta, { soHtml = false, executar = rodar, renderizar = renderizarCenas } = {}) {
  const arquivo = join(pasta, "reel.json");
  if (!existsSync(arquivo)) throw new ErroReel(`não achei ${arquivo} — rode a skill reel`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarReel(dados);
  if (erros.length) throw new ErroReel(`reel.json inválido:\n- ${erros.join("\n- ")}`);
  if (dados.tipo === "cenas") return gerarDeCenas(dados, pasta, { soHtml, executar, renderizar });
  throw new ErroReel('tipo "corte" ainda não implementado');   // Task 10 substitui esta linha
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
