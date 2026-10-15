import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validar, htmlDaCena, ErroStoryVideo, LIMITES, PUBLICACOES, composicoesDeStories, gerarStoryVideo } from "../design-system/scripts/gerar-story-video.mjs";

const story = (extra = {}) => ({ duracao: 12, kicker: "UM DESAFIO", titulo: "VOCÊ TEM UMA PADARIA", linhas: ["Pão: 1 h", "Bolo: 2 h"], pergunta: "O que rende mais?", dica: "Responda no quiz", ...extra });
const spec = (...stories) => ({ tipo: "stories", stories });

test("validar calcula a linha do tempo: kicker, título, linhas, pergunta e dica em sequência", () => {
  const [s] = validar(spec(story()));
  assert.deepEqual(s.tempos, { kicker: 0, titulo: 0.3, blocos: [1.2, 2.3], pergunta: 3.5, dica: 4.3 });
});

test("validar recusa o que não cabe", () => {
  assert.throws(() => validar({ tipo: "artigo", stories: [] }), ErroStoryVideo);
  assert.throws(() => validar(spec(story({ duracao: 5 }))), /duracao.*pelo menos 6\.3/);
  assert.throws(() => validar(spec(story({ dica: "x".repeat(LIMITES.campos.dica + 1) }))), /"dica" tem 31/);
  assert.throws(() => validar(spec(story({ itens: [{ titulo: "Modelar", texto: "…" }] }))), /"linhas" ou "itens"/);
  assert.throws(() => validar(spec(story({ icone: "nao-existe" }))), /ícone "nao-existe"/);
  assert.throws(() => validar(spec(...Array(LIMITES.stories.max + 1).fill(story()))), /11 stories/);
});

test("htmlDaCena põe cada bloco com seu instante e deixa a zona do sticker livre", () => {
  const [s] = validar(spec(story({ linhas: undefined, itens: [{ titulo: "Modelar", texto: "Traduzir a decisão." }, { titulo: "Resolver", texto: "Achar o melhor." }], faixa: "AULA NO CANAL", icone: "alvo" })));
  const html = htmlDaCena(s, "../../design-system");
  assert.ok(html.includes("ig--story-video") && html.includes("story-video.css"));
  assert.ok(html.includes('class="ig__kicker sv__anim" style="--t: 0s"'));
  assert.ok(html.includes('class="sv__item sv__anim" style="--t: 1.2s"') && html.includes('style="--t: 2.8s"'));
  assert.ok(html.includes("sv__dica") && html.includes("AULA NO CANAL") && html.includes("icones/alvo.svg"));
  assert.ok(html.includes("@pesquisaoperacionalparatodos"));
});

test("publicacao: aceita api ou manual, recusa outro valor; padrão é manual (sem o campo)", () => {
  assert.deepEqual(PUBLICACOES, ["api", "manual"]);
  assert.equal(validar({ ...spec(story()), publicacao: "api" }).length, 1);
  assert.equal(validar({ ...spec(story()), publicacao: "manual" }).length, 1);
  assert.throws(() => validar({ ...spec(story()), publicacao: "app" }), /"publicacao" deve ser "api"/);
});

test("htmlDaCena sem sticker marca a cena com ig--sem-sticker; com sticker, não", () => {
  const [s] = validar(spec(story()));
  assert.ok(htmlDaCena(s, ".", { semSticker: true }).includes('class="ig ig--story ig--story-video ig--sem-sticker"'));
  assert.ok(htmlDaCena(s, ".").includes('class="ig ig--story ig--story-video"'));
});

test("htmlDaCena de reel marca a cena com ig--reel-cena (zona segura do reel)", () => {
  const [s] = validar(spec(story()));
  assert.ok(htmlDaCena(s, ".", { semSticker: true, reel: true }).includes('class="ig ig--story ig--story-video ig--sem-sticker ig--reel-cena"'));
});

test("modelo de quiz: dois stories, publicacao api, pergunta com gancho e resposta com 'Entendeu?'", () => {
  const modelo = JSON.parse(readFileSync(new URL("../instagram/_modelo/stories.json", import.meta.url), "utf8"));
  assert.equal(modelo.publicacao, "api");
  const [pergunta, resposta] = validar(modelo);
  assert.ok(pergunta.pergunta && /resposta\?$/i.test(pergunta.dica));
  assert.ok(/^A RESPOSTA/.test(resposta.kicker) && /Entendeu\?$/.test(resposta.dica));
});

test("o exemplo como-funciona-po continua manual (sem publicacao) e válido", () => {
  const spec = JSON.parse(readFileSync(new URL("../instagram/2026-09-22-como-funciona-po/stories.json", import.meta.url), "utf8"));
  assert.equal(spec.publicacao, undefined);
  assert.equal(validar(spec).length, 5);
});

const bibVazia = { licencas_aceitas: [], trilhas: [], efeitos: [] };

test("composicoesDeStories: um vídeo por story, sem sticker quando sai pela API, efeitos discretos e nunca Trilha", () => {
  const comps = composicoesDeStories({ ...spec(story(), story({ kicker: "DOIS" })), publicacao: "api" });
  assert.equal(comps.length, 2);
  assert.ok(comps.every((c) => c.classes.includes("ig--sem-sticker") && c.formato === "story" && c.loop === false));
  assert.ok(comps[0].efeitos.length > 0 && comps[0].efeitos.every((e) => e.ganho === 0.4));
  assert.equal(composicoesDeStories(spec(story()))[0].classes, "ig ig--story ig--story-video", "manual (com sticker) reserva a zona");
  assert.equal(comps[0].usuario, "pesquisaoperacionalparatodos");
});

test("gerarStoryVideo grava story-NN.mp4/.png com o som mixado, sem Trilha, e respeita --so", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "stories-"));
  writeFileSync(join(pasta, "stories.json"), JSON.stringify({ ...spec(story(), story({ kicker: "DOIS" })), publicacao: "api" }));
  const gravados = [], mixagens = [];
  const renderizar = async (comp, o) => { gravados.push({ comp, ...o }); writeFileSync(o.mp4, "v"); return o.mp4; };
  const mixar = async (comp, o) => { mixagens.push(o); return o.saida; };
  const saidas = await gerarStoryVideo(pasta, { renderizar, mixar, biblioteca: bibVazia });
  assert.deepEqual(saidas.map((s) => s.slice(pasta.length + 1)), ["story-01.mp4", "story-02.mp4"]);
  assert.ok(gravados[0].png.endsWith("story-01.png") && gravados[0].audio.endsWith("mix.wav") && gravados[0].capaEm === null);
  assert.ok(mixagens.every((m) => m.trilhaId === null));
  assert.equal(gravados[1].comp.cenas[0].kicker, "DOIS");
  const so2 = await gerarStoryVideo(pasta, { so: 2, renderizar, mixar, biblioteca: bibVazia });
  assert.deepEqual(so2.map((s) => s.slice(pasta.length + 1)), ["story-02.mp4"]);
});
