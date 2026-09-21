#!/usr/bin/env node
// Monta a legenda de um post do Instagram a partir de legenda.json + cards.json + canal.json.
//
//   node scripts/legenda.mjs instagram/2026-09-20-kruskal-1956     → grava legenda.txt e imprime
//
// Ordem: gancho (≤ 125 caracteres, o que aparece antes do "mais") · corpo · ✍️ autores (artigo) ·
// CTA do tipo · rodapé do projeto · hashtags (abertura + tema + fechamento), como na descrição do YouTube.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const GANCHO_MAX = 125;
export const LEGENDA_MAX = 2200;
export const HASHTAGS_MAX = 30;

export class ErroLegenda extends Error {}

export function contarHashtags(texto) {
  return (texto.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
}

export function validarLegenda(legenda, tipo) {
  const erros = [];
  const { gancho, corpo, autores, hashtags_tema } = legenda ?? {};
  if (!gancho?.trim()) erros.push('falta "gancho"');
  else {
    if (gancho.length > GANCHO_MAX) erros.push(`gancho com ${gancho.length} caracteres — máximo ${GANCHO_MAX} (é o que aparece antes do "mais")`);
    if (gancho.includes("\n")) erros.push("gancho é uma linha só");
  }
  if (!corpo?.trim()) erros.push('falta "corpo"');
  if (tipo === "artigo" && !autores?.trim()) erros.push('artigo precisa de "autores" (por extenso, com @ de quem tiver)');
  if (!Array.isArray(hashtags_tema) || hashtags_tema.length < 3 || hashtags_tema.length > 4) erros.push("hashtags_tema: de 3 a 4");
  else for (const h of hashtags_tema) if (!/^#[A-Za-z0-9]+$/.test(h)) erros.push(`hashtag "${h}" precisa ser #CamelCase sem acento`);
  if (/\b(likes?|curt(e|a|am|ir|ida|idas))\b/i.test(`${gancho ?? ""} ${corpo ?? ""}`)) erros.push("a legenda não pede like");
  return erros;
}

export function montarLegenda({ legenda, tipo, canal }) {
  const partes = [
    legenda.gancho.trim(),
    legenda.corpo.trim(),
    tipo === "artigo" && legenda.autores ? `✍️ Autores: ${legenda.autores.trim()}` : "",
    canal.instagramLegenda.cta[tipo],
    canal.instagramLegenda.rodape,
    [...canal.hashtags.abertura, ...legenda.hashtags_tema, ...canal.hashtags.fechamento].join(" "),
  ];
  return partes.filter((p) => p && p.trim()).join("\n\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  try {
    if (!arg) throw new ErroLegenda("uso: node scripts/legenda.mjs instagram/<pasta>");
    const pasta = resolve(arg);
    const cards = JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8"));
    const legenda = JSON.parse(readFileSync(join(pasta, "legenda.json"), "utf8"));
    const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
    if (!canal.instagramLegenda.cta[cards.tipo]) throw new ErroLegenda(`canal.json não tem CTA para o tipo "${cards.tipo}"`);
    const erros = validarLegenda(legenda, cards.tipo);
    if (erros.length) throw new ErroLegenda(`legenda.json inválido:\n- ${erros.join("\n- ")}`);
    const texto = montarLegenda({ legenda, tipo: cards.tipo, canal });
    const hashtags = contarHashtags(texto);
    if (texto.length > LEGENDA_MAX) throw new ErroLegenda(`legenda com ${texto.length} caracteres — máximo ${LEGENDA_MAX}`);
    if (hashtags > HASHTAGS_MAX) throw new ErroLegenda(`${hashtags} hashtags — máximo ${HASHTAGS_MAX}`);
    writeFileSync(join(pasta, "legenda.txt"), texto + "\n");
    console.log(texto);
  } catch (e) {
    if (e instanceof ErroLegenda || e.code === "ENOENT") { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
