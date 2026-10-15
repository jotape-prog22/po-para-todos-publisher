// Cena "odometro": um número que gira até o valor (cada dígito um tambor; o da direita gira mais),
// para com um "pop" e ganha um rótulo escrito embaixo. Separadores em pt-BR (12.000; 3,5); ano e
// outros inteiros abaixo de 10 000 saem sem ponto de milhar (1736). Ritmo em movimento.json
// (ritmo.odometro e ritmo.cabecalho).

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, linhasDe, escreverLinhas, duracaoEscrita } from "../escrita.mjs";
import { ease, prog, clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { prefixo: 6, sufixo: 10, rotulo: 60, caracteres: 9 };
// Proporções do tamanho da fonte do número (não são px): quanto cresce, quanto da largura ocupa,
// tamanho do prefixo/sufixo, afastamento deste e folga lateral do tambor.
const CRESCER = 1.6, OCUPAR = 0.9, MENOR = 0.45, AFASTAR = 0.075, FOLGA = 0.03, ENTRELINHA = 1.1;

export function formatar(valor, casas = 0) {
  const agrupar = casas > 0 || Math.abs(valor) >= 10000;
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: agrupar });
}

export function validar(c, onde) {
  const erros = [];
  const casas = c.casas_decimais ?? 0;
  if (typeof c.valor !== "number" || !Number.isFinite(c.valor) || c.valor < 0) erros.push(`${onde}: "valor" precisa ser um número ≥ 0 (sem aspas)`);
  if (!Number.isInteger(casas) || casas < 0 || casas > 2) erros.push(`${onde}: "casas_decimais" vai de 0 a 2`);
  for (const k of ["prefixo", "sufixo", "rotulo"]) if (c[k] != null) { const e = checarTamanho(k, c[k], LIM[k], onde); if (e) erros.push(e); }
  if (!erros.length && formatar(c.valor, casas).length > LIM.caracteres) erros.push(`${onde}: "valor" tem dígitos demais para a tela (até ${LIM.caracteres} caracteres formatado)`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("odometro", movimento);
  const ini = inicioDoConteudo(c, movimento);
  const eventos = [...eventosDoCabecalho(c, movimento), { t: ini, efeito: "tick" }, { t: r3(ini + R.giro), efeito: "pop" }];
  let fim = r3(ini + R.giro), fimEscrita = fim;
  if (c.rotulo) {
    fim = r3(fim + R.rotulo);
    eventos.push({ t: fim, efeito: "tick" });
    fimEscrita = r3(fim + duracaoEscrita(c.rotulo, movimento));
  }
  return { fim, fimEscrita, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const F = kit.fontes, R = ritmoDe("odometro", kit.movimento);
  const caixaLivre = desenharCabecalho(ctx, c, t, kit);
  const ini = inicioDoConteudo(c, kit.movimento);
  const texto = formatar(c.valor, c.casas_decimais ?? 0);
  usarFonte(ctx, F.numero);
  const larguraBase = ctx.measureText(texto).width || 1;
  const px = Math.min(F.numero.px * CRESCER, (F.numero.px * caixaLivre.w * OCUPAR) / larguraBase);
  const f = { ...escalar(F.numero, px), line: px * ENTRELINHA };
  const rotulo = c.rotulo ? linhasDe(ctx, F.corpo, c.rotulo, caixaLivre.w) : [];
  const total = f.line + rotulo.length * F.corpo.line;
  const topo = caixaLivre.y + (caixaLivre.h - total) / 2;
  const cy = topo + f.line / 2;
  usarFonte(ctx, f);
  const largs = [...texto].map((ch) => ctx.measureText(ch).width);
  const larguraTotal = largs.reduce((a, b) => a + b, 0);
  let x = caixaLivre.x + (caixaLivre.w - larguraTotal) / 2;
  const digitos = [...texto].filter((ch) => /\d/.test(ch)).length;
  const aparecer = clamp((t - ini) / 0.2);
  if (aparecer <= 0) return;

  if (c.prefixo || c.sufixo) {
    const menor = escalar(f, px * MENOR), afastar = px * AFASTAR;
    usarFonte(ctx, menor); ctx.fillStyle = kit.cores.verdeSuave; ctx.textBaseline = "middle";
    ctx.save(); ctx.globalAlpha *= aparecer;
    if (c.prefixo) { ctx.textAlign = "right"; ctx.fillText(c.prefixo, x - afastar, cy); }
    if (c.sufixo) { ctx.textAlign = "left"; ctx.fillText(c.sufixo, x + larguraTotal + afastar, cy); }
    ctx.restore();
  }

  usarFonte(ctx, f);
  ctx.fillStyle = kit.cores.verde; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const folga = px * FOLGA;
  let k = 0;
  [...texto].forEach((ch, i) => {
    if (!/\d/.test(ch)) {
      ctx.save(); ctx.globalAlpha *= aparecer; ctx.fillText(ch, x, cy); ctx.restore();
      x += largs[i];
      return;
    }
    const alvo = Number(ch) + 10 * (1 + (digitos - 1 - k));   // o da direita dá mais voltas
    const p = prog(t, ini + k * R.escalonar, ini + R.giro, ease.outExpo);
    const pos = p * alvo, base = Math.floor(pos + 1e-9), frac = pos - base;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - folga, cy - f.line / 2, largs[i] + 2 * folga, f.line); ctx.clip();
    ctx.globalAlpha *= aparecer;
    ctx.fillText(String(base % 10), x, cy - frac * f.line);
    if (frac > 0.001) ctx.fillText(String((base + 1) % 10), x, cy + (1 - frac) * f.line);
    ctx.restore();
    x += largs[i];
    k++;
  });

  if (rotulo.length) escreverLinhas(ctx, rotulo, F.corpo, caixaLivre.x + caixaLivre.w / 2, topo + f.line, t, c.linha.fim, kit, { alinhar: "center", cor: kit.cores.tinta });
}
