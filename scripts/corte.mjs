#!/usr/bin/env node
// Sugere trechos de um vídeo já publicado para virar reel (Corte), a partir do roteiro e dos
// capítulos reais de metadados.json: o Gancho (capítulo "Abertura") e os blocos "exemplo" que
// se sustentam sozinhos, entre 15 e 90 s. A pessoa escolhe (spec, D9; ADR-0008).
//
//   node scripts/corte.mjs --candidatos videos/<slug>

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { lerRoteiro } from "./roteiro.mjs";

export const DURACAO_CORTE = { min: 15, max: 90 };   // segundos
export const DEPENDE_DO_RESTO = /como vimos|bloco anterior|slide anterior|antes disso|lembra que|voltando ao/i;
const FORMATO = /^(\d+:)?\d{2}:\d{2}$/;

export function segundos(tempo) {
  if (!FORMATO.test(String(tempo ?? ""))) throw new Error(`tempo "${tempo}" precisa estar no formato mm:ss (ou h:mm:ss)`);
  return String(tempo).split(":").reduce((s, p) => s * 60 + Number(p), 0);
}
export const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function candidatosDeCorte({ roteiro, capitulos }) {
  const lista = [];
  const intervalo = (i) => {
    const inicio = segundos(capitulos[i].tempo);
    const fim = capitulos[i + 1] ? segundos(capitulos[i + 1].tempo) : null;
    return fim == null ? null : { inicio: mmss(inicio), fim: mmss(fim), duracao_s: fim - inicio };
  };
  const cabe = (iv) => iv && iv.duracao_s >= DURACAO_CORTE.min && iv.duracao_s <= DURACAO_CORTE.max;
  if (roteiro.gancho && capitulos[0]?.titulo === "Abertura") {
    const iv = intervalo(0);
    if (cabe(iv)) lista.push({ titulo: "Abertura", ...iv, motivo: "é o gancho: abre com a pergunta e já foi escrito para prender em 30 s" });
  }
  for (const b of roteiro.blocos) {
    if (b.tipo !== "exemplo" || DEPENDE_DO_RESTO.test(b.fala ?? "")) continue;
    const i = capitulos.findIndex((c) => c.titulo === b.titulo);
    if (i < 0) continue;
    const iv = intervalo(i);
    if (cabe(iv)) lista.push({ titulo: b.titulo, ...iv, motivo: `é um exemplo que se sustenta sozinho (bloco ${b.numero}, ${iv.duracao_s} s)` });
  }
  return lista;
}

export async function candidatos(pastaDoVideo) {
  const pasta = resolve(pastaDoVideo);
  const pub = join(pasta, "publicacao.json");
  if (!existsSync(pub)) throw new Error(`não achei ${pub} — o vídeo precisa estar publicado (skill publicar) e público`);
  const publicacao = JSON.parse(readFileSync(pub, "utf8"));
  if (publicacao.privacidade !== "public") throw new Error(`publicacao.json diz "${publicacao.privacidade}" — um corte só sai de vídeo público; se você já tornou público no YouTube Studio, troque para "public" no arquivo`);
  const roteiro = lerRoteiro(readFileSync(join(pasta, "roteiro.md"), "utf8"));
  const { capitulos } = JSON.parse(readFileSync(join(pasta, "metadados.json"), "utf8"));
  return { url: publicacao.url, candidatos: candidatosDeCorte({ roteiro, capitulos }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [opcao, caminho] = process.argv.slice(2);
  if (opcao !== "--candidatos" || !caminho) { console.error("uso: node scripts/corte.mjs --candidatos videos/<slug>"); process.exit(1); }
  try {
    const { url, candidatos: lista } = await candidatos(caminho);
    console.log(`vídeo: ${url}`);
    if (!lista.length) console.log(`nenhum trecho de ${DURACAO_CORTE.min} a ${DURACAO_CORTE.max} s se sustenta sozinho — escolha um intervalo à mão (mm:ss a mm:ss)`);
    lista.forEach((c, i) => console.log(`${i + 1}. ${c.titulo} — ${c.inicio} a ${c.fim} (${c.duracao_s} s)\n   ${c.motivo}`));
  } catch (e) {
    console.error(`erro: ${e.message}`); process.exit(1);
  }
}
