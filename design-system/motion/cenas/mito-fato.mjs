// Cena "mito-fato" (Chamada): a caneta escreve uma afirmação; depois de um suspense curto, um carimbo
// MITO (vermelho) ou FATO (verde) bate inclinado por cima, com mola. O resto do reel explica o porquê.
// Ritmo em movimento.json (ritmo.mito_fato).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { usarFonte, linhasDe, escreverLinhas, duracaoEscrita, escalar } from "../escrita.mjs";
import { springStep, clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { afirmacao: 90 };
const VEREDITOS = ["mito", "fato"];
// Proporções: tamanho da afirmação e do carimbo, inclinação (rad), de quanto o carimbo cai, a espessura
// da borda e as folgas da caixa do carimbo (frações do tamanho da fonte dele).
const TAMANHO = 1.1, CARIMBO = 1.5, INCLINAR = -0.2, CAIR = 1.4, BORDA = 0.08, FOLGA_LADO = 1, FOLGA_ALTURA = 0.3;

export function validar(c, onde) {
  const erros = [];
  if (!c.afirmacao) erros.push(`${onde}: "afirmacao" é obrigatória`);
  else { const e = checarTamanho("afirmacao", c.afirmacao, LIM.afirmacao, onde); if (e) erros.push(e); }
  if (!VEREDITOS.includes(c.veredito)) erros.push(`${onde}: "veredito" é "mito" ou "fato"`);
  if (c.titulo) erros.push(`${onde}: mito-fato não tem "titulo" — o texto vai em "afirmacao"`);
  return erros;
}

// O carimbo bate depois da escrita e de um suspense, nunca antes de carimbo_minimo.
function carimboEm(c, movimento) {
  const R = ritmoDe("mito_fato", movimento);
  return r3(Math.max(R.carimbo_minimo, R.afirmacao + duracaoEscrita(c.afirmacao, movimento) + R.antes_carimbo));
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("mito_fato", movimento), tc = carimboEm(c, movimento);
  return { fim: tc, fimEscrita: tc, eventos: [...eventosDoKicker(c, R), { t: R.afirmacao, efeito: "caneta" }, { t: tc, efeito: "impacto" }] };
}

export function desenhar(ctx, c, t, kit) {
  const { area } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("mito_fato", kit.movimento);
  const f = escalar(F.pergunta, F.pergunta.px * TAMANHO);
  const ls = linhasDe(ctx, f, c.afirmacao, area.w);
  const y0 = area.y + (area.h - ls.length * f.line) / 2, cx = area.x + area.w / 2;
  kickerAcima(ctx, c, t, R, y0, kit);
  escreverLinhas(ctx, ls, f, cx, y0, t, R.afirmacao, kit, { alinhar: "center", cor: cores.tinta });
  const tc = carimboEm(c, kit.movimento);
  if (t < tc) return;
  const fc = escalar(F.titulo, F.titulo.px * CARIMBO), palavra = c.veredito.toUpperCase();
  const cor = c.veredito === "mito" ? cores.vermelho : cores.verde;
  const m = kit.movimento.mola, s = 1 + (CAIR - 1) * (1 - springStep(t - tc, m.freq, m.amortecimento));
  usarFonte(ctx, fc);
  const w = ctx.measureText(palavra).width + fc.px * FOLGA_LADO, h = fc.line + fc.px * FOLGA_ALTURA;
  ctx.save();
  ctx.globalAlpha *= clamp((t - tc) / kit.movimento.impacto.rampa);
  ctx.translate(cx, y0 + ls.length * f.line); ctx.rotate(INCLINAR); ctx.scale(s, s);
  ctx.strokeStyle = cor; ctx.lineWidth = fc.px * BORDA;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = cor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(palavra, 0, 0);
  ctx.restore();
}
