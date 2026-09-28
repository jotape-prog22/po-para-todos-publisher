import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arquivosDaFila, lerPastaParaFila, atualizarFila, BRANCH_FILA } from "../scripts/fila.mjs";

// gh falso: `existe` diz se o branch já existe; `arvore` é a lista de arquivos que ele já tem
function ghFalso({ existe = false, arvore = [] } = {}) {
  const chamadas = [];
  let n = 0;
  return {
    chamadas,
    async status(caminho) { chamadas.push({ metodo: "STATUS", caminho }); return existe ? 200 : 404; },
    async pedir(metodo, caminho, corpo) {
      chamadas.push({ metodo, caminho, corpo });
      if (metodo === "GET" && caminho.startsWith("/git/ref/")) return { object: { sha: "c1" } };
      if (metodo === "GET" && caminho.startsWith("/git/commits/")) return { tree: { sha: "t1" } };
      if (metodo === "GET" && caminho.startsWith("/git/trees/")) return { tree: arvore.map((path) => ({ path, type: "blob" })) };
      if (metodo === "POST" && caminho === "/git/blobs") return { sha: `blob${++n}` };
      if (metodo === "POST" && caminho === "/git/trees") return { sha: "t2" };
      if (metodo === "POST" && caminho === "/git/commits") return { sha: "c2" };
      return {};
    },
  };
}
const achar = (gh, metodo, caminho) => gh.chamadas.find((c) => c.metodo === metodo && c.caminho === caminho);

test("arquivosDaFila leva cards, MP4, legendas e JSONs — e deixa de fora os intermediários", () => {
  const p = mkdtempSync(join(tmpdir(), "fila-"));
  for (const n of ["card-01.png", "story-01.mp4", "story-aviso.mp4", "reel.mp4", "cards.json", "legenda.txt", "checagem.json", "post.md", "reel-cena-01.mp4", "corte-bruto.mp4", "card-01.html", "story-01.png", "lista-cenas.txt.bak"]) writeFileSync(join(p, n), "x");
  assert.deepEqual(arquivosDaFila(p).map((a) => a.nome), ["card-01.png", "cards.json", "checagem.json", "legenda.txt", "post.md", "reel.mp4", "story-01.mp4", "story-aviso.mp4"]);
});

test("lerPastaParaFila devolve o conteúdo em Buffer", () => {
  const p = mkdtempSync(join(tmpdir(), "fila-"));
  writeFileSync(join(p, "legenda.txt"), "oi");
  const [a] = lerPastaParaFila(p);
  assert.equal(a.nome, "legenda.txt");
  assert.equal(a.conteudo.toString(), "oi");
});

test("atualizarFila: branch novo nasce órfão, com README e os arquivos nos caminhos instagram/<pasta>/<nome>", async () => {
  const gh = ghFalso({ existe: false });
  const sha = await atualizarFila(gh, {}, { subir: [{ pasta: "instagram/x", arquivos: [{ nome: "card-01.png", conteudo: Buffer.from("a") }] }], tirar: [] });
  assert.equal(sha, "c2");
  const arvore = achar(gh, "POST", "/git/trees").corpo;
  assert.equal(arvore.base_tree, undefined);
  assert.deepEqual(arvore.tree.map((e) => e.path), ["README.md", "instagram/x/card-01.png"]);
  assert.deepEqual(achar(gh, "POST", "/git/commits").corpo.parents, []);
  assert.ok(achar(gh, "POST", "/git/refs"), "cria o branch");
  assert.equal(achar(gh, "POST", "/git/refs").corpo.ref, `refs/heads/${BRANCH_FILA}`);
});

test("atualizarFila: branch existente usa base_tree, apaga o que saiu e o que sobrou da pasta atualizada, e reescreve o ref com força", async () => {
  const gh = ghFalso({ existe: true, arvore: ["README.md", "instagram/velha/card-01.png", "instagram/velha/legenda.txt", "instagram/x/card-01.png", "instagram/x/card-02.png", "instagram/y/reel.mp4"] });
  await atualizarFila(gh, {}, { subir: [{ pasta: "instagram/x", arquivos: [{ nome: "card-01.png", conteudo: Buffer.from("novo") }] }], tirar: ["instagram/velha"] });
  const { corpo } = achar(gh, "POST", "/git/trees");
  assert.equal(corpo.base_tree, "t1");
  const porCaminho = Object.fromEntries(corpo.tree.map((e) => [e.path, e.sha]));
  assert.equal(porCaminho["instagram/x/card-01.png"], "blob1");
  assert.equal(porCaminho["instagram/x/card-02.png"], null, "sobrou da versão antiga da pasta");
  assert.equal(porCaminho["instagram/velha/card-01.png"], null);
  assert.equal(porCaminho["instagram/velha/legenda.txt"], null);
  assert.ok(!("instagram/y/reel.mp4" in porCaminho), "pasta não citada fica quieta");
  assert.ok(!("README.md" in porCaminho));
  assert.deepEqual(achar(gh, "POST", "/git/commits").corpo.parents, []);
  const patch = achar(gh, "PATCH", `/git/refs/heads/${BRANCH_FILA}`);
  assert.equal(patch.corpo.force, true);
});

test("atualizarFila: pasta 'instagram/a' não apaga 'instagram/ab'; sem nada a fazer não cria commit", async () => {
  const gh = ghFalso({ existe: true, arvore: ["instagram/ab/card-01.png"] });
  assert.equal(await atualizarFila(gh, {}, { subir: [], tirar: ["instagram/a"] }), null);
  assert.equal(achar(gh, "POST", "/git/commits"), undefined);
});
