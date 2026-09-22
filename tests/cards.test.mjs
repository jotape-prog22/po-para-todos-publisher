import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const DS = new URL("../design-system/", import.meta.url);
const formatos = JSON.parse(readFileSync(new URL("instagram/formatos.json", DS), "utf8"));

test("formatos do Instagram: feed 4:5, story 9:16, um layout por card", () => {
  assert.deepEqual(formatos.formatos.feed, { largura: 1080, altura: 1350, proporcao: "4:5" });
  assert.deepEqual(formatos.formatos.story, { largura: 1080, altura: 1920, proporcao: "9:16" });
  assert.deepEqual(Object.keys(formatos.cards), ["capa", "ideia", "fim", "aviso", "curiosidade", "citacao"]);
  for (const [id, c] of Object.entries(formatos.cards)) {
    assert.ok(existsSync(new URL(`instagram/layouts/${c.layout}.html`, DS)), `layout ${c.layout} do card ${id}`);
    for (const campo of c.obrigatorios) assert.ok(campo in c.campos, `${id}.${campo} obrigatório sem limite`);
  }
  assert.ok(existsSync(new URL("instagram/layouts/story-video.html", DS)));
  assert.deepEqual(formatos.tipos, { artigo: { min: 3, max: 10 }, aviso: { min: 1, max: 1 }, curiosidade: { min: 1, max: 1 }, citacao: { min: 1, max: 1 } });
});

import { mkdtempSync, copyFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validarCards, variaveisDoCard, gerarCards, ErroCards } from "../design-system/scripts/gerar-cards.mjs";

const exemplo = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));
const dados = JSON.parse(readFileSync(join(exemplo, "cards.json"), "utf8"));

test("o exemplo passa na validação", () => {
  assert.deepEqual(validarCards(dados), []);
});

test("validação: sequência do artigo, limites e campos desconhecidos", () => {
  const capa = { tipo: "capa", titulo: "T", autores: "A" };
  const ideia = { tipo: "ideia", titulo: "I", texto: "x" };
  const fim = { tipo: "fim", texto: "ref" };
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, ideia] }).some((e) => e.includes("3 a 10")));
  assert.ok(validarCards({ tipo: "artigo", cards: [ideia, ideia, fim] }).some((e) => e.includes("primeiro card é a capa")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, ideia, ideia] }).some((e) => e.includes("último card")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, { ...ideia, texto: "x".repeat(281) }, fim] }).some((e) => e.includes("máximo 280")));
  assert.ok(validarCards({ tipo: "artigo", cards: [capa, { ...ideia, cor: "azul" }, fim] }).some((e) => e.includes('campo "cor"')));
  assert.ok(validarCards({ tipo: "artigo", cards: [{ tipo: "capa", titulo: "T" }, ideia, fim] }).some((e) => e.includes('falta "autores"')));
  assert.ok(validarCards({ tipo: "aviso", cards: [capa] }).some((e) => e.includes("tipo aviso")));
  assert.ok(validarCards({ tipo: "reel", cards: [] })[0].includes('tipo "reel" não existe'));
  assert.deepEqual(validarCards({ tipo: "aviso", cards: [{ tipo: "aviso", titulo: "SBPO", data: "ATÉ 15/03" }] }), []);
});

test("variáveis do card: kicker padrão, numeração, contador, título médio e quebras de linha", () => {
  const v = variaveisDoCard({ tipo: "ideia", titulo: "I", texto: "a<b\nc" }, 1, 5, { ds: ".", usuario: "po" });
  assert.equal(v.numero, "01");
  assert.equal(v.contador, "2/5");
  assert.equal(v.texto_html, "a&lt;b<br>c");
  assert.equal(v.usuario, "po");
  assert.equal(variaveisDoCard({ tipo: "capa", titulo: "T", autores: "A" }, 0, 3, { ds: ".", usuario: "po" }).kicker, "RESUMO DE ARTIGO");
  assert.equal(variaveisDoCard({ tipo: "capa", titulo: "T".repeat(61), autores: "A" }, 0, 3, { ds: ".", usuario: "po" }).titulo_classe, "ig__titulo--medio");
  assert.equal(variaveisDoCard({ tipo: "aviso", titulo: "T", kicker: "Prazo" }, 0, 1, { ds: ".", usuario: "po" }).kicker, "Prazo");
});

test("gerarCards --so-html escreve um HTML por card com o layout certo", () => {
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  copyFileSync(join(exemplo, "cards.json"), join(pasta, "cards.json"));
  const saidas = gerarCards(pasta, { soHtml: true });
  assert.equal(saidas.length, 5);
  const capa = readFileSync(saidas[0], "utf8");
  assert.ok(capa.includes("ig--feed") && capa.includes("RESUMO DE ARTIGO") && capa.includes("Joseph B. Kruskal") && capa.includes("1/5"));
  assert.ok(readFileSync(saidas[1], "utf8").includes('class="ig__numero">01<'));
  assert.ok(readFileSync(saidas[4], "utf8").includes("doi.org/10.1090"));
  assert.match(capa, /href="[^"]*design-system\/tokens\.css"/);
});

test("gerarCards recusa cards.json inválido", () => {
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "aviso", cards: [] }));
  assert.throws(() => gerarCards(pasta, { soHtml: true }), ErroCards);
});

test("curiosidade: um card do tipo curiosidade, kicker padrão VOCÊ SABIA?, fonte opcional", () => {
  const c = { tipo: "curiosidade", titulo: "O Simplex tem mais de 75 anos", texto: "Dantzig publicou o método em 1947.", fonte: "Dantzig, 1947" };
  assert.deepEqual(validarCards({ tipo: "curiosidade", cards: [c] }), []);
  assert.ok(validarCards({ tipo: "curiosidade", cards: [{ tipo: "aviso", titulo: "X" }] }).some((e) => e.includes("card único é do tipo curiosidade")));
  assert.ok(validarCards({ tipo: "curiosidade", cards: [{ ...c, texto: "x".repeat(321) }] }).some((e) => e.includes("máximo 320")));
  const v = variaveisDoCard(c, 0, 1, { ds: ".", usuario: "po" });
  assert.equal(v.kicker, "VOCÊ SABIA?");
  assert.equal(v.fonte, "Dantzig, 1947");
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "curiosidade", cards: [c] }));
  const [html] = gerarCards(pasta, { soHtml: true });
  const h = readFileSync(html, "utf8");
  assert.ok(h.includes("VOCÊ SABIA?") && h.includes("Dantzig, 1947") && h.includes("ig--feed"));
});

test("citacao: um card com texto e origem; kicker padrão DA AULA", () => {
  const c = { tipo: "citacao", texto: "Se sobrou, comprar mais dele não adianta nada.", origem: "Teorema das Folgas Complementares" };
  assert.deepEqual(validarCards({ tipo: "citacao", cards: [c] }), []);
  assert.ok(validarCards({ tipo: "citacao", cards: [{ tipo: "citacao", texto: "x" }] }).some((e) => e.includes('falta "origem"')));
  assert.ok(validarCards({ tipo: "citacao", cards: [{ tipo: "ideia", titulo: "I", texto: "t" }] }).some((e) => e.includes("card único é do tipo citacao")));
  const v = variaveisDoCard(c, 0, 1, { ds: ".", usuario: "po" });
  assert.equal(v.kicker, "DA AULA");
  assert.equal(v.origem, "Teorema das Folgas Complementares");
});

test("gerarCards apaga card-NN.png e .html que sobraram de uma versão anterior com mais cards", () => {
  const pasta = mkdtempSync(join(tmpdir(), "cards-"));
  writeFileSync(join(pasta, "cards.json"), JSON.stringify({ tipo: "aviso", cards: [{ tipo: "aviso", titulo: "X" }] }));
  writeFileSync(join(pasta, "card-02.png"), "lixo");
  writeFileSync(join(pasta, "card-03.html"), "lixo");
  gerarCards(pasta, { soHtml: true });
  assert.ok(!existsSync(join(pasta, "card-02.png")));
  assert.ok(!existsSync(join(pasta, "card-03.html")));
  assert.ok(existsSync(join(pasta, "card-01.html")));
});
