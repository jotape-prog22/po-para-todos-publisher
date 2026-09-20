#!/usr/bin/env node
// Monta a descrição do YouTube no molde do canal a partir de roteiro.md + metadados.json + canal.json.
//
//   node scripts/descricao.mjs videos/folgas-complementares        → grava metadados.descricao (e capitulos, se faltar) e imprime
//   node scripts/descricao.mjs --validar-titulo "SIMPLEX - Passo a Passo"
//
// Molde (extraído do vídeo "Teorema das Folgas Complementares", set/2026):
//   gancho · "Nesta aula, você vai aprender:" + objetivos · fechamento · ⏱️ capítulos ·
//   ⚠️ relacionados · rodapé fixo do canal · CTA com complemento · hashtags.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { carregarRoteiro } from "./roteiro.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TITULO_MAX = 70;

export function formatarTempo(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(seg).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function capitulos(roteiro) {
  const lista = [];
  let t = 0;
  const add = (titulo, dur) => { lista.push({ tempo: formatarTempo(t), titulo }); t += dur ?? 0; };
  add("Abertura", roteiro.gancho?.duracao_s);
  add("Objetivos", roteiro.objetivos?.duracao_s);
  for (const b of roteiro.blocos) add(b.titulo, b.duracao_s);
  for (const f of roteiro.finais) add(f.titulo, f.duracao_s);
  return lista;
}

export function montarDescricao({ roteiro, metadados, canal }) {
  const caps = metadados.capitulos ?? capitulos(roteiro);
  const partes = [
    roteiro.gancho.texto,
    "Nesta aula, você vai aprender:",
    ...roteiro.objetivos.itens,
    metadados.fechamento,
    "⏱️ Capítulos:\n" + caps.map((c) => `${c.tempo} ${c.titulo}`).join("\n"),
    ...(roteiro.meta.relacionados ?? []).map((r) => `⚠️ ${r.contexto}: ${r.url}`),
    canal.rodape.projeto,
    canal.rodape.convite,
    `📸 Instagram: ${canal.instagram}\n🌐 Nosso Site: ${canal.site}`,
    canal.rodape.cta.replace("{complemento}", metadados.cta_complemento),
    [...canal.hashtags.abertura, ...metadados.hashtags_tema, ...canal.hashtags.fechamento].join(" "),
  ];
  return partes.filter((p) => p && p.trim()).join("\n\n");
}

export function validarTitulo(titulo) {
  const erros = [];
  if (titulo.length > TITULO_MAX) erros.push(`título com ${titulo.length} caracteres — máximo ${TITULO_MAX}`);
  if (titulo.includes("!")) erros.push("título não usa ponto de exclamação (!)");
  const partes = titulo.split(" - ");
  if (partes.length < 2) erros.push('título precisa de " - " separando a palavra-chave do complemento');
  else if (/\p{Ll}/u.test(partes[0])) erros.push("a parte antes do \" - \" vai em CAIXA ALTA");
  return erros;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [arg, valor] = process.argv.slice(2);
  try {
    if (arg === "--validar-titulo") {
      const erros = validarTitulo(valor ?? "");
      if (erros.length) { console.error(`erro: ${erros.join("; ")}`); process.exit(1); }
      console.log("ok"); process.exit(0);
    }
    if (!arg) { console.error("uso: node scripts/descricao.mjs videos/<slug>"); process.exit(1); }
    const pasta = resolve(arg);
    const roteiro = carregarRoteiro(join(pasta, "roteiro.md"));
    const metaPath = join(pasta, "metadados.json");
    const metadados = JSON.parse(readFileSync(metaPath, "utf8"));
    const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));
    for (const campo of ["fechamento", "cta_complemento", "hashtags_tema"]) {
      if (!metadados[campo]) throw new Error(`metadados.json sem "${campo}"`);
    }
    if (!metadados.capitulos) metadados.capitulos = capitulos(roteiro);
    metadados.descricao = montarDescricao({ roteiro, metadados, canal });
    writeFileSync(metaPath, JSON.stringify(metadados, null, 2) + "\n");
    console.log(metadados.descricao);
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
