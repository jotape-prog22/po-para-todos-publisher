// Ferramentas de escrita das Cenas: quebrar texto, aplicar fonte, entrada com easing, a caneta e as
// revelações (digitar letra a letra, subir por trás de uma máscara, escrever com a caneta, revelar traço).
// Cores e fontes chegam no kit (medidas do CSS); nada de valor fixo aqui.

import { clamp, ease, prog, noise1, polylineLengths, pointAtLength, TAU } from "./util.mjs";

export function quebrarLinhas(medir, texto, largura) {
  const saida = [];
  for (const paragrafo of String(texto ?? "").split("\n")) {
    let linha = "";
    for (const p of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${p}` : p;
      if (linha && medir(tentativa) > largura) { saida.push(linha); linha = p; } else linha = tentativa;
    }
    saida.push(linha);
  }
  return saida;
}

export function usarFonte(ctx, f) { ctx.font = f.css; ctx.letterSpacing = f.espaco ?? "0px"; }
export const caixa = (f, s) => (f.caixaAlta ? String(s).toLocaleUpperCase("pt-BR") : String(s));
// Linha de base dentro da caixa de uma linha (a entrelinha divide o respiro em cima e embaixo, como no CSS).
export const linhaBase = (f) => (f.line - f.px) / 2 + f.px * 0.8;
export const entrada = (t, t0, kit, dur = kit.movimento.duracoes.entrada) => prog(t, t0, t0 + dur, ease[kit.movimento.curvas.entrada]);
// A mesma fonte noutro tamanho, mantendo a proporção da entrelinha.
export const escalar = (f, px) => ({ ...f, css: f.css.replace(/\d+(\.\d+)?px/, `${px}px`), px, line: px * (f.line / f.px) });

export function linhasDe(ctx, f, s, largura) {
  usarFonte(ctx, f);
  return quebrarLinhas((x) => ctx.measureText(x).width, caixa(f, s), largura);
}

// A ponta da caneta: brilho verde suave com um núcleo branco, tremendo de leve.
export function caneta(ctx, x, y, t, kit) {
  const r = kit.movimento.caneta.raio;
  const cx = x + noise1(t * 9, 1) * 2, cy = y + noise1(t * 9, 2) * 2;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
  g.addColorStop(0, kit.cores.verdeSuave);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 3, 0, TAU); ctx.fill();
  ctx.fillStyle = kit.cores.tinta;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, TAU); ctx.fill();
  ctx.restore();
}

// Letra a letra, a partir de t0 (kicker).
export function digitar(ctx, linhas, f, x, y, t, t0, cor, { porLetra = 0.03, alinhar = "left", largura = 0 } = {}) {
  usarFonte(ctx, f);
  ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.textBaseline = "alphabetic";
  let resta = Math.floor(clamp((t - t0) / porLetra, 0, 1e6));
  linhas.forEach((l, k) => {
    if (resta <= 0) return;
    ctx.fillText(l.slice(0, resta), alinhar === "center" ? x + largura / 2 : x, y + k * f.line + linhaBase(f));
    resta -= l.length;
  });
}

// Cada linha sobe de trás de uma máscara do tamanho da linha, uma depois da outra (títulos).
export function subir(ctx, linhas, f, x, y, t, t0, cor, kit, { atraso = 0.08, alinhar = "left", largura = 0 } = {}) {
  usarFonte(ctx, f);
  ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.textBaseline = "alphabetic";
  const xx = alinhar === "center" ? x + largura / 2 : x;
  linhas.forEach((l, k) => {
    const p = entrada(t, t0 + k * atraso, kit);
    if (p <= 0) return;
    const topo = y + k * f.line;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 40, topo, (largura || 4000) + 80, f.line); ctx.clip();
    ctx.fillText(l, xx, topo + linhaBase(f) + (1 - p) * f.line);
    ctx.restore();
  });
}

// Revela uma linha de texto da esquerda para a direita (p de 0 a 1), com a caneta na borda.
export function escrever(ctx, s, x, yBase, p, kit, t, { alinhar = "left", comCaneta = true } = {}) {
  if (p <= 0) return;
  const w = ctx.measureText(s).width;
  const x0 = alinhar === "center" ? x - w / 2 : x;
  ctx.save();
  ctx.textAlign = "left";
  if (p < 1) { ctx.beginPath(); ctx.rect(x0 - 8, yBase - 1000, w * p + 8, 1400); ctx.clip(); }
  ctx.fillText(s, x0, yBase);
  ctx.restore();
  if (comCaneta && p < 1) caneta(ctx, x0 + w * p, yBase - ctx.measureText("x").width * 0.6, t, kit);
}

// Quanto tempo a caneta leva para escrever uma linha: escrita_por_caractere × caracteres, com um
// mínimo (escrita_minima) para linha curta não piscar. Serve à linha do tempo (sem kit) e ao desenho.
export const duracaoEscrita = (s, movimento) =>
  Math.max(movimento.duracoes.escrita_minima, String(s).length * movimento.duracoes.escrita_por_caractere);

// Escreve as linhas de um bloco com a caneta, uma depois da outra, a partir de t0; a linha k fica
// em y + k × f.line. O bloco todo leva duracaoEscrita do texto de antes da quebra (linhas unidas por
// espaço), repartida pelas linhas na proporção dos caracteres: assim a linha do tempo, que não sabe
// onde o texto quebra, sabe quando a escrita termina (t0 + duracaoEscrita(texto)). Devolve esse instante.
export function escreverLinhas(ctx, linhas, f, x, y, t, t0, kit, { alinhar = "left", cor, comCaneta = true } = {}) {
  usarFonte(ctx, f);
  if (cor) ctx.fillStyle = cor;
  ctx.textBaseline = "alphabetic";
  const texto = linhas.join(" ");
  const total = duracaoEscrita(texto, kit.movimento);
  let inicio = t0;
  linhas.forEach((l, k) => {
    const dur = (total * (l.length + (k < linhas.length - 1 ? 1 : 0))) / Math.max(1, texto.length);
    escrever(ctx, l, x, y + k * f.line + linhaBase(f), dur > 0 ? (t - inicio) / dur : 1, kit, t, { alinhar, comCaneta });
    inicio += dur;
  });
  return t0 + total;
}

// Desenha a polilinha até a fração p do comprimento, com a caneta na ponta.
export function revelarTraco(ctx, pts, p, kit, t, { cor, largura = 6, comCaneta = true } = {}) {
  if (p <= 0 || pts.length < 2) return;
  const L = polylineLengths(pts);
  const s = L[L.length - 1] * clamp(p);
  ctx.save();
  ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length && L[i] <= s; i++) ctx.lineTo(pts[i].x, pts[i].y);
  const cab = pointAtLength(pts, L, s);
  ctx.lineTo(cab.x, cab.y);
  ctx.stroke();
  ctx.restore();
  if (comCaneta && p < 1) caneta(ctx, cab.x, cab.y, t, kit);
}
