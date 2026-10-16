// Cena "grafo": nós que surgem com mola, arestas desenhadas pela caneta (paralelas viram curvas —
// Königsberg), pesos, e um caminho que acende em verde passo a passo com a câmera se aproximando.
// Posições numa grade 0–10 dada pelo autor: o desenho sai sempre igual. Ritmo em movimento.json
// (ritmo.grafo); raio mínimo, espessuras e zoom em desenho.grafo; o resto é proporção da área livre.

import { checarTamanho } from "./comum.mjs";
import { inicioDoConteudo, eventosDoCabecalho, desenharCabecalho } from "./cabecalho.mjs";
import { usarFonte, escalar, linhasDe, escreverLinhas, duracaoEscrita, revelarTraco, caixa } from "../escrita.mjs";
import { Camera } from "../camera.mjs";
import { springStep, prog, ease, dist, clamp, TAU, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = true;
const LIM = { nos: [2, 12], arestas: [1, 20], rotulo: 12, peso: 6, legenda: 60 };
// Proporções (não são px): raio do nó em relação ao lado do desenho, abertura das paralelas, fontes do
// rótulo e do peso em relação ao raio, rótulo que ainda cabe no nó, afastamento do rótulo de fora,
// margem do fundo do peso, tamanho da seta e o respiro em volta da legenda (em entrelinhas).
const RAIO = 0.045, ABRIR = 2.4, FONTE_ROTULO = 0.85, FONTE_PESO = 0.8, CABE = 1.6, AFASTAR = 0.3, MARGEM_PESO = 0.25, SETA = 0.55, RESPIRO_LEGENDA = 0.6;
const par = (a) => [a.de, a.para].sort().join("\u0000");

export function curvaturas(c) {
  const total = {}, visto = {};
  for (const a of c.arestas) total[par(a)] = (total[par(a)] ?? 0) + 1;
  return c.arestas.map((a) => { const k = (visto[par(a)] = (visto[par(a)] ?? -1) + 1); return k - (total[par(a)] - 1) / 2; });
}

// A aresta a vai de u a v? (sem direção, vale nos dois sentidos)
const liga = (c, a, u, v) => (a?.de === u && a?.para === v) || (!c.dirigido && a?.de === v && a?.para === u);
const ligados = (c, u, v) => c.arestas.some((a) => liga(c, a, u, v));

export function validar(c, onde) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  const nos = Array.isArray(c.nos) ? c.nos : [], arestas = Array.isArray(c.arestas) ? c.arestas : [];
  if (nos.length < LIM.nos[0] || nos.length > LIM.nos[1]) erros.push(`${onde}: o grafo precisa de ${LIM.nos[0]} a ${LIM.nos[1]} nós`);
  if (arestas.length < LIM.arestas[0] || arestas.length > LIM.arestas[1]) erros.push(`${onde}: o grafo precisa de ${LIM.arestas[0]} a ${LIM.arestas[1]} arestas`);
  const ids = new Set();
  nos.forEach((n, i) => {
    if (!n?.id) { erros.push(`${onde}: nos[${i + 1}] precisa de "id"`); return; }
    if (ids.has(n.id)) erros.push(`${onde}: id "${n.id}" repetido`);
    ids.add(n.id);
    if (!(n.x >= 0 && n.x <= 10 && n.y >= 0 && n.y <= 10)) erros.push(`${onde}: nó "${n.id}" precisa de "x" e "y" de 0 a 10 (grade)`);
    add(checarTamanho(`rotulo de "${n.id}"`, n.rotulo ?? n.id, LIM.rotulo, onde));
  });
  arestas.forEach((a, i) => {
    if (a?.de == null || a?.para == null) { erros.push(`${onde}: arestas[${i + 1}] precisa de "de" e "para" (ids de nós)`); return; }
    for (const lado of ["de", "para"]) if (!ids.has(a[lado])) erros.push(`${onde}: arestas[${i + 1}]: nó "${a[lado]}" não existe`);
    if (a.de === a.para) erros.push(`${onde}: arestas[${i + 1}] liga "${a.de}" a ele mesmo`);
    if (a?.peso != null) add(checarTamanho(`arestas[${i + 1}].peso`, String(a.peso), LIM.peso, onde));
  });
  if (c.caminho != null) {
    if (!Array.isArray(c.caminho) || c.caminho.length < 2) erros.push(`${onde}: "caminho" precisa de pelo menos 2 nós`);
    else for (let i = 0; i + 1 < c.caminho.length; i++) {
      const [u, v] = [c.caminho[i], c.caminho[i + 1]];
      if (!ligados(c, u, v)) erros.push(`${onde}: caminho: não há aresta ${c.dirigido ? `de "${u}" para "${v}"` : `entre "${u}" e "${v}"`}`);
    }
  }
  if (c.legenda != null) add(checarTamanho("legenda", c.legenda, LIM.legenda, onde));
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("grafo", movimento);
  const ini = inicioDoConteudo(c, movimento);
  const nos = c.nos.map((_, i) => r3(ini + i * R.no));
  const iniA = ini + c.nos.length * R.no + R.antes_arestas;
  const arestas = c.arestas.map((_, i) => r3(iniA + i * R.passo_aresta));
  const fimA = r3(arestas.at(-1) + R.aresta);
  const iniC = r3(fimA + R.antes_caminho);
  const caminho = (c.caminho ?? []).slice(1).map((_, i) => r3(iniC + i * R.segmento));
  const fimC = caminho.length ? r3(caminho.at(-1) + R.segmento) : fimA;
  return { R, ini, nos, arestas, fimA, iniC, caminho, fimC, legenda: c.legenda ? r3(fimC + R.legenda) : null };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const tp = tempos(c, movimento);
  const eventos = [...eventosDoCabecalho(c, movimento), { t: tp.ini, efeito: "pop" }];
  tp.arestas.forEach((t, i) => { if (i % tp.R.caneta_a_cada === 0) eventos.push({ t, efeito: "caneta" }); });
  for (const t of tp.caminho) eventos.push({ t, efeito: "tick" });
  if (tp.legenda != null) eventos.push({ t: tp.legenda, efeito: "tick" });
  const fim = tp.legenda ?? tp.caminho.at(-1) ?? tp.arestas.at(-1);
  // A caneta desenha arestas e caminho até fimC; a legenda, escrita depois, vai até o fim da escrita.
  const fimEscrita = tp.legenda != null ? r3(tp.legenda + duracaoEscrita(c.legenda, movimento)) : tp.fimC;
  return { fim, fimEscrita, eventos };
}

function geometria(ctx, c, livre, kit) {
  const F = kit.fontes;
  const legenda = c.legenda ? linhasDe(ctx, F.corpo, c.legenda, livre.w) : [];
  const legendaH = legenda.length ? (legenda.length + RESPIRO_LEGENDA * 2) * F.corpo.line : 0;
  const lado = Math.min(livre.w, livre.h - legendaH);
  const R = Math.max(kit.movimento.desenho.grafo.raio_minimo, lado * RAIO);
  const x0 = livre.x + (livre.w - lado) / 2, y0 = livre.y + (livre.h - legendaH - lado) / 2;
  const u = (lado - 2 * R) / 10;
  const pos = new Map(c.nos.map((n) => [n.id, { x: x0 + R + n.x * u, y: y0 + R + n.y * u }]));
  const meio = { x: 0, y: 0 };
  for (const p of pos.values()) { meio.x += p.x / pos.size; meio.y += p.y / pos.size; }
  return { pos, R, meio, legenda, legendaY: y0 + lado + RESPIRO_LEGENDA * F.corpo.line };
}

// Pontos da aresta, curvada se tiver paralelas, sem o pedaço dentro dos círculos dos nós.
function pontosDaAresta(a, curvatura, { pos, R }) {
  const [p, q] = a.de < a.para ? [pos.get(a.de), pos.get(a.para)] : [pos.get(a.para), pos.get(a.de)];
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, flecha = curvatura * R * ABRIR;
  const pts = [];
  for (let i = 0; i <= 32; i++) { const s = i / 32, b = 4 * s * (1 - s) * flecha; pts.push({ x: p.x + dx * s + nx * b, y: p.y + dy * s + ny * b }); }
  const aparados = pts.filter((pt) => dist(pt, p) >= R && dist(pt, q) >= R);
  return a.de < a.para ? aparados : aparados.reverse();
}

// O segmento a–b passa pelo retângulo r ({ x0, y0, x1, y1 })? (Liang–Barsky)
function cruza(a, b, r) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - r.x0], [dx, r.x1 - a.x], [-dy, a.y - r.y0], [dy, r.y1 - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const s = q / p;
    if (p < 0) { if (s > t1) return false; if (s > t0) t0 = s; } else { if (s < t0) return false; if (s < t1) t1 = s; }
  }
  return true;
}

// Rótulo que não cabe no nó: sai para fora do desenho, do lado oposto ao centro do grafo (média dos
// nós); se ali bate numa aresta, noutro nó ou sai da área livre, tenta os lados vizinhos, em passos
// de 45°. Sem lado livre, fica no que menos cobre (nó pesa mais que aresta), sem sair da área.
// Devolve o deslocamento em relação ao centro do nó.
function lugarDoRotulo(id, w, h, g, livre, tracos) {
  const p = g.pos.get(id), folga = g.R * AFASTAR;
  const dx = p.x - g.meio.x, dy = p.y - g.meio.y;
  const base = Math.hypot(dx, dy) < 1e-6 ? Math.PI / 2 : Math.atan2(dy, dx);
  const custo = ({ x, y }) => {
    const r = { x0: x - w / 2 - folga / 2, x1: x + w / 2 + folga / 2, y0: y - h / 2 - folga / 2, y1: y + h / 2 + folga / 2 };
    let n = 0;
    for (const q of g.pos.values()) if (dist({ x: clamp(q.x, r.x0, r.x1), y: clamp(q.y, r.y0, r.y1) }, q) < g.R) n += 100;
    for (const pts of tracos) for (let i = 1; i < pts.length; i++) if (cruza(pts[i - 1], pts[i], r)) n++;
    return n;
  };
  const lugares = [0, 1, -1, 2, -2, 3, -3, 4].map((k) => {
    const ux = Math.cos(base + (k * Math.PI) / 4), uy = Math.sin(base + (k * Math.PI) / 4);
    const longe = g.R + folga + (Math.abs(ux) * w) / 2 + (Math.abs(uy) * h) / 2;
    const x = clamp(p.x + ux * longe, livre.x + w / 2, livre.x + livre.w - w / 2);
    const y = clamp(p.y + uy * longe, livre.y + h / 2, livre.y + livre.h - h / 2);
    return { x, y, custo: custo({ x, y }) };
  });
  const lugar = lugares.find((l) => l.custo === 0) ?? lugares.reduce((a, b) => (b.custo < a.custo ? b : a));
  return { x: lugar.x - p.x, y: lugar.y - p.y };
}

function seta(ctx, pts, cor, R) {
  const [a, b] = [pts.at(-2), pts.at(-1)];
  const ang = Math.atan2(b.y - a.y, b.x - a.x), s = R * SETA;
  ctx.save(); ctx.fillStyle = cor; ctx.translate(b.x, b.y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.6); ctx.lineTo(-s, s * 0.6); ctx.closePath(); ctx.fill(); ctx.restore();
}

export function desenhar(ctx, c, t, kit) {
  const livre = desenharCabecalho(ctx, c, t, kit);
  const tp = tempos(c, kit.movimento), R = tp.R, g = geometria(ctx, c, livre, kit), cores = kit.cores;
  const m = kit.movimento.mola, D = kit.movimento.desenho.grafo;
  const curv = curvaturas(c);
  const tracos = c.arestas.map((a, i) => pontosDaAresta(a, curv[i], g));

  // câmera: aproxima do meio do caminho enquanto ele acende e volta depois
  const { largura: W, altura: H } = kit.layout;
  const cam = new Camera(W, H).chave(0, W / 2, H / 2, 1);
  if (c.caminho) {
    const meio = c.caminho.map((id) => g.pos.get(id)).reduce((s, p, _, l) => ({ x: s.x + p.x / l.length, y: s.y + p.y / l.length }), { x: 0, y: 0 });
    const curva = ease[kit.movimento.curvas.camera];
    cam.chave(tp.iniC, W / 2, H / 2, 1)
      .chave(tp.iniC + R.camera, (W / 2 + meio.x) / 2, (H / 2 + meio.y) / 2, D.zoom_caminho, 0, curva)
      .chave(tp.fimC + R.camera, W / 2, H / 2, 1, 0, curva);
  }
  ctx.save();
  cam.aplicar(ctx, t);

  // arestas
  c.arestas.forEach((a, i) => {
    const p = prog(t, tp.arestas[i], tp.arestas[i] + R.aresta, ease.inOutCubic);
    revelarTraco(ctx, tracos[i], p, kit, t, { cor: cores.tintaSuave, largura: D.aresta });
    if (p >= 1 && c.dirigido) seta(ctx, tracos[i], cores.tintaSuave, g.R);
  });

  // caminho em verde, passo a passo
  const visitado = new Set();
  if (c.caminho && t >= tp.iniC) visitado.add(c.caminho[0]);
  // cada passo usa a primeira aresta compatível ainda não usada: ida e volta pelas pontes paralelas
  // acende as duas; se todas já foram usadas, repete a primeira
  const usadas = new Set();
  (c.caminho ?? []).slice(1).forEach((v, j) => {
    const u = c.caminho[j];
    const compativeis = c.arestas.map((a, k) => k).filter((k) => liga(c, c.arestas[k], u, v));
    const i = compativeis.find((k) => !usadas.has(k)) ?? compativeis[0];
    usadas.add(i);
    const pts = c.arestas[i].de === u ? tracos[i] : [...tracos[i]].reverse();
    const p = prog(t, tp.caminho[j], tp.caminho[j] + R.segmento, ease.inOutCubic);
    revelarTraco(ctx, pts, p, kit, t, { cor: cores.verde, largura: D.caminho });
    if (p >= 1) visitado.add(v);
  });

  // pesos por cima das arestas e do caminho
  c.arestas.forEach((a, i) => {
    if (a.peso == null || t < tp.arestas[i] + R.aresta) return;
    const meio = tracos[i][Math.floor(tracos[i].length / 2)];
    const f = escalar(kit.fontes.kicker, g.R * FONTE_PESO);
    usarFonte(ctx, f);
    const s = String(a.peso), w = ctx.measureText(s).width, margem = f.px * MARGEM_PESO;
    ctx.save(); ctx.globalAlpha *= clamp((t - tp.arestas[i] - R.aresta) / R.peso);
    ctx.fillStyle = cores.fundo; ctx.fillRect(meio.x - w / 2 - margem, meio.y - f.px * 0.7, w + 2 * margem, f.px * 1.4);
    ctx.fillStyle = cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, meio.x, meio.y);
    ctx.restore();
  });

  // nós e rótulos (o rótulo que não cabe no nó sai para fora do desenho e pula junto com o nó)
  const fRotulo = escalar(kit.fontes.kicker, g.R * FONTE_ROTULO);
  c.nos.forEach((n, i) => {
    const s = springStep(t - tp.nos[i], m.freq, m.amortecimento);
    if (s <= 0) return;
    const p = g.pos.get(n.id), aceso = visitado.has(n.id);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 0, g.R, 0, TAU);
    ctx.fillStyle = aceso ? cores.verde : cores.fundo; ctx.fill();
    ctx.lineWidth = D.contorno; ctx.strokeStyle = aceso ? cores.verde : cores.tinta; ctx.stroke();
    usarFonte(ctx, fRotulo); ctx.fillStyle = cores.tinta; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const rotulo = caixa(fRotulo, n.rotulo ?? n.id), w = ctx.measureText(rotulo).width;
    const fora = w > g.R * CABE ? lugarDoRotulo(n.id, w, fRotulo.px, g, livre, tracos) : { x: 0, y: 0 };
    ctx.fillText(rotulo, fora.x, fora.y);
    ctx.restore();
  });
  ctx.restore();

  if (g.legenda.length) escreverLinhas(ctx, g.legenda, kit.fontes.corpo, livre.x + livre.w / 2, g.legendaY, t, tp.legenda, kit, { alinhar: "center", cor: cores.tintaSuave });
}
