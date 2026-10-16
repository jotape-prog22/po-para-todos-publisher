import { test } from "node:test";
import assert from "node:assert/strict";
import { cenaNoInstante, desenharQuadro } from "../design-system/motion/quadro.mjs";
import { montarComposicao } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";
import { ctxFalso, kitFalso, textos } from "./ajudas-motion.mjs";

const cena = (extra = {}) => validarCena({ duracao: 7, kicker: "K", titulo: "T", linhas: ["a"], ...extra }, "cena", { formato: "reel" }).cena;

test("cenaNoInstante acha a Cena e o tempo local; depois do fim fica na última", () => {
  const comp = montarComposicao([cena(), cena({ duracao: 5 })], { formato: "reel" });
  assert.deepEqual([cenaNoInstante(comp, 0).indice, cenaNoInstante(comp, 6.9).indice, cenaNoInstante(comp, 7).indice], [0, 0, 1]);
  assert.equal(cenaNoInstante(comp, 8).lt, 1);
  assert.equal(cenaNoInstante(comp, 99).indice, 1);
});

test("desenharQuadro: fundo, rodapé com o @ e faixa da Cena", () => {
  const comp = montarComposicao([cena({ faixa: "aula completa no canal" })], { formato: "reel", usuario: "pesquisaoperacionalparatodos" });
  const ctx = ctxFalso();
  desenharQuadro(ctx, comp, 6, kitFalso());
  const ts = textos(ctx).map((x) => x.s);
  assert.ok(ts.includes("@pesquisaoperacionalparatodos"));
  assert.ok(ts.includes("AULA COMPLETA NO CANAL"), "faixa em caixa alta");
  assert.deepEqual(ctx.chamadas.find((c) => c[0] === "fillRect").slice(1), [0, 0, 1080, 1920], "primeiro desenha o fundo inteiro");
});

test("saída da Cena e loop: alfa cai no fim de uma Cena intermediária e no fim do reel em loop", () => {
  const comp = montarComposicao([cena(), cena()], { formato: "reel" });
  assert.equal(comp.loop, true);
  // registra todo valor atribuído a globalAlpha durante o quadro
  const alfas = (t) => {
    const vistos = [];
    const ctx = new Proxy(ctxFalso(), { set(o, k, v) { if (k === "globalAlpha") vistos.push(v); o[k] = v; return true; }, get: (o, k) => o[k] });
    desenharQuadro(ctx, comp, t, kitFalso());
    return vistos;
  };
  assert.ok(alfas(6.95).some((a) => a > 0 && a < 0.2), "fim da Cena 1 quase apagado");
  assert.ok(alfas(13.94).some((a) => a > 0 && a < 0.2), "fim do reel recolhe (loop)");
  assert.ok(!alfas(3).some((a) => a > 0 && a < 0.2), "meio da Cena inteiro");
});

test("desenharQuadro: tipo de Cena desconhecido lança ErroMotion", async () => {
  const { ErroMotion } = await import("../design-system/motion/movimento.mjs");
  const comp = montarComposicao([cena()], { formato: "reel" });
  comp.cenas[0].tipo = "nao-existe";
  assert.throws(() => desenharQuadro(ctxFalso(), comp, 1, kitFalso()), (e) => e instanceof ErroMotion && /nao-existe/.test(e.message));
});

test("o clarão (spoiler) é desenhado depois da marca, cobrindo a tela inteira", () => {
  const c = validarCena({ tipo: "spoiler", duracao: 3, valor: 42 }, "cena", { formato: "reel" }).cena;
  const comp = montarComposicao([c, c], { formato: "reel" });
  const ctx = ctxFalso();
  desenharQuadro(ctx, comp, 0.2, kitFalso());
  const marca = ctx.chamadas.findIndex((x) => x[0] === "fillText" && x[1].startsWith("@"));
  const cobre = ctx.chamadas.map((x, i) => [x, i]).filter(([x]) => x[0] === "fillRect" && x[3] === 1080 && x[4] === 1920).map(([, i]) => i);
  assert.ok(cobre.length >= 2 && cobre.at(-1) > marca, "o último fillRect de tela cheia vem depois do @ do rodapé");
  const sem = ctxFalso();
  desenharQuadro(sem, comp, 2.9, kitFalso());
  assert.equal(sem.chamadas.filter((x) => x[0] === "fillRect" && x[3] === 1080 && x[4] === 1920).length, 1, "sem batida não há clarão");
});

// Instante do último quadro gravado (o renderizador grava round(duracao × 30) quadros, de 0 em 0).
const ultimoQuadro = (comp) => (Math.round(comp.duracao * 30) - 1) / 30;

test("loop com a última Cena de grade: o último quadro gravado é o fundo limpo, sem grade (emenda com o primeiro)", () => {
  const conta = validarCena({ tipo: "conta", duracao: 8, kicker: "K", titulo: "T", linhas: ["2 + 3 = 5"] }, "cena", { formato: "reel" }).cena;
  const comp = montarComposicao([cena(), conta], { formato: "reel" });
  assert.equal(comp.loop, true);
  const ctx = ctxFalso();
  desenharQuadro(ctx, comp, ultimoQuadro(comp), kitFalso());
  const nomes = ctx.chamadas.map((c) => c[0]);
  assert.ok(!nomes.includes("stroke"), "nenhum traço (grade ou conteúdo) no último quadro");
  assert.ok(!nomes.includes("clip"), "a grade nem começa a ser desenhada");
  assert.deepEqual(textos(ctx).map((x) => x.s), ["@pesquisaoperacionalparatodos"], "só a marca, como no fundo do primeiro quadro");
});

test("saída e loop chegam a zero no último quadro gravado (sem piscar 16 % → vazio)", () => {
  const comp = montarComposicao([cena(), cena()], { formato: "reel" });
  const conteudo = (t) => { const ctx = ctxFalso(); desenharQuadro(ctx, comp, t, kitFalso()); return textos(ctx).filter((x) => !x.s.startsWith("@")).length; };
  assert.equal(conteudo(ultimoQuadro(comp)), 0, "loop: último quadro do reel sem conteúdo");
  const fim1 = comp.cenas[0].fim;
  assert.equal(conteudo(Math.ceil(fim1 * 30 - 1) / 30), 0, "saída: último quadro da Cena 1 sem conteúdo");
  assert.ok(conteudo(3) > 0, "meio da Cena com conteúdo");
});
