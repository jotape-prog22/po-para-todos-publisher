import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acharNavegador } from "../design-system/scripts/navegador.mjs";
import { renderizar, fotografar, argsVideo, abrirPlayer, ErroMotion } from "../design-system/scripts/motion/renderizar.mjs";
import { ErroMotion as ErroDoMotor } from "../design-system/motion/movimento.mjs";
import { montarComposicao } from "../design-system/motion/composicao.mjs";
import { validarCena } from "../design-system/motion/cenas/index.mjs";

let temChrome = true;
try { acharNavegador(); } catch { temChrome = false; }

test("argsVideo: com áudio usa o WAV; sem áudio, faixa muda", () => {
  const com = argsVideo("/t/x.mp4", { audio: "/t/m.wav" });
  assert.ok(com.includes("/t/m.wav") && !com.includes("anullsrc=channel_layout=stereo:sample_rate=44100"));
  const sem = argsVideo("/t/x.mp4", {});
  assert.ok(sem.includes("anullsrc=channel_layout=stereo:sample_rate=44100"));
  for (const par of [["-framerate", "30"], ["-c:v", "libx264"], ["-pix_fmt", "yuv420p"], ["-c:a", "aac"], ["-map", "1:a"]]) assert.ok(sem.some((a, j) => a === par[0] && sem[j + 1] === par[1]), par.join(" "));
});

const comp = (extra = {}) => montarComposicao([validarCena({ duracao: 3, kicker: "TESTE", titulo: "FUNÇÃO ÓTIMA", ...extra }, "cena", { formato: "reel" }).cena], { formato: "reel", usuario: "pesquisaoperacionalparatodos" });

test("renderizar grava MP4 e PNG de verdade (Chrome do sistema)", { skip: !temChrome && "sem Chrome" }, async () => {
  const pasta = mkdtempSync(join(tmpdir(), "render-"));
  const mp4 = join(pasta, "x.mp4"), png = join(pasta, "x.png");
  await renderizar(comp({ faixa: "AULA COMPLETA NO CANAL" }), { mp4, png });
  assert.ok(statSync(mp4).size > 10_000 && existsSync(png));
  const { default: sharp } = await import("sharp");
  const st = await sharp(png).stats();
  assert.ok(st.channels[1].max > 150, "tem verde (rodapé/título)");
  assert.ok(st.channels[0].stdev > 5, "não é uma tela lisa");
  const fotos = await fotografar(comp(), [0.5, 2.5], join(pasta, "foto"));
  assert.equal(fotos.length, 2); assert.ok(fotos.every(existsSync));
});

test("renderizar avisa quando a página do motor quebra", { skip: !temChrome && "sem Chrome" }, async () => {
  const c = comp(); c.cenas[0].tipo = "nao-existe";
  await assert.rejects(renderizar(c, { mp4: join(tmpdir(), "nunca.mp4") }), (e) => e instanceof ErroDoMotor && /página do motor/.test(e.message));
});

test("renderizar reexporta o ErroMotion do motor (uma classe só)", () => {
  assert.equal(ErroMotion, ErroDoMotor);
});

test("medirLayout lê do CSS a geometria do kit, com o recuo do item (112 px na calibração atual)", { skip: !temChrome && "sem Chrome" }, async () => {
  const { page, fechar } = await abrirPlayer(comp());
  try {
    const kit = await page.evaluate(async () => (await import(new URL("./layout.mjs", location.href).href)).medirLayout(document));
    assert.equal(kit.layout.recuoItem, 112);
    assert.deepEqual([kit.layout.largura, kit.layout.altura], [1080, 1920]);
    for (const [nome, f] of Object.entries(kit.fontes)) assert.ok(f.px > 0 && f.line > 0, `fonte ${nome}`);
    for (const [nome, c] of Object.entries(kit.cores)) assert.ok(c, `cor ${nome}`);
    assert.ok(kit.layout.area.w > 0 && kit.layout.area.h > 0 && kit.layout.rodape.h > 0);
  } finally { await fechar(); }
});
