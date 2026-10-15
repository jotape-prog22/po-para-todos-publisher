// Composição: as Cenas validadas postas na linha do tempo do vídeo, com os eventos de som.
// Com Trilha, as trocas de Cena caem no compasso, sem encurtar nenhuma abaixo do seu mínimo.
// Só roda no Node (o navegador recebe a composição pronta).

import MOVIMENTO from "./movimento.mjs";
import { r3 } from "./util.mjs";
import { LIMITES_CENA } from "./cenas/comum.mjs";

export const CLASSES = {
  story: "ig ig--story ig--story-video",
  reel: "ig ig--story ig--story-video ig--sem-sticker ig--reel-cena",
  moldura: "ig ig--story ig--reel",
};

export function encaixarNaBatida(fronteiras, minimos, { bpm, primeira_batida }, compasso) {
  const barra = (compasso * 60) / bpm;
  const saida = [];
  let anterior = 0;
  fronteiras.forEach((f, i) => {
    let alvo = primeira_batida + Math.round((f - primeira_batida) / barra) * barra;
    if (alvo - anterior < minimos[i]) alvo = primeira_batida + Math.ceil((anterior + minimos[i] - primeira_batida) / barra) * barra;
    saida.push(r3(alvo));
    anterior = alvo;
  });
  return saida;
}

function espacar(efeitos) {
  const ordenados = [...efeitos].sort((a, b) => a.t - b.t);
  const ultimo = {};
  return ordenados.filter((e) => {
    if (ultimo[e.efeito] != null && e.t - ultimo[e.efeito] < MOVIMENTO.efeitos.intervalo_minimo) return false;
    ultimo[e.efeito] = e.t;
    return true;
  });
}

export function montarComposicao(cenas, { formato, semSticker = true, trilha = null, usuario = "" }) {
  let acumulado = 0;
  let fronteiras = cenas.map((c) => (acumulado = r3(acumulado + c.duracao)));
  // Nenhuma Cena abaixo do seu tempo de leitura nem do piso do formato (Cena de reel: 3 s).
  const piso = LIMITES_CENA.duracao[formato]?.min ?? 0;
  if (trilha) fronteiras = encaixarNaBatida(fronteiras, cenas.map((c) => Math.max(c.minimo, piso)), trilha, MOVIMENTO.trilha.compasso);
  let inicio = 0;
  const posicionadas = cenas.map((c, i) => { const p = { ...c, inicio, fim: fronteiras[i] }; inicio = fronteiras[i]; return p; });
  const ganho = formato === "story" ? MOVIMENTO.efeitos.ganho_story : MOVIMENTO.efeitos.ganho_reel;
  const efeitos = [];
  posicionadas.forEach((c, i) => {
    if (i > 0 && formato === "reel") efeitos.push({ t: c.inicio, efeito: "whoosh", ganho });
    for (const e of c.linha.eventos) if (c.inicio + e.t < c.fim) efeitos.push({ t: r3(c.inicio + e.t), efeito: e.efeito, ganho });
  });
  const classes = formato === "story" ? CLASSES.story + (semSticker ? " ig--sem-sticker" : "") : CLASSES[formato];
  return {
    formato, classes, usuario,
    duracao: fronteiras.at(-1),
    loop: formato === "reel" && !posicionadas.at(-1).faixa,
    cenas: posicionadas,
    efeitos: espacar(efeitos),
  };
}
