import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarLegenda, montarLegenda, GANCHO_MAX } from "../scripts/legenda.mjs";

const pasta = new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url);
const legenda = JSON.parse(readFileSync(new URL("legenda.json", pasta), "utf8"));
const canal = JSON.parse(readFileSync(new URL("../../canal.json", pasta), "utf8"));
const esperada = readFileSync(new URL("legenda.txt", pasta), "utf8").trim();

test("legenda do exemplo é idêntica à gravada", () => {
  assert.deepEqual(validarLegenda(legenda, "artigo"), []);
  assert.equal(montarLegenda({ legenda, tipo: "artigo", canal }), esperada);
});

test("gancho cabe nos 125 caracteres e é uma linha", () => {
  assert.ok(legenda.gancho.length <= GANCHO_MAX);
  assert.ok(validarLegenda({ ...legenda, gancho: "a".repeat(126) }, "artigo").some((e) => e.includes("125")));
  assert.ok(validarLegenda({ ...legenda, gancho: "a\nb" }, "artigo").some((e) => e.includes("uma linha")));
});

test("regras: hashtags do tema, autores no artigo, sem pedir like", () => {
  assert.ok(validarLegenda({ ...legenda, hashtags_tema: ["#A", "#B"] }, "artigo").some((e) => e.includes("3 a 4")));
  assert.ok(validarLegenda({ ...legenda, hashtags_tema: ["#Árvore", "#B", "#C"] }, "artigo").some((e) => e.includes("sem acento")));
  assert.ok(validarLegenda({ ...legenda, autores: null }, "artigo").some((e) => e.includes("autores")));
  assert.deepEqual(validarLegenda({ ...legenda, autores: null }, "aviso"), []);
  assert.ok(validarLegenda({ ...legenda, corpo: "Deixe o like!" }, "artigo").some((e) => e.includes("like")));
});

test("aviso usa o CTA de link na bio e não leva autores", () => {
  const l = { gancho: "Prazo do SBPO chegando.", corpo: "Submissões até 15/03.", autores: null, hashtags_tema: ["#SBPO", "#Evento", "#Prazo"] };
  const t = montarLegenda({ legenda: l, tipo: "aviso", canal });
  assert.ok(t.includes("🔗 Inscrições e detalhes: link na bio."));
  assert.ok(!t.includes("✍️"));
  assert.ok(t.endsWith("#PesquisaOperacional #PO #SBPO #Evento #Prazo #Otimização #UNIRIO"));
});
