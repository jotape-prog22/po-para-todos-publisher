import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gerarStory, htmlDoStory } from "../design-system/scripts/gerar-story.mjs";

test("story de vídeo novo: só VÍDEO NOVO NO CANAL, sem ícone, com o link do canal na tarja", () => {
  const html = htmlDoStory("/design-system");
  assert.ok(html.includes("ig--story"));
  assert.ok(html.includes("VÍDEO NOVO") && html.includes("NO CANAL"));
  assert.ok(html.includes('<p class="ig__rodape"><span>youtube.com/@PesquisaOperacionalparatodos</span></p>'));
  assert.ok(!html.includes("ig__icone") && !html.includes("ig__kicker"));
});

test("gerarStory --so-html grava story.html na pasta do vídeo", () => {
  const pasta = mkdtempSync(join(tmpdir(), "story-"));
  const html = gerarStory(pasta, { soHtml: true });
  assert.equal(html, join(pasta, "story.html"));
  assert.ok(readFileSync(html, "utf8").includes("VÍDEO NOVO"));
});
