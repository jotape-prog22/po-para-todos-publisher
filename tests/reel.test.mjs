import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validarReel, argsConcat, gerarReel, ErroReel, DURACAO_REEL, TIPOS_DE_REEL, argsYtDlp, argsMoldura, htmlDaMoldura, acharYtDlp } from "../design-system/scripts/gerar-reel.mjs";

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

const corte = { tipo: "corte", video: "folgas-complementares", inicio: "06:30", fim: "07:20", titulo: "EXEMPLO: O PRIMAL", faixa: "AULA COMPLETA NO CANAL", legenda };

test("validarReel (corte): campos, ordem dos tempos, duração e limites de texto", () => {
  assert.deepEqual(validarReel(corte), []);
  assert.ok(validarReel({ ...corte, fim: "06:40" }).some((e) => e.includes("de 15 a 90 s")));
  assert.ok(validarReel({ ...corte, fim: "06:00" }).some((e) => e.includes("depois do início")));
  assert.ok(validarReel({ ...corte, inicio: "6:30" }).some((e) => e.includes("mm:ss")));
  assert.deepEqual(validarReel({ ...corte, titulo: "x".repeat(40) }), []);
  assert.ok(validarReel({ ...corte, titulo: "x".repeat(41) }).some((e) => e.includes('"titulo"') && e.includes("máximo 40")));
  assert.ok(validarReel({ ...corte, video: undefined }).some((e) => e.includes('"video"')));
});

test("argsYtDlp baixa só o trecho, em MP4 até 1080p, com o ffmpeg do projeto", () => {
  const a = argsYtDlp({ url: "https://youtu.be/x", inicio: "06:30", fim: "07:20", saida: "/p/corte-bruto.mp4", ffmpegDir: "/ff" });
  assert.ok(a.includes("--download-sections") && a[a.indexOf("--download-sections") + 1] === "*06:30-07:20");
  assert.ok(a.includes("--force-keyframes-at-cuts") && a[a.indexOf("--ffmpeg-location") + 1] === "/ff");
  assert.ok(a[a.indexOf("-f") + 1].includes("height<=1080") && a[a.indexOf("-o") + 1] === "/p/corte-bruto.mp4");
  assert.equal(a.at(-1), "https://youtu.be/x");
});

test("argsMoldura sobrepõe o vídeo 16:9 centrado na moldura 9:16, mantém o áudio e termina com o vídeo", () => {
  const a = argsMoldura({ moldura: "/p/m.png", bruto: "/p/b.mp4", saida: "/p/reel.mp4" });
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.ok(fc.includes("scale=1080:-2") && fc.includes("overlay=0:(H-h)/2") && fc.includes("shortest=1") && fc.includes("yuv420p"));
  assert.ok(a.includes("-loop") && a.includes("1:a?") && a.includes("aac") && a.at(-1) === "/p/reel.mp4");
  assert.ok(a.indexOf("-framerate") >= 0 && a.indexOf("-framerate") < a.indexOf("-loop") && a[a.indexOf("-framerate") + 1] === "30", "moldura em 30 fps, antes do -loop");
});

test("htmlDaMoldura traz título, faixa e o lockup; acharYtDlp falha com mensagem útil", () => {
  const h = htmlDaMoldura({ titulo: "EXEMPLO: O PRIMAL", faixa: "AULA COMPLETA NO CANAL", ds: "../../design-system" });
  assert.ok(h.includes("EXEMPLO: O PRIMAL") && h.includes("AULA COMPLETA NO CANAL") && h.includes("reel.css") && h.includes("logo-po-fundo-escuro"));
  assert.ok(!h.includes("ig__titulo--medio"), "título curto (17) fica no tamanho cheio");
  assert.ok(htmlDaMoldura({ titulo: "EXEMPLO: RESOLVENDO O DUAL", faixa: "", ds: "." }).includes("ig__titulo--medio"), "título com 21+ caracteres usa o tamanho médio");
  const classe = (n) => (htmlDaMoldura({ titulo: "x".repeat(n), faixa: "", ds: "." }).match(/class="ig__titulo ?([\w-]*)"/) ?? [])[1] ?? "";
  assert.deepEqual([classe(20), classe(21), classe(30), classe(31), classe(40)], ["", "ig__titulo--medio", "ig__titulo--medio", "ig__titulo--pequeno", "ig__titulo--pequeno"], "até 20 cheio, 21–30 médio, 31–40 pequeno");
  assert.throws(() => acharYtDlp(() => { throw new Error("not found"); }), /yt-dlp não encontrado/);
  assert.equal(acharYtDlp(() => "/usr/local/bin/yt-dlp\n"), "/usr/local/bin/yt-dlp");
});

test("gerarReel (corte): baixa o trecho, exporta a moldura, sobrepõe e limpa o bruto", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  const videos = join(pasta, "videos"); mkdirSync(join(videos, "folgas-complementares"), { recursive: true });
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify(corte));
  const chamadas = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); const o = args.indexOf("-o"); writeFileSync(o >= 0 ? args[o + 1] : args.at(-1), "x"); };
  const saida = await gerarReel(pasta, { executar, raizVideos: videos, ytDlp: "/bin/yt-dlp", exportar: (html, png) => writeFileSync(png, "png") });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.deepEqual(chamadas.map((c) => c.bin), ["/bin/yt-dlp", (await import("ffmpeg-static")).default]);
  assert.ok(!existsSync(join(pasta, "corte-bruto.mp4")) && !existsSync(join(pasta, "reel-moldura.html")));
  assert.ok(existsSync(join(pasta, "reel.png")));
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "private" }));
  await assert.rejects(gerarReel(pasta, { executar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /público/);
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  await assert.rejects(gerarReel(pasta, { soHtml: true, executar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /--so-html/);
});
