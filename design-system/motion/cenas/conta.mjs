// Cena "conta": até 5 linhas de conta escritas pela caneta, uma de cada vez, na fonte da conta
// (Baloo 2); a linha de destaque sai verde e ganha um sublinhado desenhado; uma nota fecha.
// Ritmo em movimento.json (ritmo.conta); sublinhado em desenho.conta. Linha que não cabe na largura
// encolhe a fonte de todas (uma conta não quebra no meio).

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, linhasDe, escreverLinhas, duracaoEscrita, revelarTraco, linhaBase } from "../escrita.mjs";
import { prog, ease, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = true;
const LIM = { linhas: [1, 5], linha: 32, nota: 60 };

export function validar(c, onde) {
  const erros = [];
  const linhas = Array.isArray(c.linhas) ? c.linhas : [];
  if (linhas.length < LIM.linhas[0] || linhas.length > LIM.linhas[1]) erros.push(`${onde}: "conta" precisa de ${LIM.linhas[0]} a ${LIM.linhas[1]} linhas`);
  linhas.forEach((l, i) => { const e = checarTamanho(`linhas[${i + 1}]`, l, LIM.linha, onde); if (e) erros.push(e); });
  if (c.destaque != null && !(Number.isInteger(c.destaque) && c.destaque >= 1 && c.destaque <= linhas.length)) erros.push(`${onde}: "destaque" é o número de uma linha (1 a ${linhas.length})`);
  if (c.nota != null) { const e = checarTamanho("nota", c.nota, LIM.nota, onde); if (e) erros.push(e); }
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("conta", movimento);
  let t = inicioDoConteudo(c, movimento);
  const linhas = c.linhas.map((l) => { const r = { t: r3(t), dur: duracaoEscrita(l, movimento) }; t += r.dur + R.entre; return r; });
  const fimLinhas = r3(linhas.at(-1).t + linhas.at(-1).dur);
  const d = c.destaque ? linhas[c.destaque - 1] : null;
  const destaque = d ? r3(d.t + d.dur + R.destaque) : null;
  const fimDestaque = destaque != null ? r3(destaque + R.sublinhado) : null;
  const nota = c.nota ? r3(Math.max(fimLinhas, fimDestaque ?? 0) + R.nota) : null;
  return { R, linhas, fimLinhas, destaque, fimDestaque, nota };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const tp = tempos(c, movimento);
  const eventos = [...eventosDoCabecalho(c, movimento), ...tp.linhas.map((l) => ({ t: l.t, efeito: "caneta" }))];
  if (tp.destaque != null) eventos.push({ t: tp.destaque, efeito: "pop" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  const fimEscrita = tp.nota != null ? r3(tp.nota + duracaoEscrita(c.nota, movimento)) : Math.max(tp.fimLinhas, tp.fimDestaque ?? 0);
  return {
    fim: tp.nota ?? tp.destaque ?? tp.linhas.at(-1).t, fimEscrita, eventos,
    tempos: { linhas: tp.linhas, destaque: tp.destaque, nota: tp.nota },
  };
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores, D = kit.movimento.desenho.conta;
  const tp = tempos(c, kit.movimento);
  usarFonte(ctx, F.conta);
  const maior = Math.max(...c.linhas.map((l) => ctx.measureText(l).width)) || 1;
  const f = maior > livre.w ? escalar(F.conta, (F.conta.px * livre.w) / maior) : F.conta;
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const total = c.linhas.length * f.line + nota.length * F.corpo.line + (nota.length ? kit.layout.gap : 0);
  const y0 = livre.y + (livre.h - total) / 2;
  const cx = livre.x + livre.w / 2;
  c.linhas.forEach((l, i) => {
    const destaque = c.destaque === i + 1, y = y0 + i * f.line;
    const ini = tp.linhas[i].t;
    // Cada linha é um bloco de uma linha só: sem quebrar e sem juntar espaços ("norte: 3  sul: 3").
    escreverLinhas(ctx, [l], f, cx, y, t, ini, kit, { alinhar: "center", cor: destaque ? cores.verde : cores.tinta });
    if (destaque && tp.destaque != null) {
      usarFonte(ctx, f);
      const w = ctx.measureText(l).width, yb = y + linhaBase(f) + D.sublinhado_abaixo;
      revelarTraco(ctx, [{ x: cx - w / 2, y: yb }, { x: cx + w / 2, y: yb }], prog(t, tp.destaque, tp.fimDestaque, ease.inOutCubic), kit, t, { cor: cores.verde, largura: D.sublinhado });
    }
  });
  if (nota.length) escreverLinhas(ctx, nota, F.corpo, cx, y0 + c.linhas.length * f.line + kit.layout.gap, t, tp.nota, kit, { alinhar: "center", cor: cores.tintaSuave });
}
