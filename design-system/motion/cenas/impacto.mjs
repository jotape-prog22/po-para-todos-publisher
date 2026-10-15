// Cena "impacto": 1 a 4 palavras que batem na tela, uma por vez, em tamanho grande — o gancho do reel.
// Cada batida tem mola (passa do tamanho e assenta), um tremor leve e um clarão quase imperceptível
// (movimento.json → impacto; a pessoa achou fortes demais no protótipo); a palavra da vez é verde.
// Ritmo em movimento.json (ritmo.impacto); geometria no kit.layout.

import { checarTamanho } from "./comum.mjs";
import { usarFonte, caixa, escalar, linhasDe, digitar, escreverLinhas, duracaoEscrita } from "../escrita.mjs";
import { springStep, pulse, noise1, clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { palavras: 4, palavra: 14, apoio: 60 };
// Proporções do tamanho da fonte do título (não são px): quanto a palavra pode crescer e a entrelinha.
const CRESCER = 2.4, ENTRELINHA = 1.05;

export function validar(c, onde) {
  const erros = [];
  if (!Array.isArray(c.palavras) || !c.palavras.length || c.palavras.length > LIM.palavras) erros.push(`${onde}: "palavras" precisa de 1 a ${LIM.palavras} itens`);
  else c.palavras.forEach((w, i) => { const e = checarTamanho(`palavras[${i + 1}]`, w, LIM.palavra, onde); if (e) erros.push(e); });
  if (c.apoio != null) { const e = checarTamanho("apoio", c.apoio, LIM.apoio, onde); if (e) erros.push(e); }
  if (c.titulo) erros.push(`${onde}: impacto não tem "titulo" — a frase vai em "palavras"`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("impacto", movimento);
  const eventos = c.kicker ? [{ t: R.kicker, efeito: "digitar" }] : [];
  eventos.push(...c.palavras.map((_, i) => ({ t: r3(R.primeira + i * R.passo), efeito: "impacto" })));
  let fim = eventos.at(-1).t, fimEscrita = fim;
  if (c.apoio) {
    fim = r3(fim + R.apoio);
    eventos.push({ t: fim, efeito: "tick" });
    fimEscrita = r3(fim + duracaoEscrita(c.apoio, movimento));
  }
  return { fim, fimEscrita, eventos };
}

// Intensidade (0 a 1, já com o coeficiente de movimento.json) do clarão em t: o quadro o aplica
// depois da marca, para a caixa opaca do logo clarear junto com o resto.
export function clarao(c, t, kit) {
  const R = ritmoDe("impacto", kit.movimento), { clarao: k, meia_vida } = kit.movimento.impacto;
  const ultima = Math.max(-1, ...c.palavras.map((_, i) => R.primeira + i * R.passo).filter((b) => b <= t));
  const forca = ultima >= 0 ? pulse(t, ultima, meia_vida) : 0;
  return forca > 0.02 ? k * forca : 0;
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
  const total = palavras.length * f.line + apoio.length * F.corpo.line;
  const y0 = area.y + (area.h - total) / 2;
  const batidas = palavras.map((_, i) => R.primeira + i * R.passo);
  const ultima = Math.max(-1, ...batidas.filter((b) => b <= t));
  const forca = ultima >= 0 ? pulse(t, ultima, kit.movimento.impacto.meia_vida) : 0;

  if (c.kicker) digitar(ctx, linhasDe(ctx, F.kicker, c.kicker, area.w), F.kicker, area.x, y0 - F.kicker.line - gap, t, R.kicker, kit.cores.verdeSuave, { alinhar: "center", largura: area.w });

  ctx.save();
  const { tremor, passar, rampa, ruido } = kit.movimento.impacto;
  usarFonte(ctx, f);
  ctx.translate(noise1(t * ruido, 3) * tremor * forca, noise1(t * ruido, 4) * tremor * forca);
  palavras.forEach((w, i) => {
    const ti = batidas[i];
    if (t < ti) return;
    const repouso = ctx.measureText(w).width || 1;
    const s = Math.min(1 + passar * (1 - springStep(t - ti, m.freq, m.amortecimento)), Math.max(1, area.w / repouso));   // passa do tamanho, nunca da largura útil
    const daVez = i === palavras.length - 1 || t < batidas[i + 1];
    ctx.save();
    ctx.globalAlpha *= clamp((t - ti) / rampa);
    ctx.translate(area.x + area.w / 2, y0 + i * f.line + f.line / 2);
    ctx.scale(s, s);
    usarFonte(ctx, f);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = daVez ? kit.cores.verde : kit.cores.tinta;
    ctx.fillText(w, 0, 0);
    ctx.restore();
  });
  ctx.restore();


  if (apoio.length) escreverLinhas(ctx, apoio, F.corpo, area.x + area.w / 2, y0 + palavras.length * f.line, t, c.linha.fim, kit, { alinhar: "center", cor: kit.cores.tintaSuave });
}
