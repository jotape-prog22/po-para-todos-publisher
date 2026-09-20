#!/usr/bin/env node
// Lê e valida o roteiro.md de um vídeo.
//
//   node scripts/roteiro.mjs videos/folgas-complementares/roteiro.md   → imprime o JSON
//
// Formato esperado (veja videos/folgas-complementares/roteiro.md):
//   frontmatter YAML; seções "## Gancho", "## Objetivos", "## Blocos" (com "### N. Título"),
//   e uma ou mais seções finais ("## Resumo — …", "## Encerramento").
//   Cada seção e cada bloco começa com "Duração: N s"; cada bloco tem "Tipo: conteudo|exemplo".

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

const TIPOS = ["conteudo", "exemplo"];

function duracao(texto) {
  const m = texto.match(/Duração:\s*(\d+)\s*s/);
  return m ? Number(m[1]) : null;
}
function semLinhaDeDuracao(texto) {
  return texto.replace(/^.*Duração:.*$/m, "").trim();
}
function itensDeLista(texto) {
  return texto.split("\n").filter((l) => /^\s*-\s+/.test(l)).map((l) => l.replace(/^\s*-\s+/, "").trim());
}

export function lerRoteiro(md) {
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = fm ? YAML.parse(fm[1]) ?? {} : {};
  const corpo = fm ? md.slice(fm[0].length) : md;

  // Seções de nível 2, na ordem em que aparecem
  const secoes = [];
  for (const parte of corpo.split(/^## /m).slice(1)) {
    const [titulo, ...resto] = parte.split("\n");
    secoes.push({ titulo: titulo.trim(), texto: resto.join("\n").trim() });
  }
  const achar = (nome) => secoes.find((s) => s.titulo === nome);

  const gancho = achar("Gancho");
  const objetivos = achar("Objetivos");
  const blocosSec = achar("Blocos");

  const blocos = [];
  if (blocosSec) {
    for (const parte of blocosSec.texto.split(/^### /m).slice(1)) {
      const [cab, ...resto] = parte.split("\n");
      const texto = resto.join("\n");
      const m = cab.match(/^(\d+)\.\s*(.+)$/);
      const tipo = (texto.match(/Tipo:\s*([\wçã]+)/) ?? [])[1] ?? null;
      const [antes, depoisSlide = ""] = texto.split("**No slide**");
      const [noSlide, fala = ""] = depoisSlide.split("**Fala**");
      blocos.push({
        numero: m ? Number(m[1]) : null,
        titulo: m ? m[2].trim() : cab.trim(),
        tipo,
        duracao_s: duracao(antes),
        noSlide: noSlide.trim(),
        fala: fala.trim(),
      });
    }
  }

  const fixas = new Set(["Gancho", "Objetivos", "Blocos"]);
  const finais = secoes
    .filter((s) => !fixas.has(s.titulo))
    .map((s) => ({ titulo: s.titulo, duracao_s: duracao(s.texto), corpo: semLinhaDeDuracao(s.texto) }));

  return {
    meta: { relacionados: [], ...meta },
    gancho: gancho ? { duracao_s: duracao(gancho.texto), texto: semLinhaDeDuracao(gancho.texto) } : null,
    objetivos: objetivos ? { duracao_s: duracao(objetivos.texto), itens: itensDeLista(objetivos.texto) } : null,
    blocos,
    finais,
  };
}

export function validarRoteiro(r) {
  const erros = [];
  for (const campo of ["titulo_provisorio", "formato", "playlist"]) {
    if (!r.meta[campo]) erros.push(`frontmatter sem "${campo}"`);
  }
  if (!r.gancho) erros.push('falta a seção "## Gancho"');
  else {
    if (r.gancho.duracao_s == null) erros.push("Gancho sem linha de duração (ex.: Duração: 30 s)");
    if (!r.gancho.texto) erros.push("Gancho vazio");
  }
  if (!r.objetivos) erros.push('falta a seção "## Objetivos"');
  else {
    if (r.objetivos.duracao_s == null) erros.push("Objetivos sem linha de duração");
    if (r.objetivos.itens.length < 3 || r.objetivos.itens.length > 5)
      erros.push(`Objetivos deve ter de 3 a 5 itens (tem ${r.objetivos.itens.length})`);
  }
  if (r.blocos.length === 0) erros.push('falta a seção "## Blocos" com pelo menos um "### 1. Título"');
  r.blocos.forEach((b, i) => {
    const nome = `bloco ${b.numero ?? i + 1}`;
    if (!TIPOS.includes(b.tipo)) erros.push(`${nome}: tipo "${b.tipo}" inválido — use ${TIPOS.join(" ou ")}`);
    if (b.duracao_s == null) erros.push(`${nome}: sem duração (ex.: Duração: 60 s)`);
    if (!b.noSlide) erros.push(`${nome}: sem a parte "**No slide**"`);
    if (!b.fala) erros.push(`${nome}: sem a parte "**Fala**"`);
  });
  if (r.blocos.some((b, i) => b.numero !== i + 1)) erros.push("blocos precisam estar numerados em sequência a partir de 1");
  const enc = r.finais.find((f) => f.titulo === "Encerramento");
  if (!enc) erros.push('falta a seção "## Encerramento"');
  else if (enc.duracao_s == null) erros.push("Encerramento sem linha de duração");
  for (const f of r.finais) if (f.duracao_s == null && f.titulo !== "Encerramento") erros.push(`seção "${f.titulo}" sem duração`);
  return erros;
}

export function carregarRoteiro(caminho) {
  const r = lerRoteiro(readFileSync(resolve(caminho), "utf8"));
  const erros = validarRoteiro(r);
  if (erros.length) throw new Error(`roteiro inválido:\n- ${erros.join("\n- ")}`);
  return r;
}

export function duracaoTotal(r) {
  return (r.gancho?.duracao_s ?? 0) + (r.objetivos?.duracao_s ?? 0)
    + r.blocos.reduce((s, b) => s + (b.duracao_s ?? 0), 0)
    + r.finais.reduce((s, f) => s + (f.duracao_s ?? 0), 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const caminho = process.argv[2];
  if (!caminho) { console.error("uso: node scripts/roteiro.mjs videos/<slug>/roteiro.md"); process.exit(1); }
  try {
    const r = carregarRoteiro(caminho);
    console.log(JSON.stringify({ ...r, duracao_total_s: duracaoTotal(r) }, null, 2));
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exit(1);
  }
}
