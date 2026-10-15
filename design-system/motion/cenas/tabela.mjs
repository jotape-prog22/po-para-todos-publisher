// Cena "tabela": as linhas da grade se desenham, o cabeçalho aparece e cada linha da tabela entra
// em seguida; a célula de destaque ganha uma moldura verde desenhada pela caneta.
// Ritmo em movimento.json (ritmo.tabela); altura mínima da linha, espessuras, recuo da moldura e
// subida das células em desenho.tabela. Células saem como o autor escreveu; o cabeçalho, em caixa alta.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, caixa, linhasDe, escreverLinhas, duracaoEscrita, revelarTraco } from "../escrita.mjs";
import { prog, ease, clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = true;
const LIM = { colunas: [2, 4], linhas: [1, 6], celula: 12, nota: 60 };
// Proporções (não são px): quanto da coluna a célula mais larga pode ocupar, altura da linha em
// relação à fonte da célula, opacidade da linha do cabeçalho, das outras linhas e do fundo do destaque.
const OCUPAR = 0.85, ALTURA = 2.1, OPACIDADE_CABECALHO = 0.9, OPACIDADE_GRADE = 0.4, OPACIDADE_FUNDO = 0.15;

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  const cols = Array.isArray(c.colunas) ? c.colunas : [], lins = Array.isArray(c.linhas) ? c.linhas : [];
  if (cols.length < LIM.colunas[0] || cols.length > LIM.colunas[1]) erros.push(`${onde}: a tabela precisa de ${LIM.colunas[0]} a ${LIM.colunas[1]} colunas`);
  cols.forEach((s, j) => add(checarTamanho(`colunas[${j + 1}]`, s, LIM.celula, onde)));
  if (lins.length < LIM.linhas[0] || lins.length > LIM.linhas[1]) erros.push(`${onde}: a tabela precisa de ${LIM.linhas[0]} a ${LIM.linhas[1]} linhas`);
  lins.forEach((l, i) => {
    if (!Array.isArray(l) || l.length !== cols.length) { erros.push(`${onde}: linhas[${i + 1}] tem ${Array.isArray(l) ? l.length : 0} células; as colunas são ${cols.length}`); return; }
    l.forEach((s, j) => add(checarTamanho(`célula (${i + 1}, ${j + 1})`, String(s), LIM.celula, onde)));
  });
  if (c.destaque != null) {
    const { linha, coluna } = c.destaque;
    if (!(Number.isInteger(linha) && Number.isInteger(coluna) && linha >= 1 && linha <= lins.length && coluna >= 1 && coluna <= cols.length)) erros.push(`${onde}: "destaque" fora da tabela (linha 1 a ${lins.length}, coluna 1 a ${cols.length})`);
  }
  if (c.nota != null) add(checarTamanho("nota", c.nota, LIM.nota, onde));
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("tabela", movimento);
  const ini = inicioDoConteudo(c, movimento);
  const linhas = c.linhas.map((_, i) => r3(ini + R.primeira + i * R.linha));
  const destaque = c.destaque ? r3(linhas.at(-1) + R.destaque) : null;
  const fimMoldura = destaque != null ? r3(destaque + R.moldura) : null;
  const nota = c.nota ? r3((fimMoldura ?? linhas.at(-1)) + R.nota) : null;
  return { R, ini, linhas, destaque, fimMoldura, nota };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const tp = tempos(c, movimento);
  const eventos = [...eventosDoCabecalho(c, movimento), { t: tp.ini, efeito: "digitar" }, ...tp.linhas.map((t) => ({ t, efeito: "tick" }))];
  if (tp.destaque != null) eventos.push({ t: tp.destaque, efeito: "pop" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  const fim = tp.nota ?? tp.destaque ?? tp.linhas.at(-1);
  // A caneta só desenha a moldura e escreve a nota (a grade sai sem caneta).
  const fimEscrita = tp.nota != null ? r3(tp.nota + duracaoEscrita(c.nota, movimento)) : (tp.fimMoldura ?? fim);
  return { fim, fimEscrita, eventos, tempos: { linhas: tp.linhas, destaque: tp.destaque, nota: tp.nota } };
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores, D = kit.movimento.desenho.tabela;
  const tp = tempos(c, kit.movimento), R = tp.R;
  const nCols = c.colunas.length, colW = livre.w / nCols;
  // fonte das células: a do corpo, encolhida se a célula mais larga não couber
  usarFonte(ctx, F.corpo);
  const maior = Math.max(...c.linhas.flat().map((s) => ctx.measureText(String(s)).width), 1);
  const fCel = escalar(F.corpo, Math.min(F.corpo.px, (F.corpo.px * colW * OCUPAR) / maior));
  const fCab = escalar(F.kicker, Math.min(F.kicker.px, fCel.px));
  const altLinha = Math.max(fCel.px * ALTURA, D.linha_minima);
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const total = (c.linhas.length + 1) * altLinha + (nota.length ? kit.layout.gap + nota.length * F.corpo.line : 0);
  const y0 = livre.y + (livre.h - total) / 2;
  const xCel = (j) => livre.x + j * colW;
  const meioY = (i) => y0 + i * altLinha + altLinha / 2;

  // linhas horizontais da grade (a de baixo do cabeçalho mais forte)
  const pGrade = prog(t, tp.ini, tp.ini + R.grade, ease.inOutCubic);
  for (let i = 1; i <= c.linhas.length; i++) {
    ctx.save(); ctx.globalAlpha *= i === 1 ? OPACIDADE_CABECALHO : OPACIDADE_GRADE;
    revelarTraco(ctx, [{ x: livre.x, y: y0 + i * altLinha }, { x: livre.x + livre.w, y: y0 + i * altLinha }], pGrade, kit, t, { cor: cores.tintaSuave, largura: i === 1 ? D.cabecalho : D.grade, comCaneta: false });
    ctx.restore();
  }

  // cabeçalho
  usarFonte(ctx, fCab); ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  c.colunas.forEach((s, j) => {
    const p = clamp((t - tp.ini - j * R.passo_coluna) / R.cabecalho);
    if (p <= 0 || !s) return;
    ctx.save(); ctx.globalAlpha *= p; ctx.fillText(caixa(fCab, s), xCel(j) + colW / 2, meioY(0)); ctx.restore();
  });

  // células, linha por linha
  usarFonte(ctx, fCel);
  c.linhas.forEach((l, i) => {
    l.forEach((s, j) => {
      const t0 = tp.linhas[i] + j * R.passo_coluna;
      const p = prog(t, t0, t0 + R.celula, ease.outExpo);
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p;
      ctx.fillStyle = j === 0 && !c.colunas[0] ? cores.tintaSuave : cores.tinta;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(s), xCel(j) + colW / 2, meioY(i + 1) + (1 - p) * D.subida);
      ctx.restore();
    });
  });

  // destaque
  if (c.destaque && tp.destaque != null) {
    const { linha, coluna } = c.destaque, r = D.recuo_moldura;
    const x = xCel(coluna - 1) + r, y = y0 + linha * altLinha + r, w = colW - 2 * r, h = altLinha - 2 * r;
    const p = prog(t, tp.destaque, tp.fimMoldura, ease.inOutCubic);
    if (p >= 1) { ctx.save(); ctx.globalAlpha *= OPACIDADE_FUNDO; ctx.fillStyle = cores.verde; ctx.fillRect(x, y, w, h); ctx.restore(); }
    revelarTraco(ctx, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }], p, kit, t, { cor: cores.verde, largura: D.moldura });
  }

  if (nota.length) escreverLinhas(ctx, nota, F.corpo, livre.x + livre.w / 2, y0 + (c.linhas.length + 1) * altLinha + kit.layout.gap, t, tp.nota, kit, { alinhar: "center", cor: cores.tintaSuave });
}
