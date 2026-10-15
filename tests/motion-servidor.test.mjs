import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { servir } from "../design-system/scripts/motion/servidor.mjs";

test("servidor: arquivos da raiz com o tipo certo, extras, 404 e nada fora da raiz", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "srv-"));
  mkdirSync(join(raiz, "a")); writeFileSync(join(raiz, "a", "m.mjs"), "export {}"); writeFileSync(join(raiz, "a", "d.json"), "{}");
  const fora = join(raiz, "..", "segredo-" + Date.now() + ".txt"); writeFileSync(fora, "não");
  const { url, fechar } = await servir({ raiz, extras: { "/composicoes.json": { corpo: "[1]", tipo: "application/json" } } });
  try {
    let r = await fetch(`${url}/a/m.mjs`);
    assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "text/javascript");
    assert.equal((await fetch(`${url}/a/d.json`)).headers.get("content-type"), "application/json");
    r = await fetch(`${url}/composicoes.json`); assert.equal(await r.text(), "[1]");
    assert.equal((await fetch(`${url}/nao-tem.css`)).status, 404);
    assert.equal((await fetch(`${url}/..%2F${fora.split("/").pop()}`)).status, 403);
    assert.ok(url.startsWith("http://127.0.0.1:"));
  } finally { await fechar(); }
});
