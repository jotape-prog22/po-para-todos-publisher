#!/usr/bin/env node
// Gera os cards de um post do Instagram (PNG 1080×1350) a partir de instagram/<pasta>/cards.json.
//
//   node design-system/scripts/gerar-cards.mjs instagram/2026-09-20-kruskal-1956
//   node design-system/scripts/gerar-cards.mjs instagram/<pasta> --so-html    (só o HTML, sem Chrome)
//
// cards.json: { "tipo": "artigo" | "aviso", "cards": [ { "tipo": "capa" | "ideia" | "fim" | "aviso", ...campos } ] }
// Campos, limites e sequência por tipo estão em instagram/formatos.json; tudo é validado antes de renderizar.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, exportarPng, esc } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
export const formatos = JSON.parse(readFileSync(join(DS, "instagram/formatos.json"), "utf8"));
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));

export class ErroCards extends Error {}

const KICKER_PADRAO = { capa: "RESUMO DE ARTIGO", fim: "REFERÊNCIA", aviso: "AVISO" };
const TITULO_LONGO = 60;   // acima disso o título cai para o tamanho médio

export function validarCards(dados) {
  const erros = [];
  const tipo = formatos.tipos[dados.tipo];
  if (!tipo) return [`tipo "${dados.tipo}" não existe (${Object.keys(formatos.tipos).join(", ")})`];
  const cards = Array.isArray(dados.cards) ? dados.cards : [];
  if (cards.length < tipo.min || cards.length > tipo.max) erros.push(`post do tipo ${dados.tipo} tem de ${tipo.min} a ${tipo.max} cards; há ${cards.length}`);
  cards.forEach((c, i) => {
    const n = i + 1;
    const def = formatos.cards[c.tipo];
    if (!def) { erros.push(`card ${n}: tipo "${c.tipo}" não existe (${Object.keys(formatos.cards).join(", ")})`); return; }
    for (const campo of def.obrigatorios) if (!c[campo] || !String(c[campo]).trim()) erros.push(`card ${n} (${c.tipo}): falta "${campo}"`);
    for (const [campo, max] of Object.entries(def.campos)) {
      const v = c[campo];
      if (v == null) continue;
      if (typeof v !== "string") erros.push(`card ${n}: "${campo}" precisa ser texto`);
      else if (v.length > max) erros.push(`card ${n}: "${campo}" tem ${v.length} caracteres — máximo ${max}`);
    }
    for (const campo of Object.keys(c)) if (campo !== "tipo" && !(campo in def.campos)) erros.push(`card ${n}: campo "${campo}" não existe no card ${c.tipo}`);
  });
  if (dados.tipo === "artigo" && cards.length) {
    if (cards[0].tipo !== "capa") erros.push("artigo: o primeiro card é a capa");
    if (cards.at(-1).tipo !== "fim") erros.push("artigo: o último card é o fim (referência)");
    if (!cards.slice(1, -1).every((c) => c.tipo === "ideia")) erros.push("artigo: entre a capa e o fim só entram cards de ideia");
  }
  if (dados.tipo === "aviso" && cards.length && cards[0].tipo !== "aviso") erros.push("aviso: o card único é do tipo aviso");
  return erros;
}

// Variáveis que os layouts consomem. `numero` conta as ideias a partir de 01 (a capa é o card 0).
export function variaveisDoCard(card, i, total, { ds, usuario }) {
  const titulo = card.titulo ?? "";
  return {
    ds, usuario,
    contador: `${i + 1}/${total}`,
    kicker: card.kicker ?? KICKER_PADRAO[card.tipo] ?? "",
    numero: String(i).padStart(2, "0"),
    titulo,
    titulo_classe: titulo.length > TITULO_LONGO ? "ig__titulo--medio" : "",
    autores: card.autores ?? "",
    onde: card.onde ?? "",
    data: card.data ?? "",
    link: card.link ?? "",
    texto_html: esc(card.texto ?? "").replace(/\n/g, "<br>"),
    titulo_pagina: `${titulo || card.tipo} — PO para Todos`,
  };
}

export function gerarCards(pasta, { soHtml = false } = {}) {
  const arquivo = join(pasta, "cards.json");
  if (!existsSync(arquivo)) throw new ErroCards(`não achei ${arquivo}`);
  const dados = JSON.parse(readFileSync(arquivo, "utf8"));
  const erros = validarCards(dados);
  if (erros.length) throw new ErroCards(`cards.json inválido:\n- ${erros.join("\n- ")}`);
  const ds = relative(pasta, DS).split("\\").join("/") || ".";
  const { largura, altura } = formatos.formatos.feed;
  const saidas = [];
  dados.cards.forEach((card, i) => {
    const modelo = readFileSync(join(DS, "instagram/layouts", `${formatos.cards[card.tipo].layout}.html`), "utf8");
    const nn = String(i + 1).padStart(2, "0");
    const html = join(pasta, `card-${nn}.html`), png = join(pasta, `card-${nn}.png`);
    writeFileSync(html, preencher(modelo, variaveisDoCard(card, i, dados.cards.length, { ds, usuario: canal.instagramUsuario }), { brutos: ["ds", "texto_html"] }));
    if (soHtml) { saidas.push(html); return; }
    try { exportarPng(html, png, { largura, altura }); } finally { unlinkSync(html); }
    saidas.push(png);
  });
  // cards que sobraram de uma versão anterior com mais itens (ou de um --so-html anterior)
  const maxGlobal = Math.max(...Object.values(formatos.tipos).map((t) => t.max));
  for (let n = dados.cards.length + 1; n <= maxGlobal; n++) {
    const nn = String(n).padStart(2, "0");
    for (const velho of [join(pasta, `card-${nn}.png`), join(pasta, `card-${nn}.html`)]) {
      if (existsSync(velho)) unlinkSync(velho);
    }
  }
  return saidas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--"));
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-cards.mjs instagram/<pasta> [--so-html]"); process.exit(1); }
  try {
    const saidas = gerarCards(resolve(pasta), { soHtml: args.includes("--so-html") });
    for (const s of saidas) console.log(relative(RAIZ, s));
  } catch (e) {
    if (e instanceof ErroCards) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
