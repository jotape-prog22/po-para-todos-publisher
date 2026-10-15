import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
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

// GET cru com o Host que quisermos (o fetch não deixa trocar o Host).
const pedir = (url, caminho, host) => new Promise((ok, falha) => {
  const u = new URL(url);
  request({ host: u.hostname, port: u.port, path: caminho, headers: host ? { host } : {} }, (r) => { r.resume(); r.on("end", () => ok(r.statusCode)); }).on("error", falha).end();
});

test("servidor: nada de arquivo ou pasta oculta (.git, .mcp.json…)", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "srv-"));
  mkdirSync(join(raiz, ".git")); writeFileSync(join(raiz, ".git", "config"), "segredo"); writeFileSync(join(raiz, ".mcp.json"), "{}");
  mkdirSync(join(raiz, "a")); writeFileSync(join(raiz, "a", ".env"), "x"); writeFileSync(join(raiz, "a", "ok.css"), "");
  const { url, fechar } = await servir({ raiz });
  try {
    for (const c of ["/.git/config", "/.mcp.json", "/a/.env", "/a/%2Eenv"]) assert.equal((await fetch(url + c)).status, 404, c);
    assert.equal((await fetch(`${url}/a/ok.css`)).status, 200);
  } finally { await fechar(); }
});

test("servidor: só responde a Host 127.0.0.1:<porta> ou localhost:<porta> (contra DNS rebinding)", async () => {
  const raiz = mkdtempSync(join(tmpdir(), "srv-"));
  writeFileSync(join(raiz, "ok.css"), "");
  const { url, fechar } = await servir({ raiz, extras: { "/composicoes.json": { corpo: "[]", tipo: "application/json" } } });
  const porta = new URL(url).port;
  try {
    assert.equal(await pedir(url, "/ok.css", `127.0.0.1:${porta}`), 200);
    assert.equal(await pedir(url, "/ok.css", `localhost:${porta}`), 200);
    assert.equal(await pedir(url, "/ok.css", `malicioso.example:${porta}`), 403);
    assert.equal(await pedir(url, "/composicoes.json", "malicioso.example"), 403, "extras também");
    assert.equal(await pedir(url, "/ok.css", "127.0.0.1:1"), 403, "porta errada");
  } finally { await fechar(); }
});
