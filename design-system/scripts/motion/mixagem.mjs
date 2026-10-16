// Mixa o som de uma composição num WAV: base muda com a duração exata, Trilha (em loop, com fade)
// e Efeitos sonoros nos instantes dos eventos. Com Trilha, normaliza a −14 LUFS; sem Trilha (stories),
// só limita os picos — normalizar um vídeo quase todo em silêncio estouraria os efeitos.

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { escolherEfeito, DIR_AUDIO, ErroAudio, existeNoDisco, avisoAusente } from "../../../scripts/audio.mjs";

export const MOVIMENTO = JSON.parse(readFileSync(new URL("../../motion/movimento.json", import.meta.url), "utf8"));

export function argsMixagem({ duracao, trilha = null, efeitos = [], saida, normalizar }) {
  const D = duracao.toFixed(3);
  const entradas = ["-f", "lavfi", "-t", D, "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"];
  const filtros = [], rotulos = ["[0:a]"];
  let n = 1;
  if (trilha) {
    const { fade_entrada: fi, fade_saida: fo } = MOVIMENTO.trilha;
    entradas.push("-t", D, "-stream_loop", "-1", "-i", trilha.arquivo);
    filtros.push(`[${n}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${D},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fi},afade=t=out:st=${(duracao - fo).toFixed(3)}:d=${fo},volume=${trilha.ganho}[t]`);
    rotulos.push("[t]");
    n++;
  }
  efeitos.forEach((e, i) => {
    const ms = Math.round(e.t * 1000);
    entradas.push("-i", e.arquivo);
    filtros.push(`[${n}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${ms}|${ms},volume=${e.ganho}[e${i}]`);
    rotulos.push(`[e${i}]`);
    n++;
  });
  // duration=longest + atrim final: com a Trilha em loop infinito, duration=first trava o ffmpeg (não encerra); o atrim corta na duração exata.
  const { I, TP } = MOVIMENTO.loudness;
  const final = normalizar ? `loudnorm=I=${I}:TP=${TP}:LRA=11` : "alimiter=limit=0.89";
  filtros.push(`${rotulos.join("")}amix=inputs=${rotulos.length}:normalize=0:duration=longest,${final},aresample=44100,aformat=channel_layouts=stereo,atrim=0:${D}[mix]`);
  return ["-y", "-loglevel", "error", ...entradas, "-filter_complex", filtros.join(";"), "-map", "[mix]", "-c:a", "pcm_s16le", saida];
}

// Roda um programa externo e falha (com a classe pedida) levando a saída de erro dele (injetável nos testes).
export function rodar(binario, args, ErroClasse = Error) {
  return new Promise((ok, falha) => {
    const p = spawn(binario, args, { stdio: ["ignore", "inherit", "pipe"] });
    let erro = "";
    p.stderr.on("data", (d) => { erro += d; });
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroClasse(`${binario.split("/").pop()} terminou com código ${c}${erro ? `: ${erro.trim()}` : ""}`))));
  });
}

const rodarMixagem = (bin, args) => rodar(bin, args, ErroAudio);

// Efeito listado mas ausente no disco fica de fora (as variações que existem alternam); Trilha ausente é erro.
export async function mixar(comp, { biblioteca, trilhaId = null, saida, executar = rodarMixagem, ffmpeg = null, existe = existeNoDisco }) {
  const disponivel = { ...biblioteca, efeitos: biblioteca.efeitos.filter((e) => existe(e.arquivo)) };
  const contagem = {};
  const efeitos = comp.efeitos.flatMap((e) => {
    const n = (contagem[e.efeito] = (contagem[e.efeito] ?? -1) + 1);
    const ef = escolherEfeito(disponivel, e.efeito, n);
    return ef ? [{ arquivo: join(DIR_AUDIO, ef.arquivo), t: e.t, ganho: e.ganho }] : [];
  });
  let trilha = null;
  if (trilhaId) {
    const t = biblioteca.trilhas.find((x) => x.id === trilhaId);
    if (!t) throw new ErroAudio(`trilha "${trilhaId}" não está em design-system/audio/biblioteca.json`);
    if (!existe(t.arquivo)) throw new ErroAudio(`trilha "${trilhaId}": ${avisoAusente(t)} (a música não vai para o GitHub — README, "O áudio não está no GitHub")`);
    trilha = { arquivo: join(DIR_AUDIO, t.arquivo), ganho: MOVIMENTO.trilha.ganho };
  }
  if (!trilha && !efeitos.length) return null;
  await executar(ffmpeg ?? (await import("ffmpeg-static")).default, argsMixagem({ duracao: comp.duracao, trilha, efeitos, saida, normalizar: !!trilha }));
  return saida;
}
