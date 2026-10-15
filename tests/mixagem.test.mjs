import { test } from "node:test";
import assert from "node:assert/strict";
import { argsMixagem, mixar, rodar, MOVIMENTO } from "../design-system/scripts/motion/mixagem.mjs";
import { LICENCAS_ACEITAS } from "../scripts/audio.mjs";

const filtro = (a) => a[a.indexOf("-filter_complex") + 1];

test("argsMixagem: base muda com a duração, Trilha em loop com fade, efeitos com atraso, normaliza a −14 LUFS", () => {
  const a = argsMixagem({ duracao: 30, trilha: { arquivo: "/a/t.mp3", ganho: 0.55 }, efeitos: [{ arquivo: "/a/tick.ogg", t: 1.5, ganho: 0.8 }], saida: "/tmp/m.wav", normalizar: true });
  const i = a.indexOf("anullsrc=channel_layout=stereo:sample_rate=44100");
  assert.ok(i > 0 && a[i - 1] === "-i" && a[i - 2] === "30.000" && a[i - 3] === "-t");
  const iT = a.indexOf("/a/t.mp3");
  assert.equal(a[iT - 1], "-i"); assert.deepEqual(a.slice(iT - 3, iT - 1), ["-stream_loop", "-1"], "Trilha curta repete");
  const f = filtro(a);
  assert.ok(f.includes("afade=t=in:st=0:d=0.4") && f.includes("afade=t=out:st=28.800:d=1.2") && f.includes("volume=0.55"));
  assert.ok(f.includes("adelay=1500|1500") && f.includes("volume=0.8"));
  assert.ok(f.includes("amix=inputs=3:normalize=0:duration=longest") && f.includes("loudnorm=I=-14:TP=-1.5"));
  assert.deepEqual(a.slice(-4), ["[mix]", "-c:a", "pcm_s16le", "/tmp/m.wav"]);
});

test("argsMixagem sem Trilha (story): só efeitos, sem loudnorm (não infla o silêncio), com limitador", () => {
  const f = filtro(argsMixagem({ duracao: 8, trilha: null, efeitos: [{ arquivo: "/a/pop.ogg", t: 0.3, ganho: 0.4 }], saida: "/tmp/m.wav", normalizar: false }));
  assert.ok(!f.includes("loudnorm") && f.includes("alimiter") && f.includes("amix=inputs=2"));
});

const comp = { formato: "reel", duracao: 20, efeitos: [{ t: 0.3, efeito: "pop", ganho: 0.8 }, { t: 1, efeito: "tick", ganho: 0.8 }, { t: 2, efeito: "tick", ganho: 0.8 }] };
const bib = (trilhas = [], efeitos = []) => ({ licencas_aceitas: LICENCAS_ACEITAS, trilhas, efeitos });

test("mixar: biblioteca vazia e sem Trilha → null (o vídeo sai com a faixa muda)", async () => {
  let chamou = false;
  assert.equal(await mixar(comp, { biblioteca: bib(), saida: "/tmp/m.wav", executar: async () => { chamou = true; }, ffmpeg: "ff" }), null);
  assert.equal(chamou, false);
});

test("mixar: usa só os efeitos que existem, alterna variações e põe a Trilha escolhida", async () => {
  const efeitos = [{ id: "t1", arquivo: "efeitos/t1.ogg", uso: "tick" }, { id: "t2", arquivo: "efeitos/t2.ogg", uso: "tick" }];
  const trilhas = [{ id: "leve", arquivo: "trilhas/leve.mp3" }];
  const chamadas = [];
  const r = await mixar(comp, { biblioteca: bib(trilhas, efeitos), trilhaId: "leve", saida: "/tmp/m.wav", executar: async (bin, args) => chamadas.push({ bin, args }), ffmpeg: "ff" });
  assert.equal(r, "/tmp/m.wav");
  const a = chamadas[0].args;
  assert.equal(chamadas[0].bin, "ff");
  assert.ok(a.some((x) => x.endsWith("trilhas/leve.mp3")));
  assert.deepEqual(a.filter((x) => /efeitos\/t\d\.ogg$/.test(x)).map((x) => x.slice(-6)), ["t1.ogg", "t2.ogg"], "pop não existe e fica de fora; os dois ticks alternam");
  assert.ok(filtro(a).includes("loudnorm"), "com Trilha, normaliza");
  await assert.rejects(mixar(comp, { biblioteca: bib(trilhas, efeitos), trilhaId: "nao-tem", saida: "/tmp/m.wav", executar: async () => {}, ffmpeg: "ff" }), /trilha "nao-tem"/);
});

test("tokens de som estão no movimento.json", () => {
  assert.equal(MOVIMENTO.loudness.I, -14);
  assert.equal(MOVIMENTO.trilha.compasso, 4);
});

test("rodar: falha com a classe pedida, binário sem caminho e stderr", async () => {
  class ErroX extends Error {}
  await assert.rejects(rodar("/bin/sh", ["-c", "echo ruim >&2; exit 3"], ErroX), (e) => e instanceof ErroX && /^sh terminou com código 3: ruim$/.test(e.message));
  await assert.rejects(rodar("/bin/sh", ["-c", "exit 2"], ErroX), (e) => e.message === "sh terminou com código 2");
  await rodar("/bin/sh", ["-c", "exit 0"], ErroX);
});

// Integração: roda o ffmpeg-static de verdade (o filtro precisa ser aceito e o WAV sair com a duração pedida).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as juntar } from "node:path";
import ffmpegBin from "ffmpeg-static";

const ff = (...a) => spawnSync(ffmpegBin, a, { encoding: "utf8" });
const duracaoDe = (f) => { const m = ff("-i", f).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3]; };
const picoDoFim = (f, de) => +ff("-ss", String(de), "-i", f, "-af", "volumedetect", "-f", "null", "-").stderr.match(/max_volume: (-?[\d.]+|-inf) dB/)[1];

test("integração: Trilha curta em loop com normalização sai com a duração pedida e som até o fim", () => {
  const dir = mkdtempSync(juntar(tmpdir(), "mixagem-"));
  try {
    const trilha = juntar(dir, "t.wav"), tick = juntar(dir, "tick.wav"), saida = juntar(dir, "m.wav");
    execFileSync(ffmpegBin, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", trilha]);
    execFileSync(ffmpegBin, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=1000:duration=0.1", tick]);
    const args = argsMixagem({ duracao: 6, trilha: { arquivo: trilha, ganho: 0.55 }, efeitos: [{ arquivo: tick, t: 1, ganho: 0.8 }], saida, normalizar: true });
    execFileSync(ffmpegBin, args, { stdio: ["ignore", "ignore", "pipe"] });
    assert.ok(Math.abs(duracaoDe(saida) - 6) < 0.05, "duração pedida");
    assert.ok(picoDoFim(saida, 4.5) > -40, "a Trilha em loop continua tocando no fim (fade-out ainda audível antes do último segundo)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("integração: sem Trilha, só efeitos, sai com a duração pedida e o efeito audível", () => {
  const dir = mkdtempSync(juntar(tmpdir(), "mixagem-"));
  try {
    const pop = juntar(dir, "pop.wav"), saida = juntar(dir, "m.wav");
    execFileSync(ffmpegBin, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=800:duration=0.2", pop]);
    execFileSync(ffmpegBin, argsMixagem({ duracao: 5, trilha: null, efeitos: [{ arquivo: pop, t: 1, ganho: 0.8 }], saida, normalizar: false }), { stdio: ["ignore", "ignore", "pipe"] });
    assert.ok(Math.abs(duracaoDe(saida) - 5) < 0.05);
    assert.ok(picoDoFim(saida, 0.9) > -30, "efeito audível");
    assert.ok(picoDoFim(saida, 3) < -60, "resto em silêncio");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
