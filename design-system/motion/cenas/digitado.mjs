// Cena "digitado" (Chamada): uma frase calma digitada letra a letra, com cursor piscando; depois um
// marca-texto verde passa sobre a "marca". Para temas sérios. Ritmo em movimento.json (ritmo.digitado).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { usarFonte, quebrarLinhas, escalar, linhaBase } from "../escrita.mjs";
import { prog, ease, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { frase: 90, marca: 30 };
// Proporções: tamanho da frase em relação à fonte da pergunta, a opacidade do marca-texto, a altura
// dele (fração da entrelinha) e o tamanho do cursor (frações do tamanho da fonte).
const TAMANHO = 1.2, ALFA_MARCA = 0.4, MARCA_TOPO = 0.12, MARCA_ALTURA = 0.76, MARCA_SOBRA = 0.06;
const CURSOR_LARGURA = 0.1, CURSOR_ALTURA = 0.9, CURSOR_SOBE = 0.8, CURSOR_RECUO = 0.06;

export function validar(c, onde) {
  const erros = [];
  if (!c.frase) erros.push(`${onde}: "frase" é obrigatória`);
  else { const e = checarTamanho("frase", c.frase, LIM.frase, onde); if (e) erros.push(e); }
  if (c.marca != null) {
    const e = checarTamanho("marca", c.marca, LIM.marca, onde);
    if (e) erros.push(e);
    else if (!String(c.marca).trim() || !String(c.frase ?? "").includes(c.marca)) erros.push(`${onde}: "marca" precisa ser um trecho de "frase"`);
  }
  if (c.titulo) erros.push(`${onde}: digitado não tem "titulo" — o texto vai em "frase"`);
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("digitado", movimento);
  const fimLetras = r3(R.inicio + c.frase.length * R.por_letra);
  const marca = c.marca ? r3(fimLetras + R.marca) : null;
  return { R, fimLetras, marca };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const { R, fimLetras, marca } = tempos(c, movimento);
  const eventos = [...eventosDoKicker(c, R), { t: R.inicio, efeito: "digitar" }];
  if (marca != null) eventos.push({ t: marca, efeito: "caneta" });
  return { fim: marca ?? fimLetras, fimEscrita: marca != null ? r3(marca + R.traco) : fimLetras, eventos };
}

// As palavras da frase, na ordem, com a posição de cada uma no texto original e se ela cai no trecho
// da marca (a primeira ocorrência): assim a marca sobrevive à quebra de linha e uma palavra repetida
// fora dela não acende.
function palavrasMarcadas(frase, marca) {
  const i0 = marca ? frase.indexOf(marca) : -1, i1 = i0 + (marca?.length ?? 0);
  return [...frase.matchAll(/\S+/g)].map((m) => ({ w: m[0], marcada: i0 >= 0 && m.index < i1 && m.index + m[0].length > i0 }));
}

export function desenhar(ctx, c, t, kit) {
  const { area } = kit.layout, cores = kit.cores;
  const { R, marca } = tempos(c, kit.movimento);
  const f = escalar(kit.fontes.pergunta, kit.fontes.pergunta.px * TAMANHO);
  usarFonte(ctx, f);
  const medir = (s) => ctx.measureText(s).width;
  const linhas = quebrarLinhas(medir, c.frase, area.w);
  const y0 = area.y + (area.h - linhas.length * f.line) / 2;
  const x0 = (l) => area.x + (area.w - medir(l)) / 2;   // centralizado pela linha inteira: o texto não "anda" enquanto digita
  kickerAcima(ctx, c, t, R, y0, kit);
  usarFonte(ctx, f);
  // Marca-texto por baixo do texto: cada palavra do trecho, na linha em que estiver.
  if (marca != null && t >= marca) {
    const p = prog(t, marca, marca + R.traco, ease.inOutCubic), sobra = f.px * MARCA_SOBRA;
    const palavras = palavrasMarcadas(c.frase, c.marca);
    let n = 0;
    ctx.save(); ctx.globalAlpha *= ALFA_MARCA; ctx.fillStyle = cores.verde;
    linhas.forEach((l, k) => {
      let x = x0(l);
      for (const w of l.split(" ")) {
        if (palavras[n++]?.marcada) ctx.fillRect(x - sobra, y0 + k * f.line + f.line * MARCA_TOPO, (medir(w) + 2 * sobra) * p, f.line * MARCA_ALTURA);
        x += medir(w + " ");
      }
    });
    ctx.restore();
  }
  let resta = Math.max(0, Math.floor((t - R.inicio) / R.por_letra + 1e-6));   // a tolerância: 10 × 0,045 s não pode virar 9 letras
  ctx.fillStyle = cores.tinta; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let cursor = null;
  linhas.forEach((l, k) => {
    if (resta <= 0 && cursor) return;
    const parte = l.slice(0, Math.max(0, resta));
    const yb = y0 + k * f.line + linhaBase(f);
    if (parte) ctx.fillText(parte, x0(l), yb);
    if (resta <= l.length && !cursor) cursor = { x: x0(l) + medir(parte), yb };
    resta -= l.length + 1;
  });
  const piscando = Math.floor(t / R.piscar) % 2 === 0;
  if (cursor && t >= R.inicio && piscando) {
    ctx.fillStyle = cores.verde;
    ctx.fillRect(Math.min(cursor.x + f.px * CURSOR_RECUO, area.x + area.w - f.px * CURSOR_LARGURA), cursor.yb - f.px * CURSOR_SOBE, f.px * CURSOR_LARGURA, f.px * CURSOR_ALTURA);
  }
}
