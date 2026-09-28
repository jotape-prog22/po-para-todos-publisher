import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RAIZ, ErroAgenda, lerAgenda, gravarAgenda, formatosDaPasta, verificarPasta, pastaRelativa, adicionar, lerModelo, validarModelo, distribuir, mover, devidos, passouDaJanela, pastasLiberadas, reabrir, remover, statusTexto, ARQUIVO_MODELO } from "../scripts/agenda.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories, item } from "./ajudas-agenda.mjs";

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

const MODELO = { fuso: "-03:00", semana: { seg: { reel: "12:00" }, ter: { post: "12:00" }, qua: { reel: "12:00" }, qui: { post: "12:00" }, sex: { reel: "12:00" }, sab: { stories: "18:00" }, dom: { post: "12:00" } } };
const rascunhos = (formato, n) => Array.from({ length: n }, (_, k) => item({ id: `${formato}${k}:${formato}`, formato }));

test("o modelo de semana que vai no repositório é válido", () => {
  validarModelo(lerModelo(ARQUIVO_MODELO));
});

test("validarModelo recusa fuso torto, dia inventado e formato inventado", () => {
  assert.throws(() => validarModelo({ fuso: "BRT", semana: {} }), erro(/fuso/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { xxx: { post: "12:00" } } }), erro(/dia/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { seg: { podcast: "12:00" } } }), erro(/formato/));
  assert.throws(() => validarModelo({ fuso: "-03:00", semana: { seg: { post: "meio-dia" } } }), erro(/hora/));
});

test("distribuir: reels seg/qua/sex, posts ter/qui/dom, stories sábado — a partir de segunda 2026-10-05", () => {
  const agenda = { itens: [...rascunhos("reel", 4), ...rascunhos("post", 2), ...rascunhos("stories", 1)] };
  distribuir(agenda, MODELO, "2026-10-05");
  const de = (f) => agenda.itens.filter((i) => i.formato === f).map((i) => i.quando);
  assert.deepEqual(de("reel"), ["2026-10-05T12:00:00-03:00", "2026-10-07T12:00:00-03:00", "2026-10-09T12:00:00-03:00", "2026-10-12T12:00:00-03:00"]);
  assert.deepEqual(de("post"), ["2026-10-06T12:00:00-03:00", "2026-10-08T12:00:00-03:00"]);
  assert.deepEqual(de("stories"), ["2026-10-10T18:00:00-03:00"]);
});

test("distribuir: não usa horário já ocupado e não mexe em quem já tem data", () => {
  const ocupado = item({ id: "o:reel", formato: "reel", quando: "2026-10-05T12:00:00-03:00" });
  const [novo] = rascunhos("reel", 1);
  const agenda = { itens: [ocupado, novo] };
  const dados = distribuir(agenda, MODELO, "2026-10-05");
  assert.equal(dados.length, 1);
  assert.equal(novo.quando, "2026-10-07T12:00:00-03:00");
  assert.equal(ocupado.quando, "2026-10-05T12:00:00-03:00");
});

test("distribuir: modelo sem dia para o formato é erro claro; data de início ruim também", () => {
  const semReel = { fuso: "-03:00", semana: { ter: { post: "12:00" } } };
  assert.throws(() => distribuir({ itens: rascunhos("reel", 1) }, semReel, "2026-10-05"), erro(/reel/));
  assert.throws(() => distribuir({ itens: [] }, MODELO, "05/10/2026"), erro(/AAAA-MM-DD/));
});

test("mover: rascunho ganha a data com o fuso; formato ruim e item publicado são recusados", () => {
  const a = item({ id: "a:post" });
  const agenda = { itens: [a, item({ id: "p:post", estado: "publicado" })] };
  mover(agenda, "a:post", "2026-10-06T09:30", { fuso: "-03:00" });
  assert.equal(a.quando, "2026-10-06T09:30:00-03:00");
  assert.throws(() => mover(agenda, "a:post", "amanhã", { fuso: "-03:00" }), erro(/AAAA-MM-DDTHH:MM/));
  assert.throws(() => mover(agenda, "p:post", "2026-10-06T09:30", { fuso: "-03:00" }), erro(/já foi publicado/));
  assert.throws(() => mover(agenda, "z:post", "2026-10-06T09:30", { fuso: "-03:00" }), erro(/não achei/));
});

test("mover: item que falhou ou perdeu a janela volta a agendado com a tentativa zerada — só para o futuro", () => {
  const agora = Date.parse("2026-10-05T20:00:00Z");
  const f = item({ id: "f:post", estado: "falhou", aprovado: true, tentativas: 3, erro: "x", quando: "2026-10-05T12:00:00-03:00" });
  const agenda = { itens: [f] };
  assert.throws(() => mover(agenda, "f:post", "2026-10-05T10:00", { fuso: "-03:00", agora }), erro(/no futuro/));
  mover(agenda, "f:post", "2026-10-06T12:00", { fuso: "-03:00", agora });
  assert.equal(f.estado, "agendado");
  assert.equal(f.tentativas, 0);
  assert.equal(f.erro, null);
});

test("devidos: só agendado + aprovado + já venceu, em ordem; passouDaJanela usa 6 h", () => {
  const agora = Date.parse("2026-10-05T18:00:00Z"); // 15:00 em Brasília
  const base = { estado: "agendado", aprovado: true };
  const a = item({ id: "a:post", ...base, quando: "2026-10-05T12:00:00-03:00" });
  const b = item({ id: "b:post", ...base, quando: "2026-10-05T09:00:00-03:00" });
  const semAprovacao = item({ id: "c:post", estado: "agendado", aprovado: false, quando: "2026-10-05T09:00:00-03:00" });
  const futuro = item({ id: "d:post", ...base, quando: "2026-10-05T16:00:00-03:00" });
  const falhou = item({ id: "e:post", estado: "falhou", aprovado: true, quando: "2026-10-05T09:00:00-03:00" });
  const agenda = { itens: [a, b, semAprovacao, futuro, falhou] };
  assert.deepEqual(devidos(agenda, agora).map((i) => i.id), ["b:post", "a:post"]);
  assert.equal(passouDaJanela(a, agora), false);
  assert.equal(passouDaJanela(b, agora), false); // 6 h exatas ainda cabem
  assert.equal(passouDaJanela(b, agora + 1), true);
});

test("pastasLiberadas: a pasta só sai da fila quando nenhum item dela está agendado, falhou ou perdido", () => {
  const agenda = { itens: [
    item({ id: "a:post", pasta: "instagram/a", estado: "publicado" }),
    item({ id: "a:reel", pasta: "instagram/a", formato: "reel", estado: "agendado" }),
    item({ id: "b:post", pasta: "instagram/b", estado: "publicado" }),
    item({ id: "c:post", pasta: "instagram/c", estado: "publicado" }),
    item({ id: "c:reel", pasta: "instagram/c", formato: "reel", estado: "falhou" }),
  ] };
  assert.deepEqual(pastasLiberadas(agenda, ["instagram/a", "instagram/b", "instagram/c"]), ["instagram/b"]);
});

test("reabrir: agendado volta a rascunho sem aprovação; publicado não reabre", () => {
  const a = item({ id: "a:post", estado: "agendado", aprovado: true, quando: "2026-10-06T12:00:00-03:00" });
  const agenda = { itens: [a, item({ id: "p:post", estado: "publicado" })] };
  reabrir(agenda, "a:post");
  assert.equal(a.estado, "rascunho");
  assert.equal(a.aprovado, false);
  assert.equal(a.quando, "2026-10-06T12:00:00-03:00");
  assert.throws(() => reabrir(agenda, "p:post"), erro(/já foi publicado/));
});

test("remover tira o item e devolve o removido", () => {
  const agenda = { itens: [item({ id: "a:post" }), item({ id: "b:post" })] };
  assert.equal(remover(agenda, "a:post").id, "a:post");
  assert.deepEqual(agenda.itens.map((i) => i.id), ["b:post"]);
  assert.throws(() => remover(agenda, "a:post"), erro(/não achei/));
});

test("statusTexto: ordena por data e destaca falta de aprovação, falha e ajuste pedido", () => {
  const agenda = { itens: [
    item({ id: "b:reel", formato: "reel", pasta: "instagram/b", quando: "2026-10-07T12:00:00-03:00", estado: "falhou", aprovado: true, erro: "Meta recusou" }),
    item({ id: "a:post", pasta: "instagram/a", quando: "2026-10-06T12:00:00-03:00", ajuste: "trocar o título do card 2" }),
    item({ id: "c:post", pasta: "instagram/c" }),
  ] };
  const t = statusTexto(agenda);
  assert.ok(t.indexOf("instagram/a") < t.indexOf("instagram/b"), "ordem por data");
  assert.match(t, /falta aprovar/);
  assert.match(t, /FALHOU/);
  assert.match(t, /Meta recusou/);
  assert.match(t, /ajuste: trocar o título do card 2/);
  assert.match(t, /sem data/);
  assert.match(statusTexto({ itens: [] }), /vazia/);
});
