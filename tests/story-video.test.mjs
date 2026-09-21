import { test } from "node:test";
import assert from "node:assert/strict";
import { validar, htmlDaCena, ErroStoryVideo, LIMITES } from "../design-system/scripts/gerar-story-video.mjs";

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
