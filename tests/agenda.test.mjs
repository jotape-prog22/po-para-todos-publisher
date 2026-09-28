import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ, ErroAgenda, lerAgenda, gravarAgenda, formatosDaPasta, verificarPasta, pastaRelativa, adicionar } from "../scripts/agenda.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories } from "./ajudas-agenda.mjs";

const erro = (re) => (e) => e instanceof ErroAgenda && re.test(e.message);

test("lerAgenda: arquivo ausente vira agenda vazia; corrompido dá erro amigável; gravar e ler é ida e volta", () => {
  const arq = join(mkdtempSync(join(tmpdir(), "ag-")), "agenda.json");
  assert.deepEqual(lerAgenda(arq), { itens: [] });
  gravarAgenda({ itens: [{ id: "a" }] }, arq);
  assert.deepEqual(lerAgenda(arq), { itens: [{ id: "a" }] });
  writeFileSync(arq, "{");
  assert.throws(() => lerAgenda(arq), erro(/corrompid/));
});

test("formatosDaPasta reconhece post, stories e reel pelos JSONs", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "a");
  assert.deepEqual(formatosDaPasta(p), ["post"]);
  criarPastaReel(raiz, "a");
  assert.deepEqual(formatosDaPasta(p), ["post", "reel"]);
});

test("verificarPasta(post): aceita, avisa quando falta o story de aviso", () => {
  const raiz = raizTemporaria();
  assert.deepEqual(verificarPasta(criarPastaPost(raiz, "sem-aviso"), "post").length, 1);
  assert.deepEqual(verificarPasta(criarPastaPost(raiz, "com-aviso", { aviso: true }), "post"), []);
});

test("verificarPasta(post): curiosidade sem checagem.json é recusada (ADR 0009)", () => {
  const p = criarPastaPost(raizTemporaria(), "c", { tipo: "curiosidade" });
  assert.throws(() => verificarPasta(p, "post"), erro(/checagem\.json/));
});

test("verificarPasta(post): card faltando e post já publicado são recusados", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "dois", { cards: 2 });
  unlinkSync(join(p, "card-02.png"));
  assert.throws(() => verificarPasta(p, "post"), erro(/card-02\.png/));
  const q = criarPastaPost(raiz, "publicado");
  writeFileSync(join(q, "publicacao.json"), "{}");
  assert.throws(() => verificarPasta(q, "post"), erro(/já foi publicado/));
});

test("verificarPasta(reel): corte passa; cenas exige checagem; falta o mp4", () => {
  const raiz = raizTemporaria();
  assert.deepEqual(verificarPasta(criarPastaReel(raiz, "corte"), "reel"), []);
  assert.throws(() => verificarPasta(criarPastaReel(raiz, "cenas", { tipo: "cenas" }), "reel"), erro(/checagem\.json/));
  const p = criarPastaReel(raiz, "sem-mp4");
  unlinkSync(join(p, "reel.mp4"));
  assert.throws(() => verificarPasta(p, "reel"), erro(/reel\.mp4/));
});

test("verificarPasta(stories): sequência com sticker (manual) é recusada; sem checagem também", () => {
  const raiz = raizTemporaria();
  assert.throws(() => verificarPasta(criarPastaStories(raiz, "manual", { publicacao: "manual" }), "stories"), erro(/sticker/));
  assert.throws(() => verificarPasta(criarPastaStories(raiz, "api"), "stories"), erro(/checagem\.json/));
});

test("a fixture do Kruskal (artigo com checagem.json) passa como post", () => {
  assert.deepEqual(verificarPasta(join(RAIZ, "instagram", "2026-09-20-kruskal-1956"), "post").length, 1);
});

test("pastaRelativa: aceita instagram/<pasta>, recusa fora de instagram/ e o _modelo", () => {
  const raiz = raizTemporaria();
  assert.equal(pastaRelativa(join(raiz, "instagram", "a"), raiz), "instagram/a");
  assert.equal(pastaRelativa("instagram/a", raiz), "instagram/a");
  assert.throws(() => pastaRelativa("videos/a", raiz), erro(/dentro de instagram/));
  assert.throws(() => pastaRelativa("instagram/_modelo", raiz), erro(/dentro de instagram/));
});

test("adicionar: pasta com post e reel vira dois itens rascunho; repetir não duplica", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "2026-10-05-a", { aviso: true });
  criarPastaReel(raiz, "2026-10-05-a");
  const agenda = { itens: [] };
  const r = adicionar(agenda, "instagram/2026-10-05-a", { raiz });
  assert.deepEqual(r.novos.map((i) => i.id), ["2026-10-05-a:post", "2026-10-05-a:reel"]);
  assert.deepEqual(agenda.itens[0], { id: "2026-10-05-a:post", pasta: "instagram/2026-10-05-a", formato: "post", quando: null, aprovado: false, estado: "rascunho", feitos: [], tentativas: 0, ajuste: null, resultado: null, erro: null });
  assert.deepEqual(adicionar(agenda, "instagram/2026-10-05-a", { raiz }).novos, []);
  assert.equal(agenda.itens.length, 2);
});

test("adicionar: o formato válido entra e o inválido vem em erros", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "b");
  const p = criarPastaReel(raiz, "b");
  unlinkSync(join(p, "reel.mp4"));
  const agenda = { itens: [] };
  const r = adicionar(agenda, "instagram/b", { raiz });
  assert.deepEqual(r.novos.map((i) => i.formato), ["post"]);
  assert.equal(r.erros.length, 1);
  assert.match(r.erros[0], /reel/);
});

test("adicionar: pasta vazia ou inexistente dá erro", () => {
  const raiz = raizTemporaria();
  assert.throws(() => adicionar({ itens: [] }, "instagram/nao-existe", { raiz }), erro(/não achei/));
});
