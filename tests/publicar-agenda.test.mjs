import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executarAgenda, etapasDe, publicadoresDaNuvem, TENTATIVAS } from "../scripts/publicar-agenda.mjs";
import { item } from "./ajudas-agenda.mjs";

const AGORA = Date.parse("2026-10-05T15:00:00Z"); // 12:00 em Brasília
const devido = (sobre = {}) => item({ id: "a:post", pasta: "instagram/a", estado: "agendado", aprovado: true, quando: "2026-10-05T12:00:00-03:00", ...sobre });

// publicadores falsos que registram a ordem das chamadas; `falhas[etapa]` = quantas vezes falhar antes de funcionar
function montar({ falhas = {} } = {}) {
  const chamadas = [];
  const restantes = { ...falhas };
  const fazer = (etapa, registro) => async (pasta) => {
    chamadas.push(etapa);
    if ((restantes[etapa] ?? 0) > 0) { restantes[etapa]--; throw new Error(`${etapa} recusado pela Meta`); }
    return registro;
  };
  return {
    chamadas,
    publicadores: {
      post: fazer("post", { url: "https://instagram.com/p/x", media_id: "1" }),
      "story-aviso": fazer("story-aviso", { arquivo: "story-aviso.mp4", media_id: "2" }),
      stories: fazer("stories", { publicados: [{ media_id: "3" }, { media_id: "4" }] }),
      reel: fazer("reel", { url: "https://instagram.com/reel/y", media_id: "5" }),
    },
  };
}
const rodar = async (agenda, publicadores, extra = {}) => {
  const salvos = [];
  const r = await executarAgenda(agenda, { agora: AGORA, publicadores, temAviso: () => true, dormir: async () => {}, log: () => {}, salvar: async (a) => salvos.push(JSON.stringify(a)), ...extra });
  return { r, salvos };
};

test("etapasDe: post com aviso tem duas etapas; os outros formatos, uma", () => {
  assert.deepEqual(etapasDe(item({ formato: "post" }), () => true), ["post", "story-aviso"]);
  assert.deepEqual(etapasDe(item({ formato: "post" }), () => false), ["post"]);
  assert.deepEqual(etapasDe(item({ formato: "reel" }), () => true), ["reel"]);
  assert.deepEqual(etapasDe(item({ formato: "stories" }), () => true), ["stories"]);
});

test("publica o post e depois o story de aviso, marca publicado e guarda o link", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, ["post", "story-aviso"]);
  assert.equal(a.estado, "publicado");
  assert.deepEqual(a.feitos, ["post", "story-aviso"]);
  assert.equal(a.resultado.url, "https://instagram.com/p/x");
  assert.equal(a.erro, null);
  assert.deepEqual(r, { publicados: ["a:post"], falhas: [], perdidos: [] });
});

test("grava o estado logo depois de CADA etapa (para não publicar em dobro se o processo morrer)", async () => {
  const a = devido();
  const { publicadores } = montar();
  const { salvos } = await rodar({ itens: [a] }, publicadores);
  const feitosEmCadaSalvamento = salvos.map((s) => JSON.parse(s).itens[0].feitos.length);
  assert.deepEqual(feitosEmCadaSalvamento.slice(0, 2), [1, 2], "um salvamento depois do post, outro depois do aviso");
  assert.equal(JSON.parse(salvos.at(-1)).itens[0].estado, "publicado");
});

test("reel e sequência de stories publicam com uma etapa só", async () => {
  const reel = devido({ id: "r:reel", formato: "reel", pasta: "instagram/r" });
  const seq = devido({ id: "s:stories", formato: "stories", pasta: "instagram/s", quando: "2026-10-05T11:00:00-03:00" });
  const { chamadas, publicadores } = montar();
  await rodar({ itens: [reel, seq] }, publicadores);
  assert.deepEqual(chamadas, ["stories", "reel"], "o mais antigo primeiro");
  assert.deepEqual(seq.resultado.media_ids, ["3", "4"]);
});

test("falha passageira: tenta de novo, espera entre as tentativas e acaba publicando", async () => {
  const a = devido({ formato: "reel", id: "a:reel" });
  const { chamadas, publicadores } = montar({ falhas: { reel: 1 } });
  const esperas = [];
  const { r } = await rodar({ itens: [a] }, publicadores, { dormir: async (ms) => esperas.push(ms) });
  assert.deepEqual(chamadas, ["reel", "reel"]);
  assert.equal(a.estado, "publicado");
  assert.equal(a.tentativas, 2);
  assert.deepEqual(esperas, [60_000]);
  assert.deepEqual(r.publicados, ["a:reel"]);
});

test("falha em todas as tentativas: vira falhou, guarda o erro e entra em falhas", async () => {
  const a = devido({ formato: "reel", id: "a:reel" });
  const { chamadas, publicadores } = montar({ falhas: { reel: 99 } });
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.equal(chamadas.length, TENTATIVAS);
  assert.equal(a.estado, "falhou");
  assert.match(a.erro, /reel recusado pela Meta/);
  assert.deepEqual(r, { publicados: [], falhas: ["a:reel"], perdidos: [] });
});

test("post saiu e o story de aviso falhou: a nova tentativa NÃO republica o post", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar({ falhas: { "story-aviso": 1 } });
  await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, ["post", "story-aviso", "story-aviso"]);
  assert.equal(a.estado, "publicado");
});

test("post saiu e o aviso falha sempre: fica falhou, mas registra que o post já está no ar", async () => {
  const a = devido();
  const { chamadas, publicadores } = montar({ falhas: { "story-aviso": 99 } });
  await rodar({ itens: [a] }, publicadores);
  assert.equal(chamadas.filter((c) => c === "post").length, 1);
  assert.equal(a.estado, "falhou");
  assert.deepEqual(a.feitos, ["post"]);
});

test("vencido há mais de 6 h: não publica, vira perdido e avisa", async () => {
  const a = devido({ quando: "2026-10-05T04:00:00-03:00" }); // 11 h antes de AGORA
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens: [a] }, publicadores);
  assert.deepEqual(chamadas, []);
  assert.equal(a.estado, "perdido");
  assert.match(a.erro, /6 h/);
  assert.deepEqual(r.perdidos, ["a:post"]);
});

test("rascunho, sem aprovação, futuro ou já publicado: ninguém é publicado", async () => {
  const itens = [
    devido({ id: "1:post", estado: "rascunho" }),
    devido({ id: "2:post", aprovado: false }),
    devido({ id: "3:post", quando: "2026-10-05T13:00:00-03:00" }),
    devido({ id: "4:post", estado: "publicado" }),
  ];
  const { chamadas, publicadores } = montar();
  const { r } = await rodar({ itens }, publicadores);
  assert.deepEqual(chamadas, []);
  assert.deepEqual(r, { publicados: [], falhas: [], perdidos: [] });
});

test("publicadoresDaNuvem: stories só saem com checagem.json válido na pasta", async () => {
  const chamadas = [];
  const fns = {
    publicarPost: async () => ({}), publicarStory: async () => ({}), publicarReel: async () => ({}),
    publicarStories: async (pasta, opcoes) => { chamadas.push([pasta, opcoes]); return { publicados: [] }; },
  };
  const tokens = { instagram: {} };
  const { stories } = publicadoresDaNuvem(tokens, fns);
  const pasta = mkdtempSync(join(tmpdir(), "stories-"));
  await assert.rejects(stories(pasta), /checagem\.json/);
  assert.equal(chamadas.length, 0, "sem Checagem, nada é publicado");
  writeFileSync(join(pasta, "checagem.json"), JSON.stringify({ afirmacoes: [{ onde: "story 1", texto: "t", tipo: "fonte", fonte: "https://doi.org/10.1/x", resultado: "confirmada", como: "conferido no resumo do artigo" }] }));
  await stories(pasta);
  assert.deepEqual(chamadas, [[pasta, { tokens }]]);
});
