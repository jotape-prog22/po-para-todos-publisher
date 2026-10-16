#!/usr/bin/env node
// Biblioteca de áudio dos vídeos do Instagram (design-system/audio/biblioteca.json): Trilhas e
// Efeitos sonoros, cada um com fonte, link e licença gratuita explícita (ADR-0012).
//
//   node scripts/audio.mjs                    # valida a biblioteca e mostra o resumo
//   node scripts/audio.mjs --medir <arquivo>  # mede BPM, primeira batida e duração de uma faixa nova
//   node scripts/audio.mjs --medir <arquivo> --bpm 70   # remede perto de um BPM batido de ouvido
//
// A medição ouve o arquivo pelo ffmpeg do projeto; o resultado vai para a entrada da Trilha.

import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { r3 } from "../design-system/motion/util.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DIR_AUDIO = join(RAIZ, "design-system/audio");

export class ErroAudio extends Error {}
export const LICENCAS_ACEITAS = ["CC0", "Pixabay Content License", "YouTube Audio Library — sem atribuição"];
export const CLIMAS = ["curioso", "leve", "animado", "reflexivo", "tenso"];
export const USOS = ["caneta", "pop", "whoosh", "tick", "impacto", "digitar", "sino"];

export function carregarBiblioteca(arquivo = join(DIR_AUDIO, "biblioteca.json")) {
  return JSON.parse(readFileSync(arquivo, "utf8"));
}

function comuns(item, onde, erros, ids) {
  for (const c of ["id", "arquivo", "fonte", "link", "licenca"]) if (!item[c]) erros.push(`${onde}: falta "${c}"`);
  if (item.id) { if (ids.has(item.id)) erros.push(`${onde}: id "${item.id}" repetido`); ids.add(item.id); }
  if (item.link && !/^https:\/\//.test(item.link)) erros.push(`${onde}: "link" precisa começar com https://`);
  if (item.licenca && !LICENCAS_ACEITAS.includes(item.licenca)) erros.push(`${onde}: licença "${item.licenca}" não é aceita (${LICENCAS_ACEITAS.join("; ")})`);
}

// Os arquivos do Pixabay não vão para o git (a licença proíbe distribuir o arquivo isolado): ficam no
// disco de quem produz, com backup em ~/.po-para-todos/audio/. Arquivo ausente é aviso, não erro.
export const existeNoDisco = (rel) => existsSync(join(DIR_AUDIO, rel));
export const BACKUP_AUDIO = "~/.po-para-todos/audio/";
export const avisoAusente = (item) => `falta o arquivo design-system/audio/${item.arquivo} — copie de ${BACKUP_AUDIO}${item.arquivo} ou baixe de ${item.link}`;

export function arquivosAusentes(b, { existe = existeNoDisco } = {}) {
  return [...b.trilhas, ...b.efeitos].filter((i) => i.arquivo && !existe(i.arquivo)).map(avisoAusente);
}

// Esquema e licenças; não olha o disco (ver arquivosAusentes). `existe` fica aceito por compatibilidade.
export function validarBiblioteca(b, _opcoes = {}) {
  const erros = [], ids = new Set();
  if (!Array.isArray(b?.trilhas) || !Array.isArray(b?.efeitos)) return ['biblioteca.json precisa das listas "trilhas" e "efeitos"'];
  b.trilhas.forEach((t, i) => {
    const onde = `trilha ${i + 1}${t.id ? ` (${t.id})` : ""}`;
    comuns(t, onde, erros, ids);
    if (!t.titulo || !t.autor) erros.push(`${onde}: falta "titulo" ou "autor"`);
    if (!Array.isArray(t.clima) || !t.clima.length) erros.push(`${onde}: "clima" precisa de pelo menos um de ${CLIMAS.join(", ")}`);
    else for (const c of t.clima) if (!CLIMAS.includes(c)) erros.push(`${onde}: clima "${c}" não existe (${CLIMAS.join(", ")})`);
    if (!(t.bpm >= 60 && t.bpm <= 200)) erros.push(`${onde}: "bpm" deve ser de 60 a 200 — meça com node scripts/audio.mjs --medir`);
    if (!(t.primeira_batida >= 0)) erros.push(`${onde}: "primeira_batida" deve ser ≥ 0`);
    if (!(t.duracao > 0)) erros.push(`${onde}: "duracao" deve ser > 0`);
  });
  b.efeitos.forEach((e, i) => {
    const onde = `efeito ${i + 1}${e.id ? ` (${e.id})` : ""}`;
    comuns(e, onde, erros, ids);
    if (!USOS.includes(e.uso)) erros.push(`${onde}: uso "${e.uso}" não existe (${USOS.join(", ")})`);
  });
  return erros;
}

export const usosSemEfeito = (b) => USOS.filter((u) => !b.efeitos.some((e) => e.uso === u));

// n-ésima ocorrência de um uso → alterna entre as variações (o mesmo vídeo soa igual a cada render).
export function escolherEfeito(b, uso, n) {
  const lista = b.efeitos.filter((e) => e.uso === uso);
  return lista.length ? lista[n % lista.length] : null;
}

// ---- Andamento (BPM) e primeira batida ----
// 1. Novidade espectral: STFT (janela 1024, salto 256 ≈ 86 quadros/s), quanto o espectro em escala
//    log CRESCEU de um quadro para o outro, somado nas frequências. Pega bumbo, caixa e notas novas
//    — não só "ficou mais alto", que falha quando a música é sustentada.
// 2. Período: autocorrelação da novidade. Uma batida de período P também correlaciona em 2P, 3P…
//    (por isso o andamento pela metade parece bom) e um chimbal em colcheias correlaciona em P/2
//    (o dobro). Desempate: cada candidato soma a autocorrelação nos seus múltiplos (P, 2P, 3P, 4P),
//    o que derruba P/2 (metade dos múltiplos cai fora da batida), e é pesado por uma preferência
//    larga em torno de 120 BPM (uma oitava ≈ 1 desvio), que derruba 2P. Achar o pico mais alto da
//    autocorrelação, ou um pente sem esse desempate, cai no dobro/metade com facilidade.
// 3. Ajuste fino: um pente de batidas o + kP percorre a faixa inteira; um P ligeiramente errado sai
//    de fase ao longo dos segundos, então o melhor P (passo de 0,01 quadro) dá o BPM com décimos e o
//    melhor o dá a fase da grade — a primeira batida (em [0, P)); se a faixa abre com silêncio ou
//    introdução sem batida, ela cai ali, e a grade continua certa.
// Limite: dobro e metade são o mesmo pulso a outra velocidade, e a preferência por 120 decide. Faixa
// lenta (≲ 80) com colcheias marcadas pode sair no dobro; muito rápida (≳ 170), na metade. Os cortes
// continuam na batida — confira de ouvido ao cadastrar a Trilha e, se saiu no dobro ou na metade,
// remeça com a dica (`bpm`): a busca fica a ±1/3 de oitava dela e a fase sai da grade certa (corrigir
// só o número à mão deixaria a primeira batida no contratempo em metade dos casos).
const JANELA = 1024, SALTO = 256;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1;
    for (; j & b; b >>= 1) j ^= b;
    j |= b;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let m = 2; m <= n; m <<= 1) {
    const a = (-2 * Math.PI) / m, wr = Math.cos(a), wi = Math.sin(a);
    for (let s = 0; s < n; s += m) {
      let cr = 1, ci = 0;
      for (let k = 0; k < m / 2; k++) {
        const p = s + k, q = p + m / 2;
        const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

// novidade[i]: quanto o quadro i (amostras i·SALTO … i·SALTO + JANELA) trouxe de som novo.
function novidade(x, taxa) {
  const n = Math.floor((x.length - JANELA) / SALTO) + 1;
  const hann = Float64Array.from({ length: JANELA }, (_, j) => 0.5 - 0.5 * Math.cos((2 * Math.PI * j) / JANELA));
  const bins = JANELA / 2 + 1, re = new Float64Array(JANELA), im = new Float64Array(JANELA);
  // faixas espaçadas em oitavas (30 Hz … Nyquist, 4 por oitava): cada faixa vota uma vez, para o
  // chiado de um chimbal (centenas de bins agudos) não abafar o bumbo (meia dúzia de bins graves)
  const faixa = new Int32Array(bins), hz = taxa / JANELA;
  for (let b = 0, ultima = -1, f = -1; b < bins; b++) {
    const bruta = Math.floor(4 * Math.log2(Math.max(b * hz, 30) / 30));
    if (bruta !== ultima) { ultima = bruta; f++; }   // no grave, um bin pula faixas: numera só as que têm bin
    faixa[b] = f;
  }
  const nf = faixa[bins - 1] + 1, tam = new Float64Array(nf);
  for (let b = 0; b < bins; b++) tam[faixa[b]]++;
  let antes = new Float64Array(nf), agora = new Float64Array(nf);
  const nov = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < JANELA; j++) { re[j] = x[i * SALTO + j] * hann[j]; im[j] = 0; }
    fft(re, im);
    agora.fill(0);
    for (let b = 0; b < bins; b++) agora[faixa[b]] += Math.hypot(re[b], im[b]);
    let s = 0;
    for (let f = 0; f < nf; f++) {
      agora[f] = Math.log1p(100 * (agora[f] / tam[f]));
      if (i > 0) s += Math.max(0, agora[f] - antes[f]);
    }
    nov[i] = s;
    [antes, agora] = [agora, antes];
  }
  // tira a média local (≈ 0,5 s) e o que fica abaixo dela: sobram os picos
  const r = 22, saida = new Float64Array(n);
  let soma = 0;
  for (let i = 0; i < Math.min(n, r); i++) soma += nov[i];
  for (let i = 0; i < n; i++) {
    if (i + r < n) soma += nov[i + r];
    if (i - r - 1 >= 0) soma -= nov[i - r - 1];
    const cont = Math.min(n - 1, i + r) - Math.max(0, i - r) + 1;
    saida[i] = Math.max(0, nov[i] - soma / cont);
  }
  return saida;
}

export const DICA_BPM = { min: 40, max: 240 };

export function batidas(x, taxa, { bpm: dica, min = 60, max = 200, centro = 120 } = {}) {
  if (dica !== undefined) {
    if (!(dica >= DICA_BPM.min && dica <= DICA_BPM.max)) throw new ErroAudio(`dica de BPM ${dica} fora de ${DICA_BPM.min} a ${DICA_BPM.max}`);
    [centro, min, max] = [dica, dica * 2 ** (-1 / 3), dica * 2 ** (1 / 3)];
  }
  const fps = taxa / SALTO;
  const P0 = (fps * 60) / max, P1 = (fps * 60) / min;
  // a autocorrelação olha até 4 períodos do andamento mais lento: pede pelo menos o dobro disso
  if ((x.length - JANELA) / SALTO < 8 * P1) throw new ErroAudio("áudio curto demais para medir o andamento");
  const nov = novidade(x, taxa);
  const n = nov.length;

  const media = nov.reduce((a, v) => a + v, 0) / n;
  const c = nov.map((v) => v - media);
  const L = Math.ceil(4 * P1) + 2, ac = new Float64Array(L + 1);
  for (let l = 0; l <= L; l++) { let s = 0; for (let i = l; i < n; i++) s += c[i] * c[i - l]; ac[l] = s / (n - l); }
  const acEm = (p) => { const i = Math.floor(p), f = p - i; return i + 1 > L ? 0 : ac[i] * (1 - f) + ac[i + 1] * f; };

  // período grosso: múltiplos somados × preferência em oitavas em torno de `centro`
  let P = 0, melhor = -Infinity;
  for (let p = P0; p <= P1; p += 0.25) {
    let s = 0;
    for (let k = 1; k <= 4; k++) s += Math.max(0, acEm(k * p));
    const oitavas = Math.log2((fps * 60) / p / centro);
    const v = s * Math.exp(-0.5 * oitavas * oitavas);
    if (v > melhor) { melhor = v; P = p; }
  }

  // ajuste fino: pente sobre a novidade suavizada (o pico de um ataque ocupa 1–2 quadros)
  const suave = nov.map((_, i) => 0.25 * (nov[i - 1] ?? 0) + 0.5 * nov[i] + 0.25 * (nov[i + 1] ?? 0));
  const em = (t) => { const i = Math.floor(t), f = t - i; return (suave[i] ?? 0) * (1 - f) + (suave[i + 1] ?? 0) * f; };
  let fino = { v: -Infinity, P, o: 0 };
  for (let p = Math.max(P0, P - 0.5); p <= Math.min(P1, P + 0.5); p += 0.01) {
    for (let o = 0; o < p; o += 0.25) {
      let s = 0;
      for (let t = o; t < n; t += p) s += em(t);
      if (s > fino.v) fino = { v: s, P: p, o };
    }
  }
  // De um quadro para o seguinte a janela anda para a direita e o ataque escorrega do fim para o meio
  // dela; o peso de Hann sobe mais depressa em 3/4 da janela, então o maior salto da novidade cai no
  // quadro que começa ≈ 0,75·JANELA antes do ataque.
  const bpm = Math.round(((fps * 60) / fino.P) * 10) / 10;
  const periodo = fino.P / fps;   // a grade de batidas é primeira_batida + k·periodo
  const primeira_batida = r3(((fino.o * SALTO + 0.75 * JANELA) / taxa) % periodo);
  return { bpm, primeira_batida };
}

// opcoes vai direto para batidas — na prática, { bpm } com a dica de ouvido.
export async function medir(arquivo, opcoes = {}) {
  if (!existsSync(arquivo)) throw new ErroAudio(`não achei ${arquivo}`);
  const { default: ffmpeg } = await import("ffmpeg-static");
  const taxa = 22050;
  const pedacos = [];
  await new Promise((ok, falha) => {
    const p = spawn(ffmpeg, ["-loglevel", "error", "-i", arquivo, "-ac", "1", "-ar", String(taxa), "-f", "f32le", "-"], { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout.on("data", (d) => pedacos.push(d));
    p.on("error", falha);
    p.on("close", (c) => (c === 0 ? ok() : falha(new ErroAudio(`ffmpeg não conseguiu ler ${arquivo}`))));
  });
  const buf = Buffer.concat(pedacos);
  const amostras = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  return { ...batidas(amostras, taxa, opcoes), duracao: Math.round((amostras.length / taxa) * 10) / 10 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "--medir") {
      if (!args[1] || args[1].startsWith("--")) throw new ErroAudio("uso: node scripts/audio.mjs --medir <arquivo> [--bpm <dica de ouvido>]");
      const opcoes = {};
      const i = args.indexOf("--bpm");
      if (i >= 0) {
        const dica = Number(args[i + 1]);
        if (!args[i + 1] || !(dica >= DICA_BPM.min && dica <= DICA_BPM.max)) throw new ErroAudio(`--bpm precisa de um número de ${DICA_BPM.min} a ${DICA_BPM.max} (o andamento que você contou de ouvido)`);
        opcoes.bpm = dica;
      }
      console.log(JSON.stringify(await medir(resolve(args[1]), opcoes)));
    } else {
      const b = carregarBiblioteca();
      const erros = validarBiblioteca(b);
      if (erros.length) throw new ErroAudio(`biblioteca.json inválida:\n- ${erros.join("\n- ")}`);
      console.log(`${b.trilhas.length} trilha(s), ${b.efeitos.length} efeito(s).`);
      for (const t of b.trilhas) console.log(`  trilha ${t.id}: ${t.clima.join("/")}, ${t.bpm} BPM, ${t.duracao} s — ${t.licenca}`);
      const faltam = usosSemEfeito(b);
      if (faltam.length) console.log(`aviso: nenhum efeito para ${faltam.join(", ")} — esses momentos saem sem som`);
      for (const a of arquivosAusentes(b)) console.log(`aviso: ${a}`);
    }
  } catch (e) {
    if (e instanceof ErroAudio) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
