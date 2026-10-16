// Cena "spoiler" (Chamada): o resultado final do reel bate gigante logo de cara (com mola e um clarão
// leve, como o impacto) e embaixo sobe a pergunta "COMO?". O resto do reel explica. Campos do número
// iguais aos do odometro. Ritmo em movimento.json (ritmo.spoiler).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { formatar, validar as validarNumero } from "./odometro.mjs";
import { usarFonte, escalar, linhasDe, subir } from "../escrita.mjs";
import { springStep, pulse, clamp } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 20 };
// Proporções do número: quanto cresce sobre a fonte-base, quanto da largura ocupa, prefixo/sufixo menores.
const CRESCER = 2.0, OCUPAR = 0.92, MENOR = 0.4, AFASTAR = 0.06;

export function validar(c, onde) {
  const erros = validarNumero(c, onde);
  if (c.pergunta != null) { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  if (c.rotulo != null) erros.push(`${onde}: spoiler não tem "rotulo" — o texto embaixo do número é a "pergunta"`);
  if (c.titulo) erros.push(`${onde}: spoiler não tem "titulo" — o número é o destaque e a "pergunta" vem embaixo`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("spoiler", movimento);
  return { fim: R.pergunta, fimEscrita: R.pergunta, eventos: [...eventosDoKicker(c, R), { t: R.numero, efeito: "impacto" }, { t: R.pergunta, efeito: "pop" }] };
}

// Intensidade do clarão em t (ver impacto.clarao): só na batida do número.
export function clarao(c, t, kit) {
  const R = ritmoDe("spoiler", kit.movimento), { clarao: k, meia_vida } = kit.movimento.impacto;
  const forca = pulse(t, R.numero, meia_vida);
  return forca > 0.02 ? k * forca : 0;
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores, R = ritmoDe("spoiler", kit.movimento);
  const texto = formatar(c.valor, c.casas_decimais ?? 0);
  usarFonte(ctx, F.numero);
  const base = ctx.measureText(texto).width || 1;
  usarFonte(ctx, escalar(F.numero, F.numero.px * MENOR));
  const lado = (s) => (s ? ctx.measureText(s).width + F.numero.px * AFASTAR : 0);
  // O grupo (prefixo + número + sufixo) ocupa no máximo OCUPAR da largura útil.
  const px = Math.min(F.numero.px * CRESCER, (F.numero.px * area.w * OCUPAR) / (base + lado(c.prefixo) + lado(c.sufixo)));
  const f = escalar(F.numero, px), menor = escalar(F.numero, px * MENOR);
  const lp = linhasDe(ctx, F.titulo, c.pergunta ?? "COMO?", area.w);
  const total = f.line + gap * 2 + lp.length * F.titulo.line;
  const topo = area.y + (area.h - total) / 2, cy = topo + f.line / 2;
  kickerAcima(ctx, c, t, R, topo, kit);
  if (t >= R.numero) {
    const m = kit.movimento.mola, s = 1 + kit.movimento.impacto.passar * (1 - springStep(t - R.numero, m.freq, m.amortecimento));
    usarFonte(ctx, f); const wn = ctx.measureText(texto).width;
    usarFonte(ctx, menor);
    const wp = c.prefixo ? ctx.measureText(c.prefixo).width + px * AFASTAR : 0, ws = c.sufixo ? ctx.measureText(c.sufixo).width + px * AFASTAR : 0;
    const grupo = wp + wn + ws, escala = Math.min(s, Math.max(1, area.w / grupo));   // passa do tamanho, nunca da largura útil
    ctx.save();
    ctx.globalAlpha *= clamp((t - R.numero) / kit.movimento.impacto.rampa);
    ctx.translate(area.x + area.w / 2, cy); ctx.scale(escala, escala);
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const x0 = -grupo / 2;
    usarFonte(ctx, menor); ctx.fillStyle = cores.verdeSuave;
    if (c.prefixo) ctx.fillText(c.prefixo, x0, 0);
    if (c.sufixo) ctx.fillText(c.sufixo, x0 + wp + wn + px * AFASTAR, 0);
    usarFonte(ctx, f); ctx.fillStyle = cores.verde;
    ctx.fillText(texto, x0 + wp, 0);
    ctx.restore();
  }
  subir(ctx, lp, F.titulo, area.x, cy + f.line / 2 + gap * 2, t, R.pergunta, cores.tinta, kit, { alinhar: "center", largura: area.w });
}
