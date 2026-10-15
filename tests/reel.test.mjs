import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { validarReel, gerarReel, ErroReel, DURACAO_REEL, TIPOS_DE_REEL, argsYtDlp, argsMoldura, temAudio, htmlDaMoldura, acharYtDlp } from "../design-system/scripts/gerar-reel.mjs";

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
  assert.ok(validarReel({ tipo: "cenas", trilha: "x", cenas: [cena(), cena()], legenda }, { biblioteca: { trilhas: [] } }).some((e) => e.includes('trilha "x"')));
});

const bibLeve = { licencas_aceitas: [], trilhas: [{ id: "leve", arquivo: "trilhas/leve.mp3", bpm: 120, primeira_batida: 0.5 }], efeitos: [] };

test("gerarReel (cenas): uma composição contínua, Trilha encaixada no compasso, capa no fim da 1ª Cena", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "leve", cenas: [cena(), cena({ kicker: "DOIS" })], legenda }));
  const visto = {};
  const mixar = async (comp, o) => { visto.mix = o; return o.saida; };
  const renderizar = async (comp, o) => { visto.comp = comp; visto.o = o; writeFileSync(o.mp4, "v"); return o.mp4; };
  const saida = await gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.equal(visto.mix.trilhaId, "leve");
  assert.deepEqual(visto.comp.cenas.map((c) => c.fim), [10.5, 20.5], "compasso de 2 s a partir de 0,5 s");
  assert.ok(visto.comp.classes.includes("ig--reel-cena") && visto.comp.formato === "reel");
  assert.ok(Math.abs(visto.o.capaEm - (10.5 - 0.35 - 0.1)) < 1e-9);
  assert.ok(visto.o.png.endsWith("reel.png") && visto.o.audio.endsWith("mix.wav"));

  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "nao-tem", cenas: [cena(), cena()], legenda }));
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), /trilha "nao-tem"/);

  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "leve", cenas: Array(9).fill(cena()), legenda }));
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), /90 s/, "90 s viram 90,5 no compasso: recusa");

  writeFileSync(join(pasta, "reel.json"), "{}");
  await assert.rejects(gerarReel(pasta, { renderizar, mixar, biblioteca: bibLeve }), ErroReel);
});

test("gerarReel (cenas): recusa reel que fica abaixo de 15 s depois do encaixe no compasso", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  // 7,5 + 7,5 = 15 s escritos; com batida em 0,5 s e compasso de 2 s, o fim cai em 14,5 s
  writeFileSync(join(pasta, "reel.json"), JSON.stringify({ tipo: "cenas", trilha: "leve", cenas: [cena({ duracao: 7.5 }), cena({ duracao: 7.5 })], legenda }));
  let gravou = false;
  const renderizar = async (comp, o) => { gravou = true; return o.mp4; };
  await assert.rejects(gerarReel(pasta, { renderizar, mixar: async (c, o) => o.saida, biblioteca: bibLeve }),
    (e) => e instanceof ErroReel && /as cenas dão 14\.5 s; um reel tem pelo menos 15 s — alongue uma cena/.test(e.message));
  assert.equal(gravou, false, "não grava nada");
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

test("argsMoldura põe o vídeo 16:9 centrado sobre a moldura animada (MP4), em 30 fps, com o áudio original", () => {
  const a = argsMoldura({ moldura: "/p/reel-moldura.mp4", bruto: "/p/b.mp4", saida: "/p/reel.mp4" });
  const fc = a[a.indexOf("-filter_complex") + 1];
  assert.ok(fc.includes("scale=1080:-2") && fc.includes("fps=30") && fc.includes("overlay=0:(H-h)/2") && fc.includes("shortest=1") && fc.includes("yuv420p"));
  assert.ok(!a.includes("-loop"), "a moldura agora é vídeo");
  assert.ok(a.includes("/p/reel-moldura.mp4") && a.includes("1:a") && a.includes("aac") && a.at(-1) === "/p/reel.mp4");
});

test("validarReel (corte): recusa trilha — o Corte mantém a voz original", () => {
  const e = validarReel({ ...corte, trilha: "qualquer" });
  assert.ok(e.some((m) => m.includes("voz original") && m.includes('"trilha"')));
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

test("gerarReel (corte): baixa o trecho, grava a moldura animada do tamanho do corte, sobrepõe e limpa", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "reel-"));
  const videos = join(pasta, "videos"); mkdirSync(join(videos, "folgas-complementares"), { recursive: true });
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  writeFileSync(join(pasta, "reel.json"), JSON.stringify(corte));
  const chamadas = [], molduras = [];
  const executar = async (bin, args) => { chamadas.push({ bin, args }); const o = args.indexOf("-o"); writeFileSync(o >= 0 ? args[o + 1] : args.at(-1), "x"); };
  const renderizar = async (comp, o) => { molduras.push({ comp, o }); writeFileSync(o.mp4, "m"); writeFileSync(o.png, "p"); return o.mp4; };
  const saida = await gerarReel(pasta, { executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" });
  assert.equal(saida, join(pasta, "reel.mp4"));
  assert.deepEqual(chamadas.map((c) => c.bin), ["/bin/yt-dlp", (await import("ffmpeg-static")).default]);
  const [{ comp, o }] = molduras;
  assert.equal(comp.formato, "moldura"); assert.equal(comp.duracao, 50); assert.equal(comp.cenas[0].titulo, "EXEMPLO: O PRIMAL");
  assert.equal(o.audio, null, "a moldura não tem som; o áudio é o do vídeo");
  assert.ok(chamadas[1].args.includes(join(pasta, "reel-moldura.mp4")));
  assert.ok(!existsSync(join(pasta, "corte-bruto.mp4")) && !existsSync(join(pasta, "reel-moldura.mp4")));
  assert.ok(existsSync(join(pasta, "reel.png")));
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "private" }));
  await assert.rejects(gerarReel(pasta, { executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /público/);
  writeFileSync(join(videos, "folgas-complementares", "publicacao.json"), JSON.stringify({ url: "https://youtu.be/x", privacidade: "public" }));
  await assert.rejects(gerarReel(pasta, { ver: true, executar, renderizar, raizVideos: videos, ytDlp: "/bin/yt-dlp" }), /--ver/);
});

test("argsMoldura (integração, ffmpeg real): sempre sai com faixa de áudio — a do vídeo se houver, senão a muda da moldura", () => {
  const dir = mkdtempSync(join(tmpdir(), "moldura-"));
  const ff = (...a) => spawnSync(ffmpegPath, ["-y", "-loglevel", "error", ...a], { encoding: "utf8" });
  const moldura = join(dir, "m.mp4"), mudo = join(dir, "mudo.mp4"), comSom = join(dir, "som.mp4");
  assert.equal(ff("-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30:d=1", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", moldura).status, 0);
  assert.equal(ff("-f", "lavfi", "-i", "color=c=red:s=640x360:r=25:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", mudo).status, 0);
  assert.equal(ff("-f", "lavfi", "-i", "color=c=red:s=640x360:r=25:d=1", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", comSom).status, 0);
  assert.equal(temAudio(mudo), false);
  assert.equal(temAudio(comSom), true);
  const nivel = (arq) => { const r = spawnSync(ffmpegPath, ["-i", arq, "-map", "0:a", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }); return r.status === 0 ? Number(/mean_volume: (-?[\d.]+)/.exec(r.stderr)?.[1]) : null; };
  const a = join(dir, "a.mp4"), b = join(dir, "b.mp4");
  assert.equal(ff(...argsMoldura({ moldura, bruto: mudo, saida: a, semAudio: true }).slice(3)).status, 0);
  assert.ok(nivel(a) < -60, "sem som no vídeo: faixa muda");
  assert.equal(ff(...argsMoldura({ moldura, bruto: comSom, saida: b }).slice(3)).status, 0);
  assert.ok(nivel(b) > -30, "com som: o áudio do vídeo (seno) passa");
});
