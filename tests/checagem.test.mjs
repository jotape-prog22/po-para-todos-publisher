import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarChecagem, resumoChecagem, carregarChecagem, precisaChecagem, ErroChecagem, RESULTADOS, TIPOS } from "../scripts/checagem.mjs";

const exemplo = new URL("../instagram/2026-09-20-kruskal-1956/checagem.json", import.meta.url);
const kruskal = JSON.parse(readFileSync(exemplo, "utf8"));
const ok = { onde: "card 2", texto: "x = 4", tipo: "conta", resultado: "confirmada", como: "enumerei as combinações inteiras e o máximo é 220" };

test("o exemplo do Kruskal é uma Checagem válida com fonte por DOI", () => {
  assert.deepEqual(validarChecagem(kruskal), []);
  assert.ok(kruskal.afirmacoes.every((a) => a.tipo === "fonte" && a.fonte.startsWith("https://doi.org/")));
});

test("artigo e curiosidade exigem Checagem; aviso e citacao, não", () => {
  assert.ok(precisaChecagem("artigo") && precisaChecagem("curiosidade"));
  assert.ok(!precisaChecagem("aviso") && !precisaChecagem("citacao"));
});

test("validação: campos obrigatórios, valores permitidos, fonte com URL, conta não fica sem acesso, como diz o que conferiu", () => {
  assert.deepEqual(RESULTADOS, ["confirmada", "nao-confirmada", "sem-acesso"]);
  assert.deepEqual(TIPOS, ["fonte", "conta"]);
  assert.ok(validarChecagem({})[0].includes("afirmacoes"));
  assert.ok(validarChecagem({ afirmacoes: [] })[0].includes("pelo menos uma"));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, como: "" }] }).some((e) => e.includes('falta "como"')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "palpite" }] }).some((e) => e.includes("fonte ou conta")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, resultado: "talvez" }] }).some((e) => e.includes("confirmada, nao-confirmada, sem-acesso")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "fonte" }] }).some((e) => e.includes('"fonte" com a URL')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, tipo: "fonte", fonte: "doi.org/x" }] }).some((e) => e.includes('"fonte" com a URL')));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, resultado: "sem-acesso" }] }).some((e) => e.includes("recalcule")));
  assert.ok(validarChecagem({ afirmacoes: [{ ...ok, como: "conferi" }] }).some((e) => e.includes("pelo menos 20")));
  assert.deepEqual(validarChecagem({ afirmacoes: [ok, { ...ok, tipo: "fonte", fonte: "https://doi.org/10.1/x", resultado: "sem-acesso", como: "o DOI leva a uma página paga; não li o artigo" }] }), []);
});

test("resumo: agrupa por resultado, na ordem confirmei / não confirmei / sem acesso, com onde, texto e como", () => {
  const r = resumoChecagem({ afirmacoes: [ok, { ...ok, onde: "card 3", texto: "y", resultado: "nao-confirmada", como: "não achei isso no artigo; o texto foi ajustado" }] });
  const linhas = r.split("\n");
  assert.equal(linhas[0], "CHECAGEM — 2 afirmação(ões)");
  assert.equal(linhas[1], "✔ Confirmei (1)");
  assert.equal(linhas[2], '  - card 2: "x = 4" — enumerei as combinações inteiras e o máximo é 220');
  assert.equal(linhas[3], "✖ Não confirmei (1)");
  assert.equal(linhas[4], '  - card 3: "y" — não achei isso no artigo; o texto foi ajustado');
  assert.equal(linhas[5], "⚠ Sem acesso à fonte (0)");
  assert.ok(resumoChecagem(kruskal).startsWith("CHECAGEM — "));
});

test("carregarChecagem: falta → erro apontando o guia; inválido → erro listando; válido → devolve", () => {
  const pasta = mkdtempSync(join(tmpdir(), "chec-"));
  assert.throws(() => carregarChecagem(pasta), (e) => e instanceof ErroChecagem && /falta checagem\.json/.test(e.message) && /GUIA-AGENTE/.test(e.message));
  writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [{ ...ok, como: "" }] }));
  assert.throws(() => carregarChecagem(pasta), /checagem\.json inválido/);
  writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [ok] }));
  assert.deepEqual(carregarChecagem(pasta), { afirmacoes: [ok] });
});
