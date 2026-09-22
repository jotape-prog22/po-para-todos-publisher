#!/usr/bin/env node
// Sugere trechos para um post de citação a partir de um vídeo (roteiro.md) ou de um post (cards.json).
//
//   node scripts/citacao.mjs --candidatos videos/<slug>          # frases do gancho e das falas
//   node scripts/citacao.mjs --candidatos instagram/<pasta>      # frases dos cards de ideia
//
// Heurística: frases inteiras de 60 a 200 caracteres que se sustentam fora do vídeo (sem "nesta aula",
// "vamos", "como vimos"). A skill mostra 2 a 3 e a pessoa escolhe (spec, D9).

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { lerRoteiro } from "./roteiro.mjs";

export const TAMANHO = { min: 60, max: 200 };
export const MAXIMO = 5;
const DEPENDE_DO_VIDEO = /nesta aula|vamos |como vimos|no slide|a seguir|agora o|antes do teorema/i;

export function frases(texto) {
  const limpo = String(texto ?? "").replace(/\*\*/g, "").replace(/\\\*/g, "*").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/\s+/g, " ").trim();
  return (limpo.match(/[^.!?]+[.!?]+/g) ?? []).map((f) => f.trim()).filter(Boolean);
}

const cabem = (lista) => lista.filter((c) => c.texto.length >= TAMANHO.min && c.texto.length <= TAMANHO.max && !DEPENDE_DO_VIDEO.test(c.texto));

export function candidatosDoRoteiro(roteiro) {
  const lista = [];
  for (const f of frases(roteiro.gancho?.texto)) lista.push({ texto: f, origem: "Gancho" });
  for (const b of roteiro.blocos) for (const f of frases(b.fala)) lista.push({ texto: f, origem: `Bloco ${b.numero}: ${b.titulo}` });
  return cabem(lista).slice(0, MAXIMO);
}

export function candidatosDosCards(cards) {
  const lista = [];
  cards.cards.forEach((c, i) => {
    if (c.tipo !== "ideia" && c.tipo !== "curiosidade") return;
    for (const f of frases(c.texto)) lista.push({ texto: f, origem: `Card ${i + 1} (${c.titulo})` });
  });
  return cabem(lista).slice(0, MAXIMO);
}

export async function candidatos(caminho) {
  const pasta = resolve(caminho);
  if (existsSync(join(pasta, "roteiro.md"))) return candidatosDoRoteiro(lerRoteiro(readFileSync(join(pasta, "roteiro.md"), "utf8")));
  if (existsSync(join(pasta, "cards.json"))) return candidatosDosCards(JSON.parse(readFileSync(join(pasta, "cards.json"), "utf8")));
  throw new Error(`não achei roteiro.md nem cards.json em ${caminho}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, caminho] = process.argv.slice(2);
  if (opcao !== "--candidatos" || !caminho) { console.error("uso: node scripts/citacao.mjs --candidatos videos/<slug> | instagram/<pasta>"); process.exit(1); }
  try {
    const lista = await candidatos(caminho);
    if (!lista.length) console.log(`nenhuma frase de ${TAMANHO.min} a ${TAMANHO.max} caracteres se sustenta sozinha em ${basename(caminho)} — escolha à mão`);
    lista.forEach((c, i) => console.log(`${i + 1}. "${c.texto}"\n   — ${c.origem}`));
  } catch (e) {
    console.error(`erro: ${e.message}`); process.exit(1);
  }
}
