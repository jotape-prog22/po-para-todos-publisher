import { test } from "node:test";
import assert from "node:assert/strict";
import { montarComposicao, encaixarNaBatida, CLASSES } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";

const cena = (extra = {}, formato = "reel") => validarCena({ duracao: 7, kicker: "K", titulo: "T", linhas: ["a"], ...extra }, "cena", { formato }).cena;

test("Cenas em sequência: início e fim acumulados, duração total, classes do formato", () => {
  const c = montarComposicao([cena(), cena({ duracao: 12 })], { formato: "reel", usuario: "u" });
  assert.deepEqual(c.cenas.map((x) => [x.inicio, x.fim]), [[0, 7], [7, 19]]);
  assert.equal(c.duracao, 19);
  assert.equal(c.classes, CLASSES.reel);
  assert.ok(CLASSES.reel.includes("ig--reel-cena") && CLASSES.reel.includes("ig--sem-sticker"));
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story", semSticker: false }).classes, "ig ig--story ig--story-video");
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story", semSticker: true }).classes, "ig ig--story ig--story-video ig--sem-sticker");
});

test("eventos de som: deslocados pelo início da Cena, whoosh na troca de Cena (só no reel), ganho do formato", () => {
  const c = montarComposicao([cena(), cena()], { formato: "reel" });
  const whoosh = c.efeitos.filter((e) => e.efeito === "whoosh");
  assert.deepEqual(whoosh.map((e) => e.t), [7]);
  assert.ok(c.efeitos.some((e) => e.efeito === "pop" && e.t === 7.3));
  assert.ok(c.efeitos.every((e) => e.ganho === 0.8));
  const s = montarComposicao([cena({}, "story")], { formato: "story" });
  assert.ok(s.efeitos.every((e) => e.ganho === 0.4) && !s.efeitos.some((e) => e.efeito === "whoosh"));
});

test("efeitos iguais colados (< 80 ms) viram um só; efeitos diferentes no mesmo instante ficam", () => {
  const base = cena();
  const colada = { ...base, linha: { ...base.linha, eventos: [{ t: 1, efeito: "tick" }, { t: 1.05, efeito: "tick" }, { t: 1.05, efeito: "pop" }, { t: 1.2, efeito: "tick" }] } };
  const c = montarComposicao([colada], { formato: "reel" });
  assert.deepEqual(c.efeitos.filter((e) => e.efeito === "tick").map((e) => e.t), [1, 1.2], "o tick de 1,05 s cai (50 ms depois do anterior); o de 1,2 s fica");
  assert.deepEqual(c.efeitos.filter((e) => e.efeito === "pop").map((e) => e.t), [1.05]);
});

test("loop só no reel cuja última Cena não tem faixa", () => {
  assert.equal(montarComposicao([cena()], { formato: "reel" }).loop, true);
  assert.equal(montarComposicao([cena({ faixa: "AULA COMPLETA NO CANAL" })], { formato: "reel" }).loop, false);
  assert.equal(montarComposicao([cena({}, "story")], { formato: "story" }).loop, false);
});

test("encaixarNaBatida põe as fronteiras no compasso sem encurtar Cena abaixo do mínimo", () => {
  const batida = { bpm: 120, primeira_batida: 0.5 };   // compasso de 4 tempos = 2 s
  assert.deepEqual(encaixarNaBatida([7, 19, 33], [5, 6, 6], batida, 4), [6.5, 18.5, 32.5]);
  assert.deepEqual(encaixarNaBatida([5], [5], batida, 4), [6.5], "arredondar para 4,5 deixaria a Cena com menos de 5 s");
  const c = montarComposicao([cena(), cena({ duracao: 12 })], { formato: "reel", trilha: batida });
  assert.deepEqual(c.cenas.map((x) => x.fim), [6.5, 18.5]);
  assert.ok(c.cenas.every((x) => x.fim - x.inicio >= x.minimo));
});
