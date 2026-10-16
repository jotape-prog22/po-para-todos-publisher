// Acha o Chrome/Chromium/Edge do sistema (mesma lista do exportar.sh). Usado por quem grava vídeo e recorta tela.
import { accessSync, constants } from "node:fs";
import { execSync } from "node:child_process";

export class ErroNavegador extends Error {}

export function acharNavegador() {
  const home = process.env.HOME ?? "";
  const candidatos = [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    `${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ...["google-chrome", "chromium", "microsoft-edge"].map((n) => { try { return execSync(`command -v ${n}`, { stdio: "pipe" }).toString().trim(); } catch { return ""; } }),
  ];
  for (const c of candidatos) {
    if (!c) continue;
    try { accessSync(c, constants.X_OK); return c; } catch { /* próximo */ }
  }
  throw new ErroNavegador("nenhum Chrome/Chromium/Edge encontrado; defina CHROME=/caminho/do/navegador");
}
