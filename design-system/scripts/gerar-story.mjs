#!/usr/bin/env node
// Gera videos/<slug>/story.png (1080×1920): o story de "vídeo novo" para o Instagram —
// "VÍDEO NOVO NO CANAL" em destaque, o espaço do meio livre para o sticker de link do
// vídeo e o endereço do canal na tarja verde. É o mesmo para todo vídeo.
//
//   node design-system/scripts/gerar-story.mjs videos/<slug>
//   node design-system/scripts/gerar-story.mjs videos/<slug> --so-html
//
// O story é publicado à mão pelo app (a API não coloca o sticker de link, ADR-0007).

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, exportarPng } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));

export class ErroStory extends Error {}

export function htmlDoStory(ds) {
  const modelo = readFileSync(join(DS, "instagram/layouts/story-video.html"), "utf8");
  return preencher(modelo, { ds, youtube: canal.youtube });
}

export function gerarStory(pasta, { soHtml = false } = {}) {
  if (!existsSync(pasta)) throw new ErroStory(`não achei a pasta ${pasta}`);
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const html = join(pasta, "story.html"), png = join(pasta, "story.png");
  writeFileSync(html, htmlDoStory(ds));
  if (soHtml) return html;
  const { largura, altura } = formatos.formatos.story;
  try { exportarPng(html, png, { largura, altura }); } finally { unlinkSync(html); }
  return png;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story.mjs videos/<slug> [--so-html]"); process.exit(1); }
  try {
    console.log(relative(RAIZ, gerarStory(resolve(pasta), { soHtml: args.includes("--so-html") })));
  } catch (e) {
    if (e instanceof ErroStory) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
