import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarLegenda, montarLegenda, contarHashtags, GANCHO_MAX, gerarLegenda } from "../scripts/legenda.mjs";

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

test("filtro amplo de like/curtir: singular, plural, imperativos", () => {
  assert.ok(validarLegenda({ ...legenda, corpo: "Deixem seus likes no post!" }, "artigo").some((e) => e.includes("like")));
  assert.ok(validarLegenda({ ...legenda, corpo: "Curtam o post!" }, "artigo").some((e) => e.includes("like")));
  assert.ok(validarLegenda({ ...legenda, corpo: "Curtida no post!" }, "artigo").some((e) => e.includes("like")));
  assert.ok(validarLegenda({ ...legenda, corpo: "Curtidas!" }, "artigo").some((e) => e.includes("like")));
  assert.ok(validarLegenda({ ...legenda, corpo: "Por favor, curte!" }, "artigo").some((e) => e.includes("like")));
  assert.deepEqual(validarLegenda({ ...legenda, corpo: "Conheça este algoritmo de 1956 com detalhes." }, "artigo"), []);
});

test("contarHashtags conta corretamente incluindo acentuação", () => {
  assert.equal(contarHashtags("#Otimização"), 1);
  assert.equal(contarHashtags("#PesquisaOperacional #PO #Otimização #UNIRIO"), 4);
  assert.equal(contarHashtags("#ArvoreGeradora #Kruskal #Grafos #CaixeiroViajante #Otimização"), 5);
  assert.equal(contarHashtags("Sem hashtags aqui."), 0);
});

test("aviso usa o CTA de link na bio e não leva autores", () => {
  const l = { gancho: "Prazo do SBPO chegando.", corpo: "Submissões até 15/03.", autores: null, hashtags_tema: ["#SBPO", "#Evento", "#Prazo"] };
  const t = montarLegenda({ legenda: l, tipo: "aviso", canal });
  assert.ok(t.includes("🔗 Inscrições e detalhes: link na bio."));
  assert.ok(!t.includes("✍️"));
  assert.ok(t.endsWith("#PesquisaOperacional #PO #SBPO #Evento #Prazo #Otimização #UNIRIO"));
});

test("curiosidade usa o CTA de salvar e não leva autores", () => {
  const texto = montarLegenda({ legenda: { gancho: "G", corpo: "C", autores: null, hashtags_tema: ["#A", "#B", "#C"] }, tipo: "curiosidade", canal });
  assert.ok(texto.includes(canal.instagramLegenda.cta.curiosidade) && !texto.includes("Autores"));
  assert.match(canal.instagramLegenda.cta.curiosidade, /Salve/);
});

test("gerarLegenda --reel lê reel.json.legenda, usa o CTA do reel e grava reel-legenda.txt", () => {
  const pasta = mkdtempSync(join(tmpdir(), "leg-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", cenas: [], legenda: { gancho: "G", corpo: "C", hashtags_tema: ["#A", "#B", "#C"] } }));
  const texto = gerarLegenda(pasta, { reel: true });
  assert.ok(texto.startsWith("G\n\nC\n\n") && texto.includes(canal.instagramLegenda.cta.reel));
  assert.equal(readFileSync(join(pasta, "reel-legenda.txt"), "utf8"), texto + "\n");
  assert.throws(() => gerarLegenda(pasta), /cards\.json/);
});
