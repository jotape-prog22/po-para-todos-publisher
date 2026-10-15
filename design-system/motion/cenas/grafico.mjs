// Cena "grafico": eixos desenhados, cada restrição a·x + b·y ≤ c traçada pela caneta, a região viável
// preenchida em verde da esquerda para a direita e o ponto ótimo pulsando com seu rótulo.
// Ritmo em movimento.json (ritmo.grafico); espessuras, ponto, anel e margens em desenho.grafico.
// Rótulos de eixo, de restrição e do ótimo saem como o autor escreveu, sem caixa alta: são fórmulas
// ("Z* = R$ 220" não pode virar "R$" → "r$" nem "Z*" → "z*").

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, linhasDe, escreverLinhas, duracaoEscrita, revelarTraco } from "../escrita.mjs";
import { prog, ease, springStep, pulse, clamp, TAU, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = true;
const LIM = { restricoes: [1, 5], rotuloEixo: 16, rotuloRestricao: 16, rotuloOtimo: 20, nota: 60 };
// Proporções (não são px): afastamento dos rótulos de eixo e de restrição em relação à fonte de apoio,
// afastamento do rótulo do ótimo em relação ao raio do ponto, opacidade da região e do anel.
const AFASTAR = 0.3, AFASTAR_OTIMO = 1.7, OPACIDADE_REGIAO = 0.28, OPACIDADE_ANEL = 0.6;
const num = (v) => typeof v === "number" && Number.isFinite(v);

export function regiaoViavel(eixos, restricoes) {
  let poli = [{ x: 0, y: 0 }, { x: eixos.x.max, y: 0 }, { x: eixos.x.max, y: eixos.y.max }, { x: 0, y: eixos.y.max }];
  for (const { a, b, c } of restricoes) {
    const f = (p) => a * p.x + b * p.y - c;
    const novo = [];
    poli.forEach((p, i) => {
      const q = poli[(i + 1) % poli.length], fp = f(p), fq = f(q);
      if (fp <= 1e-9) novo.push(p);
      if ((fp <= 1e-9) !== (fq <= 1e-9)) { const s = fp / (fp - fq); novo.push({ x: p.x + (q.x - p.x) * s, y: p.y + (q.y - p.y) * s }); }
    });
    poli = novo.filter((p, i) => { const q = novo[(i + novo.length - 1) % novo.length]; return novo.length < 2 || Math.hypot(p.x - q.x, p.y - q.y) > 1e-9; });
    if (poli.length < 3) return [];
  }
  const area = poli.reduce((s, p, i) => { const q = poli[(i + 1) % poli.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
  return Math.abs(area) > 1e-9 ? poli : [];
}

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  for (const k of ["x", "y"]) {
    const e = c.eixos?.[k];
    if (!e || !num(e.max) || e.max <= 0) erros.push(`${onde}: eixo ${k} precisa de "max" > 0`);
    if (e?.rotulo != null) add(checarTamanho(`eixos.${k}.rotulo`, e.rotulo, LIM.rotuloEixo, onde));
  }
  const rs = Array.isArray(c.restricoes) ? c.restricoes : [];
  if (rs.length < LIM.restricoes[0] || rs.length > LIM.restricoes[1]) erros.push(`${onde}: o gráfico precisa de ${LIM.restricoes[0]} a ${LIM.restricoes[1]} restrições`);
  rs.forEach((r, i) => {
    if (![r?.a, r?.b, r?.c].every(num)) erros.push(`${onde}: restricoes[${i + 1}] precisa de "a", "b" e "c" numéricos (a·x + b·y ≤ c)`);
    else if (r.a === 0 && r.b === 0) erros.push(`${onde}: restricoes[${i + 1}]: "a" e "b" não podem ser os dois 0`);
    if (r?.rotulo != null) add(checarTamanho(`restricoes[${i + 1}].rotulo`, r.rotulo, LIM.rotuloRestricao, onde));
  });
  if (c.otimo?.rotulo != null) add(checarTamanho("otimo.rotulo", c.otimo.rotulo, LIM.rotuloOtimo, onde));
  if (c.nota != null) add(checarTamanho("nota", c.nota, LIM.nota, onde));
  if (erros.length) return erros;
  if (!regiaoViavel(c.eixos, rs).length) return [`${onde}: a região viável ficou vazia — confira as restrições e o "max" dos eixos`];
  if (c.otimo) {
    const { x, y } = c.otimo, tol = 1e-6;
    const dentro = num(x) && num(y) && x >= -tol && y >= -tol && x <= c.eixos.x.max + tol && y <= c.eixos.y.max + tol && rs.every((r) => r.a * x + r.b * y <= r.c + tol);
    if (!dentro) erros.push(`${onde}: o ponto ótimo (${x}; ${y}) está fora da região viável`);
  }
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("grafico", movimento);
  const ini = inicioDoConteudo(c, movimento);
  const restricoes = c.restricoes.map((_, i) => r3(ini + R.antes_restricoes + i * R.passo_restricao));
  const regiao = r3(restricoes.at(-1) + R.regiao);
  const otimo = c.otimo ? r3(regiao + R.otimo) : null;
  const nota = c.nota ? r3((otimo ?? regiao) + R.nota) : null;
  return { R, ini, restricoes, regiao, otimo, nota };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const tp = tempos(c, movimento);
  const eventos = [...eventosDoCabecalho(c, movimento), { t: tp.ini, efeito: "caneta" }, ...tp.restricoes.map((t) => ({ t, efeito: "caneta" })), { t: tp.regiao, efeito: "pop" }];
  if (tp.otimo != null) eventos.push({ t: tp.otimo, efeito: "sino" });
  if (tp.nota != null) eventos.push({ t: tp.nota, efeito: "tick" });
  // A caneta traça eixos e restrições (a última acaba em restricoes + ritmo.restricao); a nota, escrita depois, vai até o fim da escrita.
  const fimEscrita = tp.nota != null ? r3(tp.nota + duracaoEscrita(c.nota, movimento)) : r3(tp.restricoes.at(-1) + tp.R.restricao);
  return {
    fim: tp.nota ?? tp.otimo ?? tp.regiao, fimEscrita, eventos,
    tempos: { restricoes: tp.restricoes, regiao: tp.regiao, otimo: tp.otimo, nota: tp.nota },
  };
}

// Pedaço da reta a·x + b·y = c dentro do retângulo dos eixos (dois pontos), ou null.
function segmento({ a, b, c }, eixos) {
  const X = eixos.x.max, Y = eixos.y.max, pts = [];
  if (b !== 0) for (const x of [0, X]) { const y = (c - a * x) / b; if (y >= -1e-9 && y <= Y + 1e-9) pts.push({ x, y }); }
  if (a !== 0) for (const y of [0, Y]) { const x = (c - b * y) / a; if (x >= -1e-9 && x <= X + 1e-9) pts.push({ x, y }); }
  if (pts.length < 2) return null;
  pts.sort((p, q) => p.x - q.x || q.y - p.y);
  return [pts[0], pts.at(-1)];
}

// Caixa de um texto na linha de base y, com a fonte f já posta no ctx.
function caixaDe(ctx, s, x, y, alinhar, f) {
  const w = ctx.measureText(s).width, x0 = alinhar === "right" ? x - w : x;
  return { x0, x1: x0 + w, y0: y - f.px * 0.8, y1: y + f.px * 0.2 };
}
const cobre = (a, b) => !(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0);

// Onde vai cada rótulo, de uma vez (não depende do instante: nada pula quando outro rótulo aparece).
// Eixos: o de x embaixo, no fim do eixo; o de y em cima, ao lado do topo. Ótimo: acima e à direita do
// ponto (à esquerda se não couber). Restrição: junto da ponta mais alta do segmento; se ali cobre um
// rótulo já posto (o do eixo y, quando a reta toca o topo do eixo), vai para a outra ponta.
function rotulos(ctx, c, g, kit) {
  const F = kit.fontes, D = kit.movimento.desenho.grafico, afastar = F.apoio.px * AFASTAR;
  const { X, Y, bx, lado } = g, postos = [], saida = { restricoes: [] };
  usarFonte(ctx, F.apoio);
  if (c.eixos.x.rotulo) { saida.x = { s: c.eixos.x.rotulo, x: X(c.eixos.x.max), y: Y(0) + F.apoio.line, alinhar: "right" }; postos.push(caixaDe(ctx, saida.x.s, saida.x.x, saida.x.y, "right", F.apoio)); }
  if (c.eixos.y.rotulo) { saida.y = { s: c.eixos.y.rotulo, x: X(0) + afastar, y: Y(c.eixos.y.max) - afastar, alinhar: "left" }; postos.push(caixaDe(ctx, saida.y.s, saida.y.x, saida.y.y, "left", F.apoio)); }
  if (c.otimo?.rotulo) {
    usarFonte(ctx, F.kicker);
    const ox = X(c.otimo.x), oy = Y(c.otimo.y), a = D.ponto * AFASTAR_OTIMO, w = ctx.measureText(c.otimo.rotulo).width;
    const alinhar = ox + a + w > bx + lado ? "right" : "left";
    saida.otimo = { s: c.otimo.rotulo, x: alinhar === "right" ? ox - a : ox + a, y: oy - a, alinhar };
    postos.push(caixaDe(ctx, saida.otimo.s, saida.otimo.x, saida.otimo.y, alinhar, F.kicker));
    usarFonte(ctx, F.apoio);
  }
  c.restricoes.forEach((r, i) => {
    const seg = segmento(r, c.eixos);
    if (!seg || !r.rotulo) return;
    const w = ctx.measureText(r.rotulo).width;
    const pontas = seg.map((p) => ({ x: X(p.x), y: Y(p.y) })).sort((p, q) => p.y - q.y);
    const lugares = pontas.map((p) => {
      const l = { s: r.rotulo, x: clamp(p.x + afastar, bx, bx + lado - w), y: p.y - afastar, alinhar: "left" };
      return { l, caixa: caixaDe(ctx, l.s, l.x, l.y, "left", F.apoio) };
    });
    const livre = lugares.find((q) => !postos.some((b) => cobre(q.caixa, b))) ?? lugares[0];
    postos.push(livre.caixa);
    saida.restricoes[i] = livre.l;
  });
  return saida;
}

function geometria(ctx, c, livre, kit) {
  const F = kit.fontes, D = kit.movimento.desenho.grafico;
  const nota = c.nota ? linhasDe(ctx, F.corpo, c.nota, livre.w) : [];
  const margem = { lado: D.margem, cima: F.apoio.line + D.respiro_cima, baixo: F.apoio.line + D.respiro_baixo };
  const notaH = nota.length * F.corpo.line;
  const lado = Math.min(livre.w - 2 * margem.lado, livre.h - margem.cima - margem.baixo - notaH);
  const bx = livre.x + (livre.w - lado) / 2, by = livre.y + margem.cima + (livre.h - margem.cima - margem.baixo - notaH - lado) / 2;
  const X = (x) => bx + (x / c.eixos.x.max) * lado, Y = (y) => by + lado - (y / c.eixos.y.max) * lado;
  return { nota, notaY: by + lado + margem.baixo, lado, bx, by, X, Y };
}

const texto = (ctx, l) => { ctx.textAlign = l.alinhar; ctx.fillText(l.s, l.x, l.y); };

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const F = kit.fontes, cores = kit.cores, m = kit.movimento.mola, D = kit.movimento.desenho.grafico;
  const tp = tempos(c, kit.movimento), R = tp.R;
  const g = geometria(ctx, c, livre, kit), { X, Y, bx, by, lado } = g;
  const rot = rotulos(ctx, c, g, kit);

  // eixos
  const pEixos = prog(t, tp.ini, tp.ini + R.eixos, ease.inOutCubic);
  revelarTraco(ctx, [{ x: X(0), y: Y(c.eixos.y.max) }, { x: X(0), y: Y(0) }, { x: X(c.eixos.x.max), y: Y(0) }], pEixos, kit, t, { cor: cores.tinta, largura: D.eixos });
  if (pEixos >= 1) {
    usarFonte(ctx, F.apoio); ctx.fillStyle = cores.tintaSuave; ctx.textBaseline = "alphabetic";
    if (rot.x) texto(ctx, rot.x);
    if (rot.y) texto(ctx, rot.y);
  }

  // região viável, revelada da esquerda para a direita
  const pReg = prog(t, tp.regiao, tp.regiao + R.revelar_regiao, ease.outCubic);
  if (pReg > 0) {
    const poli = regiaoViavel(c.eixos, c.restricoes);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, lado * pReg, lado); ctx.clip();
    ctx.globalAlpha *= OPACIDADE_REGIAO; ctx.fillStyle = cores.verde;
    ctx.beginPath(); poli.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // restrições
  c.restricoes.forEach((r, i) => {
    const seg = segmento(r, c.eixos);
    if (!seg) return;
    const p = prog(t, tp.restricoes[i], tp.restricoes[i] + R.restricao, ease.inOutCubic);
    revelarTraco(ctx, seg.map((q) => ({ x: X(q.x), y: Y(q.y) })), p, kit, t, { cor: cores.tintaSuave, largura: D.restricao });
    if (p >= 1 && rot.restricoes[i]) {
      usarFonte(ctx, F.apoio); ctx.fillStyle = cores.verdeSuave; ctx.textBaseline = "alphabetic";
      texto(ctx, rot.restricoes[i]);
    }
  });

  // ótimo: anel que cresce e some, ponto com mola, rótulo que acende
  if (c.otimo && t >= tp.otimo) {
    const s = springStep(t - tp.otimo, m.freq, m.amortecimento), ox = X(c.otimo.x), oy = Y(c.otimo.y);
    ctx.save();
    ctx.globalAlpha *= OPACIDADE_ANEL * pulse(t, tp.otimo, R.pulso);
    ctx.strokeStyle = cores.verde; ctx.lineWidth = D.anel_traco;
    ctx.beginPath(); ctx.arc(ox, oy, D.ponto + D.anel * clamp((t - tp.otimo) / R.anel), 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.fillStyle = cores.verde; ctx.beginPath(); ctx.arc(0, 0, D.ponto, 0, TAU); ctx.fill();
    ctx.restore();
    if (rot.otimo) {
      ctx.save();
      usarFonte(ctx, F.kicker); ctx.fillStyle = cores.tinta; ctx.textBaseline = "alphabetic";
      ctx.globalAlpha *= clamp((t - tp.otimo) / R.rotulo_otimo);
      texto(ctx, rot.otimo);
      ctx.restore();
    }
  }

  if (g.nota.length) escreverLinhas(ctx, g.nota, F.corpo, livre.x + livre.w / 2, g.notaY, t, tp.nota, kit, { alinhar: "center", cor: cores.tintaSuave });
}
