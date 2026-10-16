// Cena "impacto": 1 a 4 palavras grandes que entram na tela, uma por vez — Chamada e viradas do reel;
// a palavra da vez é verde. Ritmo em movimento.json (ritmo.impacto); geometria no kit.layout.
// Estilos (campo "estilo"): deslizar (padrão: entra de lado, alternando), trocar (uma palavra por vez no
// mesmo lugar, com mola), sublinhar (todas juntas, a caneta sublinha a "destaque"). O batida (tremor e
// clarão) e o crescer saíram depois da galeria de 16/10/2026: a pessoa não gostou.

import { checarTamanho } from "./comum.mjs";
import { usarFonte, caixa, escalar, linhasDe, digitar, escreverLinhas, duracaoEscrita, revelarTraco, entrada } from "../escrita.mjs";
import { springStep, clamp, r3, prog, ease } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { palavras: 4, palavra: 14, apoio: 60 };
// Proporções do tamanho da fonte do título (não são px): quanto a palavra pode crescer e a entrelinha.
const CRESCER = 2.4, ENTRELINHA = 1.05;
export const ESTILOS = ["deslizar", "trocar", "sublinhar"];
const SOM = { deslizar: "pop", trocar: "pop" };
const estiloDe = (c) => c.estilo ?? "deslizar";
const destaqueDe = (c) => c.destaque ?? c.palavras.length;
// Proporção: de onde o deslizar parte (fração da largura útil).
const DESLIZE = 0.35;

export function validar(c, onde) {
  const erros = [];
  if (!Array.isArray(c.palavras) || !c.palavras.length || c.palavras.length > LIM.palavras) erros.push(`${onde}: "palavras" precisa de 1 a ${LIM.palavras} itens`);
  else c.palavras.forEach((w, i) => { const e = checarTamanho(`palavras[${i + 1}]`, w, LIM.palavra, onde); if (e) erros.push(e); });
  if (c.apoio != null) { const e = checarTamanho("apoio", c.apoio, LIM.apoio, onde); if (e) erros.push(e); }
  if (c.titulo) erros.push(`${onde}: impacto não tem "titulo" — a frase vai em "palavras"`);
  if (c.estilo != null && !ESTILOS.includes(c.estilo)) erros.push(`${onde}: "estilo" deve ser um de: ${ESTILOS.join(", ")}`);
  if (c.destaque != null) {
    if (c.estilo !== "sublinhar") erros.push(`${onde}: "destaque" só vale com estilo "sublinhar"`);
    else if (!(Number.isInteger(c.destaque) && c.destaque >= 1 && c.destaque <= (c.palavras?.length ?? 0))) erros.push(`${onde}: "destaque" é o número de uma palavra (1 a ${c.palavras?.length ?? 0})`);
  }
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("impacto", movimento), estilo = estiloDe(c);
  const eventos = c.kicker ? [{ t: R.kicker, efeito: "digitar" }] : [];
  if (estilo === "sublinhar") eventos.push({ t: R.primeira, efeito: "pop" }, { t: r3(R.primeira + R.sublinhar), efeito: "caneta" });
  else eventos.push(...c.palavras.map((_, i) => ({ t: r3(R.primeira + i * R.passo), efeito: SOM[estilo] })));
  let fim = eventos.at(-1).t;
  let fimEscrita = estilo === "sublinhar" ? r3(fim + R.traco) : fim;
  if (c.apoio) {
    fim = r3(fimEscrita + R.apoio);
    eventos.push({ t: fim, efeito: "tick" });
    fimEscrita = r3(fim + duracaoEscrita(c.apoio, movimento));
  }
  return { fim, fimEscrita, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, m = kit.movimento.mola;
  const R = ritmoDe("impacto", kit.movimento);
  const palavras = c.palavras.map((w) => caixa({ caixaAlta: true }, w));
  usarFonte(ctx, F.titulo);
  const maior = Math.max(...palavras.map((w) => ctx.measureText(w).width));
  const px = Math.min(F.titulo.px * CRESCER, (F.titulo.px * area.w) / maior);
  const f = { ...escalar(F.titulo, px), line: px * ENTRELINHA };
  const apoio = c.apoio ? linhasDe(ctx, F.corpo, c.apoio, area.w) : [];
  const linhas = estiloDe(c) === "trocar" ? 1 : palavras.length;   // o trocar mostra uma palavra por vez, no mesmo lugar
  const total = linhas * f.line + apoio.length * F.corpo.line;
  const y0 = area.y + (area.h - total) / 2;
  const batidas = palavras.map((_, i) => R.primeira + i * R.passo);

  if (c.kicker) digitar(ctx, linhasDe(ctx, F.kicker, c.kicker, area.w), F.kicker, area.x, y0 - F.kicker.line - gap, t, R.kicker, kit.cores.verdeSuave, { alinhar: "center", largura: area.w });

  const estilo = estiloDe(c);
  const caber = (w) => Math.max(1, area.w / (ctx.measureText(w).width || 1));   // escala máxima que ainda cabe
  const yDe = (i) => y0 + (estilo === "trocar" ? 0 : i) * f.line + f.line / 2;
  const daVez = (i) => i === palavras.length - 1 || t < batidas[i + 1];
  const pintar = (w, i, { s = 1, dx = 0, alfa = 1, cor }) => {
    ctx.save();
    ctx.globalAlpha *= alfa;
    ctx.translate(area.x + area.w / 2 + dx, yDe(i));
    ctx.scale(s, s);
    usarFonte(ctx, f);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = cor;
    ctx.fillText(w, 0, 0);
    ctx.restore();
  };
  ctx.save();
  usarFonte(ctx, f);
  const { passar, rampa } = kit.movimento.impacto;
  if (estilo === "sublinhar") {
    const k = destaqueDe(c) - 1;
    if (t >= R.primeira) palavras.forEach((w, i) => pintar(w, i, { alfa: entrada(t, R.primeira, kit), cor: i === k ? kit.cores.verde : kit.cores.tinta }));
    const w = ctx.measureText(palavras[k]).width, cx = area.x + area.w / 2;
    const yb = y0 + k * f.line + f.line / 2 + f.px * 0.55;
    revelarTraco(ctx, [{ x: cx - w / 2, y: yb }, { x: cx + w / 2, y: yb }], prog(t, R.primeira + R.sublinhar, R.primeira + R.sublinhar + R.traco, ease.inOutCubic), kit, t, { cor: kit.cores.verde, largura: kit.movimento.desenho.conta.sublinhado });
  } else {
    palavras.forEach((w, i) => {
      const ti = batidas[i];
      if (t < ti) return;
      if (estilo === "trocar" && !daVez(i)) return;
      const cor = daVez(i) ? kit.cores.verde : kit.cores.tinta;
      if (estilo === "trocar") {
        const mola = 1 + passar * (1 - springStep(t - ti, m.freq, m.amortecimento));   // passa do tamanho, nunca da largura útil
        pintar(w, i, { s: Math.min(mola, caber(w)), alfa: clamp((t - ti) / rampa), cor });
      } else pintar(w, i, { dx: (i % 2 ? 1 : -1) * area.w * DESLIZE * (1 - entrada(t, ti, kit)), alfa: entrada(t, ti, kit), cor });
    });
  }
  ctx.restore();


  if (apoio.length) escreverLinhas(ctx, apoio, F.corpo, area.x + area.w / 2, y0 + linhas * f.line, t, c.linha.fim, kit, { alinhar: "center", cor: kit.cores.tintaSuave });
}
