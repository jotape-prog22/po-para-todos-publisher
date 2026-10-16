// Cena "desafio" (Chamada): a caneta escreve a pergunta e um relógio em anel conta de "segundos" até 0,
// com um tique por segundo e um sino no fim (o último segundo fica vermelho). A resposta vem na Cena
// seguinte — um desafio nunca fecha o reel (validarChamadas). Ritmo em movimento.json (ritmo.desafio).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { usarFonte, linhasDe, escreverLinhas, duracaoEscrita, escalar, entrada } from "../escrita.mjs";
import { clamp, r3, TAU } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 90, segundos: [3, 5] };
// Proporções: raio do anel (fração da largura útil), espessura (fração do raio), tamanho do número
// dentro (fração do raio) e a opacidade do trilho do anel.
const RAIO = 0.2, ESPESSURA = 0.09, NUMERO = 0.9, ALFA_TRILHO = 0.3;

export function validar(c, onde) {
  const erros = [];
  if (!c.pergunta) erros.push(`${onde}: "pergunta" é obrigatória`);
  else { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  if (!(Number.isInteger(c.segundos) && c.segundos >= LIM.segundos[0] && c.segundos <= LIM.segundos[1])) erros.push(`${onde}: "segundos" é um inteiro de ${LIM.segundos[0]} a ${LIM.segundos[1]}`);
  if (c.titulo) erros.push(`${onde}: desafio não tem "titulo" — o texto vai em "pergunta"`);
  return erros;
}

function inicioRelogio(c, movimento) {
  const R = ritmoDe("desafio", movimento);
  return r3(R.pergunta + duracaoEscrita(c.pergunta, movimento) + R.antes_relogio);
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("desafio", movimento), ini = inicioRelogio(c, movimento), fim = r3(ini + c.segundos);
  const eventos = [...eventosDoKicker(c, R), { t: R.pergunta, efeito: "caneta" }];
  for (let k = 0; k < c.segundos; k++) eventos.push({ t: r3(ini + k), efeito: "tick" });
  eventos.push({ t: fim, efeito: "sino" });
  return { fim, fimEscrita: fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("desafio", kit.movimento);
  const ls = linhasDe(ctx, F.pergunta, c.pergunta, area.w);
  const raio = area.w * RAIO, esp = raio * ESPESSURA;
  const total = ls.length * F.pergunta.line + gap * 3 + 2 * raio;
  const y0 = area.y + Math.max(0, (area.h - total) / 2), cx = area.x + area.w / 2;
  kickerAcima(ctx, c, t, R, y0, kit);
  escreverLinhas(ctx, ls, F.pergunta, cx, y0, t, R.pergunta, kit, { alinhar: "center", cor: cores.tinta });
  const ini = inicioRelogio(c, kit.movimento);
  if (t < ini) return;
  const cy = y0 + ls.length * F.pergunta.line + gap * 3 + raio;
  const passado = clamp(t - ini, 0, c.segundos), resta = Math.max(0, Math.ceil(c.segundos - passado - 1e-9));
  const fim = resta <= 1 && passado > 0;
  ctx.save();
  ctx.globalAlpha *= entrada(t, ini, kit);
  ctx.lineWidth = esp; ctx.lineCap = "round";
  ctx.save(); ctx.globalAlpha *= ALFA_TRILHO; ctx.strokeStyle = cores.tintaSuave;
  ctx.beginPath(); ctx.arc(cx, cy, raio, 0, TAU); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = fim ? cores.vermelho : cores.verde;
  const fracao = 1 - passado / c.segundos;
  if (fracao > 0) { ctx.beginPath(); ctx.arc(cx, cy, raio, -TAU / 4, -TAU / 4 + TAU * fracao); ctx.stroke(); }
  const fn = escalar(F.numero, Math.min(F.numero.px, raio * NUMERO));
  usarFonte(ctx, fn); ctx.fillStyle = fim ? cores.vermelho : cores.tinta; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(resta), cx, cy);
  ctx.restore();
}
