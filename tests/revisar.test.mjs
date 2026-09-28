import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErroAgenda, lerAgenda, gravarAgenda } from "../scripts/agenda.mjs";
import { escapar, decidir, midiaDoItem, fichasDaAgenda, htmlDaRevisao, criarServidorRevisao } from "../scripts/revisar.mjs";
import { raizTemporaria, criarPastaPost, criarPastaReel, criarPastaStories, item } from "./ajudas-agenda.mjs";

test("escapar neutraliza HTML", () => {
  assert.equal(escapar(`<b onclick="x">&'`), "&lt;b onclick=&quot;x&quot;&gt;&amp;&#39;");
});

test("decidir(aprovar) marca aprovado e apaga pedido de ajuste anterior", () => {
  const a = item({ id: "a:post", ajuste: "corrigir" });
  decidir({ itens: [a] }, "a:post", "aprovar");
  assert.equal(a.aprovado, true);
  assert.equal(a.ajuste, null);
});

test("decidir(ajuste) exige texto, desfaz a aprovação e guarda a nota", () => {
  const a = item({ id: "a:post", aprovado: true });
  assert.throws(() => decidir({ itens: [a] }, "a:post", "ajuste", "  "), (e) => e instanceof ErroAgenda && /o que ajustar/.test(e.message));
  decidir({ itens: [a] }, "a:post", "ajuste", "  trocar o título do card 2 ");
  assert.equal(a.aprovado, false);
  assert.equal(a.ajuste, "trocar o título do card 2");
});

test("decidir(remover) tira da agenda; só se revisa rascunho; decisão e id inválidos dão erro", () => {
  const agenda = { itens: [item({ id: "a:post" }), item({ id: "p:post", estado: "agendado" })] };
  decidir(agenda, "a:post", "remover");
  assert.deepEqual(agenda.itens.map((i) => i.id), ["p:post"]);
  assert.throws(() => decidir(agenda, "p:post", "aprovar"), (e) => e instanceof ErroAgenda && /rascunho/.test(e.message));
  assert.throws(() => decidir(agenda, "z:post", "aprovar"), ErroAgenda);
  assert.throws(() => decidir({ itens: [item()] }, "x:post", "talvez"), (e) => e instanceof ErroAgenda && /decisão/.test(e.message));
});

test("midiaDoItem: cards do post, vídeos da sequência e o reel", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "p", { cards: 2 });
  criarPastaStories(raiz, "s", { n: 2 });
  criarPastaReel(raiz, "r");
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/p", formato: "post" }), raiz), [{ nome: "card-01.png", tipo: "imagem" }, { nome: "card-02.png", tipo: "imagem" }]);
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/s", formato: "stories" }), raiz).map((m) => m.nome), ["story-01.mp4", "story-02.mp4"]);
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/r", formato: "reel" }), raiz), [{ nome: "reel.mp4", tipo: "video" }]);
});

test("midiaDoItem: post com story de aviso mostra o vídeo depois dos cards", () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "p", { cards: 2, aviso: true });
  assert.deepEqual(midiaDoItem(item({ pasta: "instagram/p", formato: "post" }), raiz), [
    { nome: "card-01.png", tipo: "imagem" },
    { nome: "card-02.png", tipo: "imagem" },
    { nome: "story-aviso.mp4", tipo: "video" },
  ]);
});

test("htmlDaRevisao mostra data, legenda escapada, Checagem e botões; página vazia diz que não há o que revisar", () => {
  const raiz = raizTemporaria();
  const p = criarPastaPost(raiz, "p");
  writeFileSync(join(p, "legenda.txt"), "legenda <script>alert(1)</script>");
  const agenda = { itens: [item({ id: "p:post", pasta: "instagram/p", quando: "2026-10-06T12:00:00-03:00" })] };
  const html = htmlDaRevisao(fichasDaAgenda(agenda, raiz));
  assert.match(html, /06\/10\/2026/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes("<script>alert(1)"));
  assert.match(html, /\/midia\/p%3Apost\/card-01\.png/);
  assert.match(html, /Aprovar/);
  assert.match(html, /Pedir ajuste/);
  assert.match(html, /Tirar da agenda/);
  assert.match(htmlDaRevisao([]), /nada para revisar/i);
});

test("o servidor serve a página, a mídia da pasta e grava a decisão na agenda", async () => {
  const raiz = raizTemporaria();
  criarPastaPost(raiz, "p");
  const arquivoAgenda = join(mkdtempSync(join(tmpdir(), "rev-")), "agenda.json");
  gravarAgenda({ itens: [item({ id: "p:post", pasta: "instagram/p" })] }, arquivoAgenda);
  const servidor = criarServidorRevisao({ arquivoAgenda, raiz });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal(await (await fetch(`${base}/midia/${encodeURIComponent("p:post")}/card-01.png`)).text(), "png");
    assert.equal((await fetch(`${base}/midia/${encodeURIComponent("p:post")}/..%2Fagenda.json`)).status, 404);
    assert.equal((await fetch(`${base}/midia/${encodeURIComponent("p:post")}/..`)).status, 404);
    const midia = `${base}/midia/${encodeURIComponent("p:post")}/card-01.png`;
    const inteiro = await fetch(midia);
    assert.equal(inteiro.status, 200);
    assert.equal(inteiro.headers.get("accept-ranges"), "bytes");
    const parte = await fetch(midia, { headers: { range: "bytes=0-1" } });
    assert.equal(parte.status, 206);
    assert.equal(parte.headers.get("content-range"), "bytes 0-1/3");
    assert.equal(parte.headers.get("content-length"), "2");
    assert.equal(await parte.text(), "pn");
    assert.equal(await (await fetch(midia, { headers: { range: "bytes=1-" } })).text(), "ng");
    assert.equal(await (await fetch(midia, { headers: { range: "bytes=-1" } })).text(), "g");
    const fora = await fetch(midia, { headers: { range: "bytes=10-20" } });
    assert.equal(fora.status, 416);
    assert.equal(fora.headers.get("content-range"), "bytes */3");
    assert.equal((await fetch(midia, { headers: { range: "bytes=2-1" } })).status, 416);
    assert.equal((await fetch(midia, { headers: { range: "lixo" } })).status, 416);
    const r = await fetch(`${base}/api/decidir`, { method: "POST", body: JSON.stringify({ id: "p:post", decisao: "aprovar" }) });
    assert.equal(r.status, 200);
    assert.equal(lerAgenda(arquivoAgenda).itens[0].aprovado, true);
    const ruim = await fetch(`${base}/api/decidir`, { method: "POST", body: JSON.stringify({ id: "p:post", decisao: "ajuste", nota: "" }) });
    assert.equal(ruim.status, 400);
  } finally {
    servidor.close();
  }
});

test("a Checagem na ficha distingue: válida, inválida, ausente-exigida e ausente-dispensada", () => {
  const raiz = raizTemporaria();
  const texto = (nome, formato = "post") => fichasDaAgenda({ itens: [item({ id: `${nome}:${formato}`, pasta: `instagram/${nome}`, formato })] }, raiz)[0].checagem;
  const valida = criarPastaPost(raiz, "valida", { tipo: "curiosidade" });
  writeFileSync(join(valida, "checagem.json"), JSON.stringify({ afirmacoes: [{ onde: "card 1", texto: "t", tipo: "fonte", fonte: "https://exemplo.org", resultado: "confirmada", como: "li a página da fonte inteira" }] }));
  assert.match(texto("valida"), /^CHECAGEM — 1 afirmação/);
  const invalida = criarPastaPost(raiz, "invalida", { tipo: "curiosidade" });
  writeFileSync(join(invalida, "checagem.json"), JSON.stringify({ afirmacoes: [] }));
  assert.match(texto("invalida"), /^⚠ checagem\.json inválido/);
  const quebrada = criarPastaPost(raiz, "quebrada", { tipo: "curiosidade" });
  writeFileSync(join(quebrada, "checagem.json"), "{ nao e json");
  assert.match(texto("quebrada"), /^⚠ checagem\.json inválido: não é um JSON válido/);
  criarPastaPost(raiz, "exige", { tipo: "curiosidade" });
  assert.match(texto("exige"), /^⚠ Falta checagem\.json.*ADR 0009/);
  criarPastaStories(raiz, "sq");
  assert.match(texto("sq", "stories"), /^⚠ Falta checagem\.json/);
  criarPastaReel(raiz, "cenas", { tipo: "cenas" });
  assert.match(texto("cenas", "reel"), /^⚠ Falta checagem\.json/);
  criarPastaReel(raiz, "corte", { tipo: "corte" });
  assert.equal(texto("corte", "reel"), "Este tipo não exige Checagem.");
  criarPastaPost(raiz, "aviso", { tipo: "aviso" });
  assert.equal(texto("aviso"), "Este tipo não exige Checagem.");
});
