#!/usr/bin/env node
// Gera os vídeos de uma sequência de stories (1080×1920, MP4 H.264 com som) a partir de
// instagram/<pasta>/stories.json: um vídeo por story, cada um uma Cena do motor de motion
// (design-system/motion: os tipos de Cena e as Chamadas — ver motion/GUIA.md).
// Story leva só Efeitos sonoros discretos, nunca Trilha (ADR-0012). O sticker (quiz, enquete, link) não
// sai daqui: a pessoa adiciona no app, no espaço livre acima do rodapé — o roteiro de qual sticker vai em
// cada story fica em stories.md, na mesma pasta.
//
// stories.json pode ter "publicacao": "api" (sem sticker: sai pela API,
// node scripts/instagram.mjs --publicar-stories) ou "manual" (padrão: com sticker, pelo app).
//
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta>          # story-NN.mp4 + story-NN.png (último quadro)
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --ver    # prévia no navegador, com som (Ctrl+C fecha)
//   node design-system/scripts/gerar-story-video.mjs instagram/<pasta> --so 2   # só o story 2
//
// htmlDaCena continua aqui: é o molde em HTML que a calibração (npm run calibrar) mostra. O motor mede
// o mesmo CSS, então calibrar o molde calibra o vídeo.

import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, esc } from "./modelo-html.mjs";
import { validarCena } from "../motion/cenas/index.mjs";
import { LIMITES_CENA, tamanho } from "../motion/cenas/comum.mjs";
import { LIMITES_TEXTO } from "../motion/cenas/texto.mjs";
import { montarComposicao } from "../motion/composicao.mjs";
import { renderizar as renderizarMotion, FPS } from "./motion/renderizar.mjs";
import { mixar as mixarAudio } from "./motion/mixagem.mjs";
import { verComposicoes } from "./motion/ver.mjs";
import { carregarBiblioteca } from "../../scripts/audio.mjs";
export { acharNavegador } from "./navegador.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const canal = JSON.parse(readFileSync(join(RAIZ, "canal.json"), "utf8"));

export class ErroStoryVideo extends Error {}
// Erro próprio do pipeline (ErroStoryVideo, ErroReel, ErroMotion, ErroAudio, ErroNavegador…): a CLI imprime `erro: …`; o resto (Error, ENOENT, bug) sobe com stack.
export const ehErroDoPipeline = (e) => /^Erro[A-Z]/.test(e?.constructor?.name ?? "");
export const USUARIO = canal.instagramUsuario;

export const LIMITES = {
  stories: { min: 1, max: 10 },
  duracao: LIMITES_CENA.duracao.story,
  fps: FPS,
  campos: { ...LIMITES_CENA.campos, ...LIMITES_TEXTO.campos },
  linhas: LIMITES_TEXTO.linhas,
  itens: LIMITES_TEXTO.itens,
  folga: LIMITES_CENA.folga.story,
};

export const PUBLICACOES = ["api", "manual"];   // api: sem sticker, sai pela API; manual: com sticker, pelo app (ADR-0007)

const existeIcone = (nome) => existsSync(join(DS, "miniaturas/icones", `${nome}.svg`));

// Valida uma lista de Cenas (stories ou Cenas de reel) e lança o primeiro erro.
export function validarCenas(lista, { formato = "story", rotulo = "story" } = {}) {
  return lista.map((s, i) => {
    const { erros, cena } = validarCena(s, `${rotulo} ${i + 1}`, { formato, existeIcone });
    if (erros.length) throw new ErroStoryVideo(erros[0]);
    return cena.tipo === "texto" ? { ...cena, linhas: cena.linhas ?? [], itens: cena.itens ?? [], tempos: cena.linha.tempos } : cena;
  });
}

export function validar(spec) {
  if (spec?.tipo !== "stories" || !Array.isArray(spec.stories)) throw new ErroStoryVideo('stories.json precisa de "tipo": "stories" e uma lista "stories"');
  if (spec.publicacao != null && !PUBLICACOES.includes(spec.publicacao)) throw new ErroStoryVideo(`"publicacao" deve ser "api" (sem sticker, sai pela API) ou "manual" (com sticker, pelo app)`);
  const { min, max } = LIMITES.stories;
  if (spec.stories.length < min || spec.stories.length > max) throw new ErroStoryVideo(`a sequência tem ${spec.stories.length} stories; o permitido é de ${min} a ${max}`);
  return validarCenas(spec.stories);
}

export function composicoesDeStories(spec) {
  const semSticker = spec.publicacao === "api";
  return validar(spec).map((c) => montarComposicao([c], { formato: "story", semSticker, usuario: USUARIO }));
}

// Grava uma composição em <pasta>/<base>.mp4 (+ .png) com o som mixado; a mixagem temporária some no fim.
export async function gravarComposicao(comp, { pasta, base, trilhaId = null, capaEm = null, renderizar = renderizarMotion, mixar = mixarAudio, biblioteca = carregarBiblioteca() }) {
  const tmp = mkdtempSync(join(tmpdir(), "mix-"));
  try {
    const audio = await mixar(comp, { biblioteca, trilhaId, saida: join(tmp, "mix.wav") });
    const mp4 = join(pasta, `${base}.mp4`);
    await renderizar(comp, { mp4, png: join(pasta, `${base}.png`), audio, capaEm });
    return mp4;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function gerarStoryVideo(pasta, { so = null, ver = false, ...injecoes } = {}) {
  const arquivo = join(pasta, "stories.json");
  if (!existsSync(arquivo)) throw new ErroStoryVideo(`não achei ${arquivo}`);
  const comps = composicoesDeStories(JSON.parse(readFileSync(arquivo, "utf8")));
  if (ver) return verComposicoes(comps.map((comp, i) => ({ nome: `story ${i + 1}`, comp })), injecoes);
  const saidas = [];
  for (const [i, comp] of comps.entries()) {
    if (so && so !== i + 1) continue;
    saidas.push(await gravarComposicao(comp, { pasta, base: `story-${String(i + 1).padStart(2, "0")}`, ...injecoes }));
  }
  return saidas;
}

// ---------- molde em HTML (calibração) ----------

const quebras = (s) => esc(s).replace(/\n/g, "<br>");

function conteudoHtml(s) {
  const { tempos: t } = s;
  const partes = [];
  if (s.kicker) partes.push(`    <p class="ig__kicker sv__anim" style="--t: ${t.kicker}s">${esc(s.kicker)}</p>`);
  if (s.titulo) partes.push(`    <h1 class="ig__titulo${tamanho(s.titulo) > 24 ? " ig__titulo--medio" : ""} sv__anim" style="--t: ${t.titulo}s">${quebras(s.titulo)}</h1>`);
  if (s.linhas.length) s.linhas.forEach((l, j) => partes.push(`    <p class="ig__corpo sv__anim" style="--t: ${t.blocos[j]}s">${quebras(l)}</p>`));
  if (s.itens.length) {
    partes.push(`    <ol class="sv__itens">`);
    s.itens.forEach((it, j) => partes.push(`      <li class="sv__item sv__anim" style="--t: ${t.blocos[j]}s"><span class="sv__item-numero">${j + 1}</span><h2 class="sv__item-titulo">${esc(it.titulo)}</h2><p class="sv__item-texto">${quebras(it.texto)}</p></li>`));
    partes.push(`    </ol>`);
  }
  if (s.pergunta) partes.push(`    <p class="sv__pergunta sv__anim" style="--t: ${t.pergunta}s">${quebras(s.pergunta)}</p>`);
  if (s.icone) partes.push(`    <div class="ig__icone sv__anim" style="--t: ${t.titulo}s"><img src="{{ds}}/miniaturas/icones/${esc(s.icone)}.svg" alt=""></div>`);
  return partes.join("\n");
}

export function htmlDaCena(s, ds, { semSticker = false, reel = false } = {}) {
  const modelo = readFileSync(join(DS, "instagram/layouts/story-cena.html"), "utf8");
  const conteudo = conteudoHtml(s).replace(/\{\{ds\}\}/g, ds);
  return preencher(modelo, {
    ds, conteudo, usuario: canal.instagramUsuario,
    classe_extra: `${semSticker ? " ig--sem-sticker" : ""}${reel ? " ig--reel-cena" : ""}`,
    titulo_pagina: `${s.kicker ?? ""} ${s.titulo ?? ""} — story`.trim(),
    dica: s.dica, dica_t: s.tempos.dica, faixa: s.faixa,
  }, { brutos: ["ds", "conteudo"] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const pasta = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  const so = args.includes("--so") ? Number(args[args.indexOf("--so") + 1]) : null;
  if (!pasta) { console.error("uso: node design-system/scripts/gerar-story-video.mjs instagram/<pasta> [--ver] [--so N]"); process.exit(1); }
  try {
    if (args.includes("--ver")) {
      const { url } = await gerarStoryVideo(resolve(pasta), { ver: true });
      console.log(`Abri a prévia no navegador: ${url}\nQuando terminar de olhar, feche aqui com Ctrl+C.`);
    } else {
      for (const s of await gerarStoryVideo(resolve(pasta), { so })) console.log(relative(RAIZ, s));
    }
  } catch (e) {
    if (ehErroDoPipeline(e)) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
