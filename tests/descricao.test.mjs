import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerRoteiro } from "../scripts/roteiro.mjs";
import { formatarTempo, capitulos, montarDescricao, validarTitulo } from "../scripts/descricao.mjs";

const pasta = new URL("../videos/folgas-complementares/", import.meta.url);
const roteiro = lerRoteiro(readFileSync(new URL("roteiro.md", pasta), "utf8"));
const metadados = JSON.parse(readFileSync(new URL("metadados.json", pasta), "utf8"));
const canal = JSON.parse(readFileSync(new URL("../../canal.json", pasta), "utf8"));
const publicada = readFileSync(new URL("descricao-publicada.txt", pasta), "utf8").trim();

test("formata tempo em mm:ss e h:mm:ss", () => {
  assert.equal(formatarTempo(0), "00:00");
  assert.equal(formatarTempo(74), "01:14");
  assert.equal(formatarTempo(3725), "1:02:05");
});

test("capítulos acumulam as durações do roteiro", () => {
  const c = capitulos(roteiro);
  assert.equal(c.length, 14);
  assert.deepEqual(c[0], { tempo: "00:00", titulo: "Abertura" });
  assert.deepEqual(c[2], { tempo: "01:14", titulo: "Relembrando: Primal e Dual" });
  assert.deepEqual(c[13], { tempo: "16:48", titulo: "Encerramento" });
});

test("descrição gerada é idêntica à publicada", () => {
  assert.equal(montarDescricao({ roteiro, metadados, canal }), publicada);
});

test("capítulos reais em metadados substituem os estimados", () => {
  const m = { ...metadados, capitulos: [{ tempo: "00:00", titulo: "Abertura" }, { tempo: "00:40", titulo: "Fim" }] };
  const d = montarDescricao({ roteiro, metadados: m, canal });
  assert.ok(d.includes("00:40 Fim"));
  assert.ok(!d.includes("01:14 Relembrando"));
});

test("sem vídeos relacionados o bloco ⚠️ some", () => {
  const r = { ...roteiro, meta: { ...roteiro.meta, relacionados: [] } };
  const d = montarDescricao({ roteiro: r, metadados, canal });
  assert.ok(!d.includes("⚠️"));
  assert.ok(d.includes("16:48 Encerramento\n\n📚"));
});

test("valida título no padrão do canal", () => {
  assert.deepEqual(validarTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra"), []);
  assert.deepEqual(validarTitulo("COMO USAR SOLVER NO EXCEL - Análise de Sensibilidade - Parte 2"), []);
  assert.ok(validarTitulo("Teorema das folgas - explicado").some((e) => e.includes("CAIXA ALTA")));
  assert.ok(validarTitulo("SIMPLEX explicado").some((e) => e.includes(' - ')));
  assert.ok(validarTitulo("SIMPLEX - Aprenda Agora!").some((e) => e.includes("!")));
  assert.ok(validarTitulo("SIMPLEX - " + "a".repeat(70)).some((e) => e.includes("70")));
});
