#!/usr/bin/env node
// Gera videos/<slug>/story.png (1080×1920): o story de "vídeo novo" para o Instagram,
// com a mesma headline, subhead e ícone da miniatura (resolvidos pelo catálogo).
//
//   node design-system/scripts/gerar-story.mjs videos/folgas-complementares
//   node design-system/scripts/gerar-story.mjs videos/<slug> --topico dualidade      (se a busca pelo título errar)
//   node design-system/scripts/gerar-story.mjs videos/<slug> --headline X --subhead Y --icone id
//
// O story é publicado à mão pelo app (a API não coloca o sticker de link).

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolver, ErroSpec } from "./gerar-miniatura.mjs";
import { preencher, exportarPng } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));

export class ErroStory extends Error {}

export function specDoVideo(pasta, extras = {}) {
  const arquivo = join(pasta, "metadados.json");
  if (!existsSync(arquivo)) throw new ErroStory(`não achei ${arquivo} — rode a skill titulo-descricao antes`);
  const meta = JSON.parse(readFileSync(arquivo, "utf8"));
  if (!meta.titulo) throw new ErroStory("metadados.json sem \"titulo\" — rode a skill titulo-descricao antes");
  return { buscar: meta.titulo, ...extras };
}

export function gerarStory(pasta, extras = {}, { soHtml = false } = {}) {
  const r = resolver(specDoVideo(pasta, extras));
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const modelo = readFileSync(join(DS, "instagram/layouts/story-video.html"), "utf8");
  const html = join(pasta, "story.html"), png = join(pasta, "story.png");
  writeFileSync(html, preencher(modelo, { ds, usuario: canal.instagramUsuario, kicker: "VÍDEO NOVO NO CANAL", headline: r.headline, subhead: r.subhead, icone: r.icone, faixa: "ASSISTA NO YOUTUBE" }));
  if (soHtml) return html;
  const { largura, altura } = formatos.formatos.story;
  exportarPng(html, png, { largura, altura });
  unlinkSync(html);
  for (const a of r.avisos) if (a.startsWith("busca")) console.error(`aviso: ${a}`);   // avisos de layout são da miniatura, não do story
  return png;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  const extras = {};
  for (let i = 0; i < args.length; i++) if (args[i].startsWith("--") && args[i] !== "--so-html") extras[args[i].slice(2)] = args[++i];
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story.mjs videos/<slug> [--topico id] [--headline X --subhead Y --icone id] [--so-html]"); process.exit(1); }
  try {
    console.log(relative(RAIZ, gerarStory(resolve(pasta), extras, { soHtml: args.includes("--so-html") })));
  } catch (e) {
    if (e instanceof ErroStory || e instanceof ErroSpec) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
