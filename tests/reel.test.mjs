import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarReel, argsConcat, gerarReel, ErroReel, DURACAO_REEL, TIPOS_DE_REEL } from "../design-system/scripts/gerar-reel.mjs";

const cena = (extra = {}) => ({ duracao: 10, kicker: "UM DESAFIO", titulo: "PADARIA", linhas: ["Pão: 1 h"], ...extra });
const legenda = { gancho: "G", corpo: "C", hashtags_tema: ["#A", "#B", "#C"] };

test("validarReel: cenas somam de 15 a 90 s; legenda obrigatória; tipo conhecido", () => {
  assert.deepEqual(TIPOS_DE_REEL, ["cenas", "corte"]);
  assert.deepEqual(DURACAO_REEL, { min: 15, max: 90 });
  assert.deepEqual(validarReel({ tipo: "cenas", cenas: [cena(), cena()], legenda }), []);
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena()], legenda }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ tipo: "cenas", cenas: Array(10).fill(cena()), legenda }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena(), cena()] }).some((e) => e.includes('"legenda"')));
  assert.ok(validarReel({ tipo: "cenas", cenas: [cena({ duracao: 2 }), cena()], legenda }).some((e) => e.includes("cena 1")));
  assert.ok(validarReel({ tipo: "shorts" })[0].includes('tipo "shorts"'));
});

test("argsConcat usa o demuxer concat sem recodificar", () => {
  const a = argsConcat("/p/lista.txt", "/p/reel.mp4");
  assert.deepEqual(a.slice(0, 8), ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i"]);
  assert.ok(a.includes("/p/lista.txt") && a.includes("copy") && a.at(-1) === "/p/reel.mp4");
});

test("gerarReel (cenas): renderiza cada cena com prefixo reel-cena sem sticker, concatena e limpa", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", cenas: [cena(), cena({ kicker: "DOIS" })], legenda }));
  const htmls = await gerarReel(pasta, { soHtml: true });
  assert.deepEqual(htmls.map((h) => h.slice(pasta.length + 1)), ["reel-cena-01.html", "reel-cena-02.html"]);
  assert.ok(readFileSync(htmls[0], "utf8").includes("ig--sem-sticker"));
  const chamadas = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); writeFileSync(args.at(-1), "mp4"); };
  writeFileSync(join(pasta, "reel-cena-01.mp4"), "a"); writeFileSync(join(pasta, "reel-cena-02.mp4"), "b");
  writeFileSync(join(pasta, "reel-cena-01.png"), "p");
  const saida = await gerarReel(pasta, { executar, renderizar: async () => [join(pasta, "reel-cena-01.mp4"), join(pasta, "reel-cena-02.mp4")] });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.equal(chamadas.length, 1);
  assert.ok(chamadas[0].bin.includes("ffmpeg") && chamadas[0].args.includes("-f") && chamadas[0].args.at(-1) === saida);
  assert.ok(!existsSync(join(pasta, "reel-cena-01.mp4")) && !existsSync(join(pasta, "lista-cenas.txt")));
  assert.ok(existsSync(join(pasta, "reel.png")) && !existsSync(join(pasta, "reel-cena-01.png")));
  writeFileSync(join(pasta, "reel.json"), "{}");
  await assert.rejects(gerarReel(pasta, { soHtml: true }), ErroReel);
});
