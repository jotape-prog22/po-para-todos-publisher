// Cena "texto": kicker, título, linhas ou itens numerados, pergunta, ícone e dica — o formato que
// existia antes do motion (stories.json/reel.json antigos viram esta Cena). Mesmos instantes de
// entrada de antes; o que muda é como cada bloco entra. Ritmo em movimento.json (ritmo.texto);
// geometria (área, recuo do item, ícone) no kit.layout, medida do CSS.

import { checarTamanho, tamanho } from "./comum.mjs";
import { usarFonte, caixa, linhaBase, entrada, linhasDe, digitar, subir, escreverLinhas } from "../escrita.mjs";
import { springStep, TAU, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
export const LIMITES_TEXTO = { campos: { linha: 90, item_titulo: 20, item_texto: 90, pergunta: 60, dica: 30 }, linhas: 6, itens: 4 };

export function validar(c, onde, { existeIcone = () => true } = {}) {
  const erros = [];
  const add = (e) => e && erros.push(e);
  if (!c.kicker && !c.titulo) erros.push(`${onde}: precisa de "kicker" ou "titulo"`);
  if (c.linhas && c.itens) erros.push(`${onde}: use "linhas" ou "itens", não os dois`);
  for (const k of ["pergunta", "dica"]) if (c[k] != null) add(checarTamanho(k, c[k], LIMITES_TEXTO.campos[k], onde));
  const linhas = c.linhas ?? [], itens = c.itens ?? [];
  if (linhas.length > LIMITES_TEXTO.linhas) erros.push(`${onde}: ${linhas.length} linhas; o máximo é ${LIMITES_TEXTO.linhas}`);
  if (itens.length > LIMITES_TEXTO.itens) erros.push(`${onde}: ${itens.length} itens; o máximo é ${LIMITES_TEXTO.itens}`);
  linhas.forEach((l, j) => add(checarTamanho(`linhas[${j + 1}]`, l, LIMITES_TEXTO.campos.linha, onde)));
  itens.forEach((it, j) => {
    if (!it?.titulo || !it?.texto) { erros.push(`${onde}: itens[${j + 1}] precisa de "titulo" e "texto"`); return; }
    add(checarTamanho(`itens[${j + 1}].titulo`, it.titulo, LIMITES_TEXTO.campos.item_titulo, onde));
    add(checarTamanho(`itens[${j + 1}].texto`, it.texto, LIMITES_TEXTO.campos.item_texto, onde));
  });
  if (c.icone && !existeIcone(c.icone)) erros.push(`${onde}: ícone "${c.icone}" não existe em design-system/miniaturas/icones/`);
  return erros;
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const RITMO = ritmoDe("texto", movimento);
  const linhas = c.linhas ?? [], itens = c.itens ?? [];
  const tempos = { kicker: RITMO.kicker, titulo: RITMO.titulo, blocos: [], pergunta: null, dica: null };
  let cursor = RITMO.primeiro;
  const passo = itens.length ? RITMO.item : RITMO.linha;
  for (let j = 0; j < (linhas.length || itens.length); j++) { tempos.blocos.push(cursor); cursor += passo; }
  let fim = tempos.blocos.length ? tempos.blocos.at(-1) : tempos.titulo;
  if (c.pergunta) { tempos.pergunta = fim + RITMO.pergunta; fim = tempos.pergunta; }
  if (c.dica) { tempos.dica = fim + RITMO.dica; fim = tempos.dica; }
  const eventos = [];
  if (c.kicker) eventos.push({ t: tempos.kicker, efeito: "digitar" });
  if (c.titulo) eventos.push({ t: tempos.titulo, efeito: "pop" });
  for (const t of tempos.blocos) eventos.push({ t, efeito: "tick" });
  if (c.pergunta) eventos.push({ t: tempos.pergunta, efeito: "caneta" });
  if (c.dica) eventos.push({ t: tempos.dica, efeito: "tick" });
  return { fim: r3(fim), eventos, tempos };
}

// Cada bloco: altura (em px da grade de 1080) e como desenhar a partir do topo y, na largura w.
function blocosDe(ctx, c, kit, w) {
  const F = kit.fontes, tp = c.linha.tempos, blocos = [];
  if (c.kicker) blocos.push({ tipo: "kicker", f: F.kicker, linhas: linhasDe(ctx, F.kicker, c.kicker, w), t0: tp.kicker });
  if (c.titulo) {
    const f = tamanho(c.titulo) > 24 ? F.tituloMedio : F.titulo;
    blocos.push({ tipo: "titulo", f, linhas: linhasDe(ctx, f, c.titulo, w), t0: tp.titulo });
  }
  (c.linhas ?? []).forEach((l, j) => blocos.push({ tipo: "linha", f: F.corpo, linhas: linhasDe(ctx, F.corpo, l, w), t0: tp.blocos[j] }));
  (c.itens ?? []).forEach((it, j) => blocos.push({ tipo: "item", n: j + 1, titulo: caixa(F.itemTitulo, it.titulo), linhas: linhasDe(ctx, F.itemTexto, it.texto, w - kit.layout.recuoItem), t0: tp.blocos[j] }));
  if (c.pergunta) blocos.push({ tipo: "pergunta", f: F.pergunta, linhas: linhasDe(ctx, F.pergunta, c.pergunta, w), t0: tp.pergunta });
  if (c.icone) blocos.push({ tipo: "icone", t0: tp.titulo, altura: kit.layout.icone });
  if (c.dica) blocos.push({ tipo: "dica", f: F.apoio, linhas: [c.dica], t0: tp.dica, antes: kit.layout.respiroDica });
  for (const b of blocos) {
    if (b.altura != null) continue;
    b.altura = b.tipo === "item" ? F.itemTitulo.line + b.linhas.length * F.itemTexto.line : b.tipo === "dica" ? b.f.line * 2 : b.linhas.length * b.f.line;
  }
  return blocos;
}

const DESENHOS = {
  kicker: (ctx, b, t, kit, y) => digitar(ctx, b.linhas, b.f, 0, y, t, b.t0, kit.cores.verdeSuave),
  titulo: (ctx, b, t, kit, y, w) => subir(ctx, b.linhas, b.f, 0, y, t, b.t0, kit.cores.verde, kit, { largura: w }),
  linha: (ctx, b, t, kit, y) => {
    const p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, b.f); ctx.fillStyle = kit.cores.tinta; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const dx = (1 - p) * kit.movimento.desenho.deslize;
    b.linhas.forEach((l, k) => ctx.fillText(l, dx, y + k * b.f.line + linhaBase(b.f)));
    ctx.restore();
  },
  item: (ctx, b, t, kit, y) => {
    const F = kit.fontes, p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    const m = kit.movimento.mola, s = springStep(t - b.t0, m.freq, m.amortecimento);
    ctx.save();
    usarFonte(ctx, F.itemNumero); ctx.fillStyle = kit.cores.verdeSuave; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.translate(0, y + linhaBase(F.itemTitulo)); ctx.scale(s, s); ctx.fillText(String(b.n), 0, 0);
    ctx.restore();
    const x = kit.layout.recuoItem + (1 - p) * kit.movimento.desenho.deslize;
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, F.itemTitulo); ctx.fillStyle = kit.cores.verde; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(b.titulo, x, y + linhaBase(F.itemTitulo));
    usarFonte(ctx, F.itemTexto); ctx.fillStyle = kit.cores.tinta;
    b.linhas.forEach((l, k) => ctx.fillText(l, x, y + F.itemTitulo.line + k * F.itemTexto.line + linhaBase(F.itemTexto)));
    ctx.restore();
  },
  pergunta: (ctx, b, t, kit, y) => { escreverLinhas(ctx, b.linhas, b.f, 0, y, t, b.t0, kit, { cor: kit.cores.tinta }); },
  icone: (ctx, b, t, kit, y) => {
    const img = kit.imagens.icones[b.icone];
    const m = kit.movimento.mola, s = springStep(t - b.t0, m.freq, m.amortecimento);
    if (!img || s <= 0) return;
    const tam = kit.layout.icone;
    ctx.save(); ctx.translate(tam / 2, y + tam / 2); ctx.scale(s, s); ctx.drawImage(img, -tam / 2, -tam / 2, tam, tam); ctx.restore();
  },
  dica: (ctx, b, t, kit, y, w) => {
    const p = entrada(t, b.t0, kit);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= p;
    usarFonte(ctx, b.f); ctx.fillStyle = kit.cores.tintaSuave; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(b.linhas[0], w / 2, y + linhaBase(b.f));
    const balanco = Math.sin((TAU * (t - b.t0)) / kit.movimento.duracoes.balanco_dica) * kit.movimento.desenho.balanco_dica;
    ctx.fillStyle = kit.cores.verdeSuave;
    ctx.fillText("↓", w / 2, y + b.f.line + linhaBase(b.f) + balanco);
    ctx.restore();
  },
};

export function desenhar(ctx, c, t, kit) {
  const { area, alinhamento, gap } = kit.layout;
  const blocos = blocosDe(ctx, c, kit, area.w);
  for (const b of blocos) if (b.tipo === "icone") b.icone = c.icone;
  const total = blocos.reduce((s, b, i) => s + b.altura + (i ? gap : 0) + (b.antes ?? 0), 0);
  const escala = Math.min(1, area.h / total);
  const alto = total * escala;
  const y0 = alinhamento === "center" ? area.y + (area.h - alto) / 2 : alinhamento === "bottom" ? area.y + area.h - alto : area.y;
  ctx.save();
  ctx.translate(area.x, y0);
  ctx.scale(escala, escala);
  let y = 0;
  blocos.forEach((b, i) => {
    if (i) y += gap;
    y += b.antes ?? 0;
    DESENHOS[b.tipo](ctx, b, t, kit, y, area.w / escala);
    y += b.altura;
  });
  ctx.restore();
}
