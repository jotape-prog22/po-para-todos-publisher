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
  assert.ok(alfas(6.99).some((a) => a < 0.2), "fim da Cena 1 quase apagado");
  assert.ok(alfas(13.99).some((a) => a < 0.2), "fim do reel recolhe (loop)");
  assert.ok(!alfas(3).some((a) => a > 0 && a < 0.2), "meio da Cena inteiro");
});

test("desenharQuadro: tipo de Cena desconhecido lança ErroMotion", async () => {
  const { ErroMotion } = await import("../design-system/motion/movimento.mjs");
  const comp = montarComposicao([cena()], { formato: "reel" });
  comp.cenas[0].tipo = "nao-existe";
  assert.throws(() => desenharQuadro(ctxFalso(), comp, 1, kitFalso()), (e) => e instanceof ErroMotion && /nao-existe/.test(e.message));
});

test("o clarão do impacto é desenhado depois da marca, cobrindo a tela inteira", () => {
  const c = validarCena({ tipo: "impacto", duracao: 3, palavras: ["AGORA"] }, "cena", { formato: "reel" }).cena;
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
