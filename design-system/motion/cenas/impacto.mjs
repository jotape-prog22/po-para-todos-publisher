// Cena "impacto": 1 a 4 palavras que batem na tela, uma por vez, em tamanho grande — o gancho do reel.
// Cada batida tem mola (passa do tamanho e assenta), um tremor leve e um clarão quase imperceptível
// (movimento.json → impacto; a pessoa achou fortes demais no protótipo); a palavra da vez é verde.
// Ritmo em movimento.json (ritmo.impacto); geometria no kit.layout.
// Estilos (campo "estilo"): batida (padrão: mola, tremor, clarão), deslizar (entra de lado, alternando), trocar (uma palavra por vez no mesmo lugar), crescer (nasce pequena e cresce devagar), sublinhar (todas juntas, a caneta sublinha a "destaque").

import { checarTamanho } from "./comum.mjs";
import { usarFonte, caixa, escalar, linhasDe, digitar, escreverLinhas, duracaoEscrita, revelarTraco, entrada } from "../escrita.mjs";
import { springStep, pulse, noise1, clamp, r3, prog, ease } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { palavras: 4, palavra: 14, apoio: 60 };
// Proporções do tamanho da fonte do título (não são px): quanto a palavra pode crescer e a entrelinha.
const CRESCER = 2.4, ENTRELINHA = 1.05;
export const ESTILOS = ["batida", "deslizar", "trocar", "crescer", "sublinhar"];
const SOM = { batida: "impacto", deslizar: "pop", trocar: "pop", crescer: "tick" };
const estiloDe = (c) => c.estilo ?? "batida";
const destaqueDe = (c) => c.destaque ?? c.palavras.length;
// Proporções: de onde o deslizar parte (fração da largura útil) e o tamanho inicial do crescer.
const DESLIZE = 0.35, NASCER = 0.6;

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

// Intensidade (0 a 1, já com o coeficiente de movimento.json) do clarão em t: o quadro o aplica
// depois da marca, para a caixa opaca do logo clarear junto com o resto.
export function clarao(c, t, kit) {
  if (estiloDe(c) !== "batida") return 0;
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

  const estilo = estiloDe(c);
  const caber = (w) => Math.max(1, area.w / (ctx.measureText(w).width || 1));   // escala máxima que ainda cabe
  const yDe = (i) => (estilo === "trocar" ? area.y + area.h / 2 : y0 + i * f.line + f.line / 2);
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
  const { tremor, passar, rampa, ruido } = kit.movimento.impacto;
  if (estilo === "batida") ctx.translate(noise1(t * ruido, 3) * tremor * forca, noise1(t * ruido, 4) * tremor * forca);
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
      const mola = 1 + passar * (1 - springStep(t - ti, m.freq, m.amortecimento));   // passa do tamanho, nunca da largura útil
      if (estilo === "batida" || estilo === "trocar") pintar(w, i, { s: Math.min(mola, caber(w)), alfa: clamp((t - ti) / rampa), cor });
      else if (estilo === "deslizar") pintar(w, i, { dx: (i % 2 ? 1 : -1) * area.w * DESLIZE * (1 - entrada(t, ti, kit)), alfa: entrada(t, ti, kit), cor });
      else if (estilo === "crescer") {
        const s = (NASCER + (1 - NASCER) * prog(t, ti, ti + R.crescer, ease.outCubic)) * (1 + R.zoom_lento * Math.max(0, t - ti));
        pintar(w, i, { s: Math.min(s, caber(w)), alfa: clamp((t - ti) / rampa), cor });
      }
    });
  }
  ctx.restore();


  if (apoio.length) escreverLinhas(ctx, apoio, F.corpo, area.x + area.w / 2, y0 + palavras.length * f.line, t, c.linha.fim, kit, { alinhar: "center", cor: kit.cores.tintaSuave });
}
