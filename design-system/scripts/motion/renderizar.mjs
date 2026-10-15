// Grava uma composição em MP4 (1080×1920, 30 fps, H.264 + AAC): abre a página do motor no Chrome do
// sistema, pede quadro a quadro (window.__quadro) e manda as capturas ao ffmpeg junto com o som mixado
// (ou uma faixa muda — a Meta recusa MP4 sem áudio). A capa (.png) é o quadro em capaEm, ou o último.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { servir } from "./servidor.mjs";
import { acharNavegador } from "../navegador.mjs";
import { ErroMotion } from "../../motion/movimento.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const FPS = 30;
export { ErroMotion };

export function argsVideo(mp4, { fps = FPS, audio = null } = {}) {
  return [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    ...(audio ? ["-i", audio] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]),
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", audio ? "192k" : "96k", "-movflags", "+faststart",
    mp4,
  ];
}

export async function abrirPlayer(comp) {
  const { default: puppeteer } = await import("puppeteer-core");
  const srv = await servir({ raiz: RAIZ });
  const browser = await puppeteer.launch({ executablePath: acharNavegador(), headless: true, args: ["--hide-scrollbars"] });
  const fechar = async () => { await browser.close(); await srv.fechar(); };
  try {
    const page = await browser.newPage();
    const erros = [];
    page.on("pageerror", (e) => erros.push(e.message));
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto(`${srv.url}/design-system/motion/pagina.html?render`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.__carregar === "function", { timeout: 10_000 }).catch(() => {});
    if (erros.length) throw new ErroMotion(`a página do motor falhou ao abrir: ${erros.join("; ")}`);
    await page.evaluate((c) => window.__carregar(c), comp);
    return { page, fechar };
  } catch (e) {
    await fechar();
    throw e instanceof ErroMotion ? e : new ErroMotion(`a página do motor falhou: ${e.message}`);
  }
}

async function quadro(page, t) {
  try {
    await page.evaluate((x) => window.__quadro(x), t);
  } catch (e) {
    throw new ErroMotion(`a página do motor falhou no instante ${t.toFixed(2)} s: ${e.message}`);
  }
  return page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}

export async function renderizar(comp, { mp4, png = null, audio = null, capaEm = null }) {
  const { default: ffmpeg } = await import("ffmpeg-static");
  const { page, fechar } = await abrirPlayer(comp);
  try {
    const ff = spawn(ffmpeg, argsVideo(mp4, { audio }), { stdio: ["pipe", "inherit", "inherit"] });
    const terminou = new Promise((ok, falha) => { ff.on("error", falha); ff.on("close", (c) => (c === 0 ? ok() : falha(new ErroMotion(`ffmpeg terminou com código ${c}`)))); });
    const total = Math.round(comp.duracao * FPS);
    const iCapa = capaEm == null ? total - 1 : Math.min(total - 1, Math.round(capaEm * FPS));
    let capa;
    try {
      for (let i = 0; i < total; i++) {
        const img = await quadro(page, i / FPS);
        if (i === iCapa) capa = img;
        if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
      }
    } finally {
      ff.stdin.end();
    }
    await terminou;
    if (png && capa) writeFileSync(png, capa);
    return mp4;
  } finally {
    await fechar();
  }
}

// Quadros soltos para conferir sem gravar o vídeo: <prefixo>-<t>s.png.
export async function fotografar(comp, instantes, prefixo) {
  const { page, fechar } = await abrirPlayer(comp);
  try {
    const saidas = [];
    for (const t of instantes) {
      const arq = `${prefixo}-${String(t).replace(".", ",")}s.png`;
      writeFileSync(arq, await quadro(page, t));
      saidas.push(arq);
    }
    return saidas;
  } finally {
    await fechar();
  }
}
