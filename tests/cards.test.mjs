import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const DS = new URL("../design-system/", import.meta.url);
const formatos = JSON.parse(readFileSync(new URL("instagram/formatos.json", DS), "utf8"));

test("formatos do Instagram: feed 4:5, story 9:16, um layout por card", () => {
  assert.deepEqual(formatos.formatos.feed, { largura: 1080, altura: 1350, proporcao: "4:5" });
  assert.deepEqual(formatos.formatos.story, { largura: 1080, altura: 1920, proporcao: "9:16" });
  assert.deepEqual(Object.keys(formatos.cards), ["capa", "ideia", "fim", "aviso"]);
  for (const [id, c] of Object.entries(formatos.cards)) {
    assert.ok(existsSync(new URL(`instagram/layouts/${c.layout}.html`, DS)), `layout ${c.layout} do card ${id}`);
    for (const campo of c.obrigatorios) assert.ok(campo in c.campos, `${id}.${campo} obrigatório sem limite`);
  }
  assert.ok(existsSync(new URL("instagram/layouts/story-video.html", DS)));
  assert.deepEqual(formatos.tipos, { artigo: { min: 3, max: 10 }, aviso: { min: 1, max: 1 } });
});
