import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCena, CENAS, TIPOS_DE_CENA } from "../design-system/motion/cenas/index.mjs";
import * as texto from "../design-system/motion/cenas/texto.mjs";
import { quebrarLinhas, caixa, escreverLinhas, duracaoEscrita } from "../design-system/motion/escrita.mjs";
import { kitFalso, ctxFalso, textos, desenharEm, movimento } from "./ajudas-motion.mjs";

const story = (extra = {}) => ({ duracao: 12, kicker: "UM DESAFIO", titulo: "VOCÊ TEM UMA PADARIA", linhas: ["Pão: 1 h", "Bolo: 2 h"], pergunta: "O que rende mais?", dica: "Responda no quiz", ...extra });

test("sem tipo vira texto; tipo desconhecido é recusado com a lista", () => {
  assert.ok(TIPOS_DE_CENA.includes("texto"));
  assert.equal(validarCena(story(), "story 1").cena.tipo, "texto");
  assert.match(validarCena({ ...story(), tipo: "slide" }, "cena 1").erros[0], /cena 1: tipo de cena "slide" não existe \(texto/);
});

test("texto mantém a linha do tempo de hoje e devolve eventos de som", () => {
  const { cena } = validarCena(story(), "story 1");
  assert.deepEqual(cena.linha.tempos, { kicker: 0, titulo: 0.3, blocos: [1.2, 2.3], pergunta: 3.5, dica: 4.3 });
  assert.equal(cena.linha.fim, 4.3);
  assert.equal(cena.minimo, 6.3);
  assert.deepEqual(cena.linha.eventos.map((e) => e.efeito), ["digitar", "pop", "tick", "tick", "caneta", "tick"]);
});

test("duração: story de 5 a 60 s com folga de 2 s; Cena de reel de 3 a 60 s com folga de 1,2 s", () => {
  assert.match(validarCena(story({ duracao: 5 }), "story 1").erros[0], /pelo menos 6\.3/);
  const curta = { duracao: 3, titulo: "NÃO DÁ" };
  assert.match(validarCena(curta, "story 1").erros[0], /de 5 a 60/);
  assert.deepEqual(validarCena(curta, "cena 1", { formato: "reel" }).erros, []);
  assert.equal(validarCena(curta, "cena 1", { formato: "reel" }).cena.minimo, 1.5);
});

test("texto recusa o que não cabe (mesmas regras de hoje)", () => {
  const erro = (c) => validarCena(c, "story 1", { existeIcone: (n) => n === "alvo" }).erros[0] ?? "";
  assert.match(erro(story({ dica: "x".repeat(31) })), /"dica" tem 31/);
  assert.match(erro(story({ itens: [{ titulo: "A", texto: "b" }] })), /"linhas" ou "itens"/);
  assert.match(erro(story({ icone: "nao-existe" })), /ícone "nao-existe"/);
  assert.match(erro({ duracao: 10, linhas: ["a"] }), /"kicker" ou "titulo"/);
  assert.match(erro(story({ linhas: Array(7).fill("a") })), /7 linhas/);
  assert.equal(erro(story({ icone: "alvo" })), "");
});

test("quebrarLinhas respeita a largura e as quebras manuais; caixa alta em pt-BR mantém acentos", () => {
  const medir = (s) => s.length * 10;
  assert.deepEqual(quebrarLinhas(medir, "um dois três quatro", 100), ["um dois", "três", "quatro"]);
  assert.deepEqual(quebrarLinhas(medir, "a\nb c", 100), ["a", "b c"]);
  assert.equal(caixa({ caixaAlta: true }, "função ótima da região"), "FUNÇÃO ÓTIMA DA REGIÃO");
  assert.equal(caixa({}, "função"), "função");
});

test("texto desenha kicker em caixa alta, título e linhas; no instante 0 ainda não há linhas", () => {
  const { cena } = validarCena(story({ kicker: "um desafio de produção" }), "story 1");
  const fim = textos(desenharEm(texto, cena, [cena.duracao]));
  assert.ok(fim.some((x) => x.s.startsWith("UM DESAFIO DE PRODUÇÃO")));
  assert.ok(fim.some((x) => x.s.includes("Pão: 1 h")) && fim.some((x) => x.s.includes("Bolo: 2 h")));
  const comeco = textos(desenharEm(texto, cena, [0]));
  assert.ok(!comeco.some((x) => x.s.includes("Pão")));
});

test("texto que não cabe encolhe: nada passa do fim da área (story com sticker, campos no máximo)", () => {
  const kit = kitFalso();
  kit.layout.area = { x: 72, y: 572, w: 936, h: 600 };
  kit.layout.alinhamento = "top";
  const cheio = { duracao: 20, kicker: "K".repeat(40), titulo: "TÍTULO ".repeat(8).trim().slice(0, 60), linhas: Array(6).fill("palavra ".repeat(11).trim().slice(0, 90)), dica: "x".repeat(30) };
  const { cena, erros } = validarCena(cheio, "story 1");
  assert.deepEqual(erros, []);
  const ctx = ctxFalso();
  texto.desenhar(ctx, cena, cena.duracao, kit);
  const escala = ctx.chamadas.find((c) => c[0] === "scale");
  assert.ok(escala && escala[1] < 1, "encolheu");
  const [, tx, ty] = ctx.chamadas.find((c) => c[0] === "translate");
  const yMax = Math.max(...textos(ctx).map((x) => x.y));
  assert.ok(ty + yMax * escala[1] <= kit.layout.area.y + kit.layout.area.h, "última linha dentro da área");
});

test("todo tipo registrado cumpre o contrato", () => {
  for (const [tipo, m] of Object.entries(CENAS)) {
    assert.equal(typeof m.usaGrade, "boolean", tipo);
    for (const fn of ["validar", "linhaDoTempo", "desenhar"]) assert.equal(typeof m[fn], "function", `${tipo}.${fn}`);
  }
});

test("o ritmo da Cena texto vem de movimento.json (ritmo.texto)", () => {
  const r = movimento.ritmo.texto;
  const c = story();
  assert.deepEqual(texto.linhaDoTempo(c).tempos.blocos, [r.primeiro, r.primeiro + r.linha]);
  const outro = { ...movimento, ritmo: { ...movimento.ritmo, texto: { ...r, titulo: 0.5, primeiro: 2, linha: 1 } } };
  const lt = texto.linhaDoTempo(c, outro);
  assert.equal(lt.tempos.titulo, 0.5);
  assert.deepEqual(lt.tempos.blocos, [2, 3]);
});

test("item: recuo vem do layout (kit.layout.recuoItem) e o deslize de entrada de movimento.json (desenho.deslize)", () => {
  const { cena } = validarCena(story({ linhas: undefined, itens: [{ titulo: "Pão", texto: "rende 1 h" }] }), "story 1");
  const kit = kitFalso();
  const fim = textos(desenharEm(texto, cena, [cena.duracao], kit));
  assert.equal(fim.find((x) => x.s === "PÃO").x, kit.layout.recuoItem);
  const meio = cena.linha.tempos.blocos[0] + movimento.duracoes.entrada / 2;
  const semDeslize = kitFalso({ movimento: { ...movimento, desenho: { ...movimento.desenho, deslize: 0 } } });
  assert.equal(textos(desenharEm(texto, cena, [meio], semDeslize)).find((x) => x.s === "PÃO").x, kit.layout.recuoItem);
  assert.ok(textos(desenharEm(texto, cena, [meio], kit)).find((x) => x.s === "PÃO").x > kit.layout.recuoItem);
});

test("escreverLinhas escreve uma linha depois da outra, cada uma com a duração da escrita", () => {
  const kit = kitFalso(), f = kit.fontes.corpo, linhas = ["primeira linha", "b"];
  const d0 = duracaoEscrita(linhas[0], movimento), d1 = duracaoEscrita(linhas[1], movimento);
  assert.equal(d0, linhas[0].length * movimento.duracoes.escrita_por_caractere);
  assert.equal(d1, movimento.duracoes.escrita_minima, "linha curta usa a duração mínima");
  const em = (t) => { const ctx = ctxFalso(); const fim = escreverLinhas(ctx, linhas, f, 0, 0, t, 1, kit); return { fim, ditas: textos(ctx).map((x) => x.s) }; };
  assert.deepEqual(em(0.5).ditas, []);
  assert.deepEqual(em(1 + d0 / 2).ditas, ["primeira linha"]);
  assert.deepEqual(em(1 + d0 + d1 / 2).ditas, ["primeira linha", "b"]);
  assert.equal(em(0).fim, 1 + d0 + d1);
});
