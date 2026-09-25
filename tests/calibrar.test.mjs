import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { lerVariaveis, gravarVariaveis, amostras, arquivoEstatico, ErroCalibrar, DS } from "../design-system/scripts/calibrar-instagram.mjs";

const css = `/* cabeçalho */
:root {
  --a-margem: 72px;
  --a-size: 32px;  --a-line: 40px;        /* dois por linha */
  --a-alinhamento: center;    /* topo ou centro */
}
.x { top: var(--a-margem); }
`;

test("lerVariaveis lê nome, valor e comentário do :root, inclusive dois por linha", () => {
  assert.deepEqual(lerVariaveis(css), [
    { nome: "--a-margem", valor: "72px", comentario: "" },
    { nome: "--a-size", valor: "32px", comentario: "" },
    { nome: "--a-line", valor: "40px", comentario: "dois por linha" },
    { nome: "--a-alinhamento", valor: "center", comentario: "topo ou centro" },
  ]);
});

test("gravarVariaveis troca só o valor e mantém o resto do arquivo", () => {
  const novo = gravarVariaveis(css, { "--a-size": "36px", "--a-alinhamento": "flex-start" });
  assert.ok(novo.includes("  --a-size: 36px;  --a-line: 40px;        /* dois por linha */"));
  assert.ok(novo.includes("--a-alinhamento: flex-start;    /* topo ou centro */"));
  assert.ok(novo.includes(".x { top: var(--a-margem); }"));
  assert.equal(novo.replace("36px", "32px").replace("flex-start", "center"), css);
});

test("gravarVariaveis recusa variável desconhecida e valor que não é px nem alinhamento", () => {
  assert.throws(() => gravarVariaveis(css, { "--b": "1px" }), ErroCalibrar);
  assert.throws(() => gravarVariaveis(css, { "--a-margem": "10px; } body { color: red" }), ErroCalibrar);
  assert.throws(() => gravarVariaveis(css, { "--a-margem": "-4px" }), ErroCalibrar);
  assert.throws(() => gravarVariaveis(css, { "--a-alinhamento": "stretch" }), ErroCalibrar);
  assert.ok(gravarVariaveis(css, { "--a-margem": "12.5px" }).includes("--a-margem: 12.5px;"));
});

test("amostras cobrem feed, stories e reels com os geradores de produção", () => {
  const lista = amostras("/design-system");
  const formatos = new Set(lista.map((a) => a.formato));
  assert.deepEqual([...formatos].sort(), ["feed", "reel", "story"]);
  const por = (id) => lista.find((a) => a.id === id);
  for (const id of ["feed-capa", "feed-ideia", "feed-fim", "feed-aviso", "feed-curiosidade", "feed-citacao"]) assert.ok(por(id).html.includes("ig--feed"), id);
  assert.ok(por("story-quiz-pergunta").html.includes("ig--sem-sticker") && por("story-quiz-pergunta").html.includes("sv__dica"));
  assert.ok(por("story-com-sticker").html.includes('class="ig ig--story ig--story-video">'));
  assert.ok(por("story-aviso").html.includes("POST NOVO"));
  assert.ok(por("story-video-novo").html.includes("VÍDEO NOVO"));
  assert.ok(por("reel-cena").html.includes("ig--reel-cena"));
  assert.ok(por("reel-corte").html.includes("ig--reel"));
  for (const a of lista) {
    assert.ok(a.html.includes('href="/design-system/instagram/instagram.css"'), a.id);
    assert.equal(a.altura, a.formato === "feed" ? 1350 : 1920, a.id);
  }
  // animações congeladas no quadro final
  assert.ok(por("story-quiz-pergunta").html.includes("animation: none"));
});

test("arquivoEstatico só serve o que está dentro do design-system", () => {
  assert.equal(arquivoEstatico("/design-system/instagram/instagram.css"), join(DS, "instagram/instagram.css"));
  assert.equal(arquivoEstatico("/design-system/../canal.json"), null);
  assert.equal(arquivoEstatico("/design-system/%2e%2e/canal.json"), null);
  assert.equal(arquivoEstatico("/outra/coisa.css"), null);
});
