#!/usr/bin/env node
// Converte assets/Marca/motivo-nos.svg em PNG 600×600 com fundo transparente, para uso no PPTX
// (pptxgenjs não rasteriza SVG fora do navegador). Rode de novo só se o SVG mudar.
//
//   node design-system/scripts/rasterizar-motivo.mjs

import { writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = join(DS, "assets/Marca/motivo-nos.svg");
const PNG = join(DS, "assets/Marca/motivo-nos-600.png");

function acharChrome() {
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
  ].filter(Boolean);
  const bin = candidatos.find((c) => existsSync(c));
  if (!bin) throw new Error("nenhum Chrome/Chromium/Edge encontrado; defina CHROME=/caminho/do/binário");
  return bin;
}

export function rasterizar() {
  const dir = mkdtempSync(join(tmpdir(), "motivo-"));
  const html = join(dir, "motivo.html");
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    img{display:block;width:600px;height:600px}
  </style></head><body><img src="${pathToFileURL(SVG).href}"></body></html>`);
  try {
    execFileSync(acharChrome(), [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
      "--window-size=600,600", `--screenshot=${PNG}`, pathToFileURL(html).href,
    ], { stdio: "ignore" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return PNG;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(rasterizar()); }
  catch (e) { console.error(`erro: ${e.message}`); process.exit(1); }
}
