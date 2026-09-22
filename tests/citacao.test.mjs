import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { frases, candidatosDoRoteiro, candidatosDosCards, candidatos, TAMANHO } from "../scripts/citacao.mjs";
import { carregarRoteiro } from "../scripts/roteiro.mjs";

const folgas = fileURLToPath(new URL("../videos/folgas-complementares/", import.meta.url));
const kruskal = fileURLToPath(new URL("../instagram/2026-09-20-kruskal-1956/", import.meta.url));

test("frases separa por ponto/interrogação e tira marcações de negrito e emoji", () => {
  assert.deepEqual(frases("Pense num **recurso** que sobrou. Sobrou? Então é zero 🤔 mesmo."), ["Pense num recurso que sobrou.", "Sobrou?", "Então é zero mesmo."]);
});

test("candidatos do roteiro: frases do gancho e das falas entre 60 e 200 caracteres, sem referências ao vídeo, no máximo 5", () => {
  const lista = candidatosDoRoteiro(carregarRoteiro(`${folgas}roteiro.md`));
  assert.ok(lista.length >= 3 && lista.length <= 5);
  for (const c of lista) {
    assert.ok(c.texto.length >= TAMANHO.min && c.texto.length <= TAMANHO.max, c.texto);
    assert.ok(!/nesta aula|vamos |como vimos|no slide/i.test(c.texto), c.texto);
    assert.ok(/^(Gancho|Bloco \d+: )/.test(c.origem), c.origem);
  }
});

test("candidatos dos cards: frases das ideias, com a origem no título do card", () => {
  const lista = candidatosDosCards(JSON.parse(readFileSync(`${kruskal}cards.json`, "utf8")));
  assert.ok(lista.length >= 2);
  assert.ok(lista.every((c) => /^Card \d+ \(.+\)$/.test(c.origem)));
});

test("candidatos(caminho) escolhe roteiro ou cards pelo tipo de pasta", async () => {
  assert.ok((await candidatos(folgas)).every((c) => /^(Gancho|Bloco)/.test(c.origem)));
  assert.ok((await candidatos(kruskal)).every((c) => /^Card/.test(c.origem)));
  await assert.rejects(candidatos("/nao/existe"), /não achei/);
});
