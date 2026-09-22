#!/usr/bin/env node
// Gera instagram/<pasta>/story-aviso.mp4 (+ story-aviso.png, último quadro): o story que avisa
// de um post novo no feed, montado a partir de cards.json. Não tem sticker, então sai pela API:
//   node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta>            # story-aviso.mp4
//   node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta> --so-html  # só o HTML
//   node scripts/instagram.mjs --publicar-story instagram/<pasta> story-aviso.mp4   (a skill post chama, depois do post)

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validar, renderizarCenas, ErroStoryVideo, LIMITES } from "./gerar-story-video.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export class ErroStoryAviso extends Error {}
export const DURACAO_AVISO = 8;

// Corta na última palavra inteira que cabe em `max` (contando a reticência).
export function encurtar(texto, max) {
  const t = String(texto ?? "").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max / 2 ? corte.slice(0, espaco) : corte).trim()}…`;
}

const primeiraFrase = (t) => (String(t ?? "").match(/^[^.!?\n]+[.!?]?/) ?? [""])[0].trim();

export function cenaDoAviso(cards) {
  const c = cards?.cards?.[0];
  if (!c) throw new ErroStoryAviso("cards.json sem cards — rode a skill post");
  const T = LIMITES.campos, linha = (s) => encurtar(s, T.linha);
  const base = { duracao: DURACAO_AVISO, faixa: "VEJA NO FEED" };
  switch (cards.tipo) {
    case "artigo": return { ...base, kicker: "POST NOVO: RESUMO DE ARTIGO", titulo: encurtar(c.titulo, T.titulo), linhas: [c.autores, c.onde].filter(Boolean).map(linha) };
    case "aviso": return { ...base, kicker: `POST NOVO: ${c.kicker ?? "AVISO"}`, titulo: encurtar(c.titulo, T.titulo), linhas: [c.data, primeiraFrase(c.texto)].filter(Boolean).map(linha) };
    default: throw new ErroStoryAviso(`não sei fazer story de aviso para o tipo "${cards.tipo}"`);
  }
}

export async function gerarStoryAviso(pasta, { soHtml = false } = {}) {
  const arquivo = join(pasta, "cards.json");
  if (!existsSync(arquivo)) throw new ErroStoryAviso(`não achei ${arquivo} — rode a skill post`);
  const cena = cenaDoAviso(JSON.parse(readFileSync(arquivo, "utf8")));
  const cenas = validar({ tipo: "stories", publicacao: "api", stories: [cena] });
  const [saida] = await renderizarCenas(cenas, { pasta, prefixo: "story-aviso", numerar: false, soHtml, semSticker: true });
  return saida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story-aviso.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    console.log(relative(RAIZ, await gerarStoryAviso(resolve(pasta), { soHtml: args.includes("--so-html") })));
  } catch (e) {
    if (e instanceof ErroStoryAviso || e instanceof ErroStoryVideo) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
