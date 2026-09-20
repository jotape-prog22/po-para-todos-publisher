import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerRoteiro, validarRoteiro } from "../scripts/roteiro.mjs";

const md = readFileSync(new URL("../videos/folgas-complementares/roteiro.md", import.meta.url), "utf8");

test("lê frontmatter, gancho e objetivos", () => {
  const r = lerRoteiro(md);
  assert.equal(r.meta.formato, "conceito");
  assert.equal(r.meta.playlist, "dualidade");
  assert.equal(r.meta.relacionados[0].url, "https://youtu.be/yGP0LK19R30");
  assert.equal(r.gancho.duracao_s, 36);
  assert.ok(r.gancho.texto.startsWith("Você resolveu o Primal"));
  assert.equal(r.objetivos.duracao_s, 38);
  assert.equal(r.objetivos.itens.length, 4);
  assert.ok(r.objetivos.itens[3].startsWith("O que é o Preço-Sombra"));
});

test("lê os 10 blocos com tipo, duração, slide e fala", () => {
  const r = lerRoteiro(md);
  assert.equal(r.blocos.length, 10);
  const b = r.blocos[3];
  assert.equal(b.numero, 4);
  assert.equal(b.titulo, "As relações de complementaridade");
  assert.equal(b.tipo, "conteudo");
  assert.equal(b.duracao_s, 70);
  assert.ok(b.noSlide.startsWith("- Condição 1:"));
  assert.ok(b.fala.startsWith("Vamos ler as duas condições"));
  assert.equal(r.blocos[5].tipo, "exemplo");
});

test("lê as seções finais", () => {
  const r = lerRoteiro(md);
  assert.deepEqual(r.finais.map((f) => [f.titulo, f.duracao_s]), [
    ["Resumo — Pontos-chave", 48],
    ["Encerramento", 40],
  ]);
});

test("roteiro do exemplo é válido", () => {
  assert.deepEqual(validarRoteiro(lerRoteiro(md)), []);
});

test("validação aponta o que falta", () => {
  const quebrado = md
    .replace("Tipo: conteudo · Duração: 54 s", "Tipo: video · Duração: 54 s")
    .replace("### 5. Por que", "### 7. Por que")
    .replace("## Encerramento\nDuração: 40 s", "## Encerramento");
  const erros = validarRoteiro(lerRoteiro(quebrado));
  assert.ok(erros.some((e) => e.includes("bloco 1") && e.includes("tipo")));
  assert.ok(erros.some((e) => e.includes("numerados em sequência")));
  assert.ok(erros.some((e) => e.includes("Encerramento") && e.includes("duração")));
});
