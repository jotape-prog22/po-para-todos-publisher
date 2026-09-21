import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { specDoVideo, gerarStory, ErroStory } from "../design-system/scripts/gerar-story.mjs";

function pastaComTitulo(titulo) {
  const pasta = mkdtempSync(join(tmpdir(), "story-"));
  writeFileSync(join(pasta, "metadados.json"), JSON.stringify({ titulo }));
  return pasta;
}

test("spec do story parte do título do vídeo e aceita sobrescritas", () => {
  const pasta = pastaComTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra");
  assert.deepEqual(specDoVideo(pasta, {}), { buscar: "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra" });
  assert.deepEqual(specDoVideo(pasta, { topico: "dualidade" }), { buscar: "TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra", topico: "dualidade" });
  assert.throws(() => specDoVideo(pastaComTitulo(""), {}), ErroStory);
});

test("gerarStory --so-html usa headline, subhead e ícone do catálogo", () => {
  const pasta = pastaComTitulo("TEOREMA DAS FOLGAS COMPLEMENTARES - Dualidade e Preços-Sombra");
  const html = readFileSync(gerarStory(pasta, {}, { soHtml: true }), "utf8");
  assert.ok(html.includes("ig--story"));
  assert.ok(html.includes("VÍDEO NOVO NO CANAL") && html.includes("ASSISTA NO YOUTUBE"));
  assert.ok(html.includes("FOLGAS") && html.includes("icones/dualidade.svg"));
  assert.ok(html.includes("@pesquisaoperacionalparatodos"));
});
