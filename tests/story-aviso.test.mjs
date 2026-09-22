import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { encurtar, cenaDoAviso, gerarStoryAviso, ErroStoryAviso, DURACAO_AVISO } from "../design-system/scripts/gerar-story-aviso.mjs";
import { validar, LIMITES } from "../design-system/scripts/gerar-story-video.mjs";

const exemplo = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));
const kruskal = JSON.parse(readFileSync(join(exemplo, "cards.json"), "utf8"));

test("encurtar corta na última palavra inteira e termina com reticências", () => {
  assert.equal(encurtar("curto", 10), "curto");
  assert.equal(encurtar("uma frase bem comprida mesmo", 15), "uma frase bem…");
  assert.equal(encurtar("semespacoalgumnestafrase", 10), "semespaco…");
  assert.ok(encurtar("a".repeat(100), 60).length <= 60);
});

test("cena do artigo: kicker fixo, título encurtado ao limite, autores e onde nas linhas, faixa VEJA NO FEED", () => {
  const cena = cenaDoAviso(kruskal);
  assert.equal(cena.kicker, "POST NOVO: RESUMO DE ARTIGO");
  assert.ok(cena.titulo.length <= LIMITES.campos.titulo && cena.titulo.endsWith("…"));
  assert.deepEqual(cena.linhas, ["Joseph B. Kruskal", "Proc. of the AMS, 1956"]);
  assert.equal(cena.faixa, "VEJA NO FEED");
  assert.equal(cena.duracao, DURACAO_AVISO);
  assert.equal(validar({ tipo: "stories", publicacao: "api", stories: [cena] }).length, 1);
});

test("cena do aviso: kicker do card, data e primeira frase do texto", () => {
  const cena = cenaDoAviso({ tipo: "aviso", cards: [{ tipo: "aviso", kicker: "PRAZO", titulo: "Chamada de trabalhos SBPO", data: "ATÉ 15/03", texto: "Artigos completos. Resumo estendido também vale." }] });
  assert.equal(cena.kicker, "POST NOVO: PRAZO");
  assert.deepEqual(cena.linhas, ["ATÉ 15/03", "Artigos completos."]);
  assert.throws(() => cenaDoAviso({ tipo: "reel", cards: [{}] }), ErroStoryAviso);
});

test("cena da curiosidade: kicker VOCÊ SABIA? e primeira frase do texto", () => {
  const cena = cenaDoAviso({ tipo: "curiosidade", cards: [{ tipo: "curiosidade", titulo: "O Simplex tem mais de 75 anos", texto: "Dantzig publicou o método em 1947. Ainda é o mais usado." }] });
  assert.equal(cena.kicker, "POST NOVO: VOCÊ SABIA?");
  assert.deepEqual(cena.linhas, ["Dantzig publicou o método em 1947."]);
});

test("cena da citação: kicker CITAÇÃO, origem como título, o trecho na linha", () => {
  const cena = cenaDoAviso({ tipo: "citacao", cards: [{ tipo: "citacao", texto: "Se sobrou, comprar mais não adianta.", origem: "Folgas Complementares" }] });
  assert.equal(cena.kicker, "POST NOVO: CITAÇÃO");
  assert.equal(cena.titulo, "Folgas Complementares");
  assert.deepEqual(cena.linhas, ["Se sobrou, comprar mais não adianta."]);
});

test("gerarStoryAviso --so-html escreve story-aviso.html sem sticker com o título do post", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "aviso-"));
  copyFileSync(join(exemplo, "cards.json"), join(pasta, "cards.json"));
  const saida = await gerarStoryAviso(pasta, { soHtml: true });
  assert.ok(saida.endsWith("story-aviso.html"));
  const html = readFileSync(saida, "utf8");
  assert.ok(html.includes("ig--sem-sticker") && html.includes("POST NOVO: RESUMO DE ARTIGO") && html.includes("VEJA NO FEED"));
  writeFileSync(join(pasta, "cards.json"), "{}");
  await assert.rejects(gerarStoryAviso(pasta, { soHtml: true }), ErroStoryAviso);
});
