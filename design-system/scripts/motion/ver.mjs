// Prévia no navegador: mixa o som de cada composição, serve a página do motor com /composicoes.json
// e abre o navegador padrão. Fica no ar até Ctrl+C.

import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { servir } from "./servidor.mjs";
import { mixar as mixarAudio } from "./mixagem.mjs";
import { carregarBiblioteca } from "../../../scripts/audio.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export function abrirNoNavegador(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
}

export async function verComposicoes(itens, { biblioteca = carregarBiblioteca(), mixar = mixarAudio, abrir = abrirNoNavegador, servirFn = servir } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "ver-"));
  const extras = {}, lista = [];
  for (const [i, it] of itens.entries()) {
    const audio = await mixar(it.comp, { biblioteca, trilhaId: it.trilhaId ?? null, saida: join(tmp, `audio-${i}.wav`) });
    if (audio) extras[`/audio-${i}.wav`] = { arquivo: audio, tipo: "audio/wav" };
    lista.push({ nome: it.nome, comp: it.comp, audio: audio ? `/audio-${i}.wav` : null });
  }
  extras["/composicoes.json"] = { corpo: JSON.stringify(lista), tipo: "application/json" };
  const srv = await servirFn({ raiz: RAIZ, extras });
  const url = `${srv.url}/design-system/motion/pagina.html`;
  abrir(url);
  return { url, fechar: async () => { await srv.fechar(); rmSync(tmp, { recursive: true, force: true }); } };
}
