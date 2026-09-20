import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { carregarTokens, validarSlides, gerarSlides, LIMITES } from "../design-system/scripts/gerar-slides.mjs";

const spec = JSON.parse(readFileSync(new URL("../videos/folgas-complementares/slides.json", import.meta.url), "utf8"));

async function abrir(spec) {
  const saida = join(mkdtempSync(join(tmpdir(), "slides-")), "t.pptx");
  await gerarSlides(spec, { saida });
  const zip = await JSZip.loadAsync(readFileSync(saida));
  const nomes = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const xml = {};
  for (const n of nomes) xml[Number(n.match(/slide(\d+)/)[1])] = await zip.file(n).async("string");
  const rels = {};
  for (const n of nomes) {
    const i = Number(n.match(/slide(\d+)/)[1]);
    rels[i] = await zip.file(`ppt/slides/_rels/slide${i}.xml.rels`).async("string");
  }
  return { total: nomes.length, xml, rels };
}

test("tokens vêm do tokens.json", () => {
  const t = carregarTokens();
  assert.equal(t.cor["brand-navy"], "0E2841");
  assert.equal(t.cor["accent-blue"], "156082");
  assert.equal(t.cor["surface-panel"], "F3F4F5");
  assert.equal(t.fonte.title, "Aharoni");
  assert.equal(t.fonte.body, "Hagrid Text");
  assert.deepEqual(t.pt, { titulo: 44, corpo: 20, caption: 18 });
});

test("slides.json do exemplo é válido", () => {
  assert.deepEqual(validarSlides(spec), []);
});

test("validação recusa o que não cabe", () => {
  const longo = { apresentador: "x", slides: [
    { tipo: "capa", titulo: "a".repeat(LIMITES.capaTitulo + 1) },
    { tipo: "conteudo", titulo: "t", blocos: [{ itens: Array(10).fill("b".repeat(80)) }] },
    { tipo: "exemplo", titulo: "t", formulacao: ["c".repeat(61)], resultado: "r" },
    { tipo: "foto", titulo: "t" },
  ] };
  const erros = validarSlides(longo);
  assert.ok(erros.some((e) => e.startsWith("slide 1") && e.includes("título")));
  assert.ok(erros.some((e) => e.startsWith("slide 2") && e.includes("linhas")));
  assert.ok(erros.some((e) => e.startsWith("slide 3") && e.includes("formulação")));
  assert.ok(erros.some((e) => e.startsWith("slide 4") && e.includes("tipo")));
});

test("gera um slide por entrada, com logo UNIRIO em todos", async () => {
  const { total, rels } = await abrir(spec);
  assert.equal(total, 14);
  for (let i = 1; i <= total; i++) assert.match(rels[i], /logo-unirio|image/);
});

test("capa: título em Aharoni 44pt navy, autoria em caption", async () => {
  const { xml } = await abrir(spec);
  assert.ok(xml[1].includes("Teorema das Folgas Complementares"));
  assert.ok(xml[1].includes('typeface="Aharoni"'));
  assert.ok(xml[1].includes('sz="4400"'));
  assert.ok(xml[1].includes('val="0E2841"'));
  assert.ok(xml[1].includes("Projeto PO para Todos – UNIRIO"));
  assert.ok(xml[1].includes('sz="1800"'));
});

test("conteúdo: rótulo em accent-blue, marcadores e negrito inline", async () => {
  const { xml } = await abrir(spec);
  const s = xml[6]; // "As relações de complementaridade"
  assert.ok(s.includes("Condição 1"));
  assert.ok(s.includes('val="156082"'));
  assert.ok(s.includes("<a:buChar"));
  assert.ok(s.includes('typeface="Hagrid Text"'));
  assert.ok(s.includes('sz="2000"'));
  assert.ok(/<a:rPr[^>]*b="1"[^>]*>(?:(?!<\/a:r>).)*<a:t>folga<\/a:t>/s.test(s));
});
