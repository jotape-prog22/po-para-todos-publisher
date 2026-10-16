// Cena "riscado" (Chamada): "PARECE" e a crença comum sobem; a caneta risca a frase em vermelho, ela
// apaga, e "É" bate com a resposta em verde. A virada já no gancho. Ritmo em movimento.json (ritmo.riscado).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { usarFonte, linhasDe, subir, revelarTraco, escalar, entrada } from "../escrita.mjs";
import { prog, ease, clamp, springStep } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { parece: 40, e: 40 };
// Proporções: tamanho do "é" em relação ao título, quanto a frase riscada apaga e quanto o risco
// passa das pontas e se inclina (frações do tamanho da fonte da frase).
const MAIOR = 1.25, ALFA_RISCADA = 0.4, PASSAR_RISCO = 0.2, INCLINAR_RISCO = 0.1;

export function validar(c, onde) {
  const erros = [];
  for (const k of ["parece", "e"]) {
    if (!c[k]) erros.push(`${onde}: "${k}" é obrigatório`);
    else { const e = checarTamanho(k, c[k], LIM[k], onde); if (e) erros.push(e); }
  }
  if (c.titulo) erros.push(`${onde}: riscado não tem "titulo" — use "parece" e "e"`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("riscado", movimento);
  return { fim: R.e, fimEscrita: R.e, eventos: [...eventosDoKicker(c, R), { t: R.parece, efeito: "pop" }, { t: R.risco, efeito: "caneta" }, { t: R.e, efeito: "impacto" }] };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("riscado", kit.movimento);
  const fp = F.tituloMedio, fe = escalar(F.titulo, F.titulo.px * MAIOR);
  const lp = linhasDe(ctx, fp, c.parece, area.w), le = linhasDe(ctx, fe, c.e, area.w);
  const total = 2 * (F.kicker.line + gap) + lp.length * fp.line + gap * 2 + le.length * fe.line;
  let y = area.y + Math.max(0, (area.h - total) / 2);
  const cx = area.x + area.w / 2;
  kickerAcima(ctx, c, t, R, y, kit);
  const rotulo = (s, yy, t0) => {
    if (t < t0) return;
    ctx.save();
    usarFonte(ctx, F.kicker); ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.globalAlpha *= entrada(t, t0, kit); ctx.fillText(s, cx, yy);
    ctx.restore();
  };
  rotulo("PARECE", y, R.parece);
  y += F.kicker.line + gap;
  ctx.save();
  ctx.globalAlpha *= 1 - (1 - ALFA_RISCADA) * prog(t, R.risco + R.traco, R.risco + R.traco + R.apagar);
  subir(ctx, lp, fp, area.x, y, t, R.parece, cores.tinta, kit, { alinhar: "center", largura: area.w });
  ctx.restore();
  // O risco, linha por linha, passa um pouco das pontas da frase sem sair da área útil.
  usarFonte(ctx, fp);
  const passar = fp.px * PASSAR_RISCO, inclinar = fp.px * INCLINAR_RISCO;
  lp.forEach((l, k) => {
    const w = ctx.measureText(l).width, ym = y + k * fp.line + fp.line / 2;
    const x0 = Math.max(area.x, cx - w / 2 - passar), x1 = Math.min(area.x + area.w, cx + w / 2 + passar);
    const p = prog(t, R.risco + (k * R.traco) / lp.length, R.risco + ((k + 1) * R.traco) / lp.length, ease.inOutCubic);
    revelarTraco(ctx, [{ x: x0, y: ym + inclinar }, { x: x1, y: ym - inclinar }], p, kit, t, { cor: cores.vermelho, largura: kit.movimento.desenho.conta.sublinhado });
  });
  y += lp.length * fp.line + gap * 2;
  rotulo("É", y, R.e);
  y += F.kicker.line + gap;
  if (t < R.e) return;
  const m = kit.movimento.mola, s = 1 + kit.movimento.impacto.passar * (1 - springStep(t - R.e, m.freq, m.amortecimento));
  ctx.save();
  ctx.globalAlpha *= clamp((t - R.e) / kit.movimento.impacto.rampa);
  usarFonte(ctx, fe); ctx.fillStyle = cores.verde; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  le.forEach((l, k) => {
    const caber = Math.max(1, area.w / (ctx.measureText(l).width || 1));   // passa do tamanho, nunca da largura útil
    ctx.save(); ctx.translate(cx, y + k * fe.line + fe.line / 2); ctx.scale(Math.min(s, caber), Math.min(s, caber)); ctx.fillText(l, 0, 0); ctx.restore();
  });
  ctx.restore();
}
