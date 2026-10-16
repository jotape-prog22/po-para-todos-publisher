// Um quadro do vídeo: fundo do design system, grade (só nas Cenas de "conta"), o conteúdo da Cena
// com a saída/loop por fora, a marca (lockup, faixa, rodapé com o @) e o grão. Função pura de t.

import { moduloDe } from "./cenas/index.mjs";
import { ease, prog, hash, TAU, FPS } from "./util.mjs";
import { usarFonte, caixa, entrada } from "./escrita.mjs";
import { ErroMotion } from "./movimento.mjs";

export function cenaNoInstante(comp, t) {
  const i = comp.cenas.findIndex((c) => t < c.fim);
  const indice = i < 0 ? comp.cenas.length - 1 : i;
  const cena = comp.cenas[indice];
  return { cena, indice, lt: t - cena.inicio };
}

export function desenharGrade(ctx, kit, p) {
  if (p <= 0) return;
  const { passo, forte_a_cada, opacidade } = kit.movimento.grade;
  const { largura: W, altura: H } = kit.layout;
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, (p * Math.hypot(W, H)) / 2, 0, TAU); ctx.clip();
  ctx.strokeStyle = kit.cores.tintaSuave; ctx.lineWidth = 2;
  const linhas = (meio, max, traco) => {
    for (let k = -Math.ceil(meio / passo); meio + k * passo <= max; k++) {
      ctx.globalAlpha = opacidade * (k % forte_a_cada === 0 ? 2 : 1);
      ctx.beginPath(); traco(meio + k * passo); ctx.stroke();
    }
  };
  linhas(W / 2, W, (x) => { ctx.moveTo(x, 0); ctx.lineTo(x, H); });
  linhas(H / 2, H, (y) => { ctx.moveTo(0, y); ctx.lineTo(W, y); });
  ctx.restore();
}

export function desenharMarca(ctx, cena, lt, kit) {
  const { lockup, rodape, faixa, largura: W } = kit.layout;
  if (kit.imagens.logo) ctx.drawImage(kit.imagens.logo, lockup.x, lockup.y, lockup.tam, lockup.tam);
  ctx.fillStyle = kit.cores.verde;
  ctx.fillRect(0, rodape.y, W, rodape.h);
  usarFonte(ctx, kit.fontes.rodape);
  ctx.fillStyle = kit.cores.marinho; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`@${kit.usuario}`, W / 2, rodape.y + rodape.h / 2);
  if (cena.faixa) {
    const p = entrada(lt, kit.movimento.duracoes.faixa, kit);
    if (p > 0) {
      ctx.save(); ctx.globalAlpha *= p;
      usarFonte(ctx, kit.fontes.faixa);
      ctx.fillStyle = kit.cores.verdeSuave; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(caixa(kit.fontes.faixa, cena.faixa), W / 2, faixa.y + faixa.h / 2 + (1 - p) * 24);
      ctx.restore();
    }
  }
}

export function desenharGrao(ctx, kit, t) {
  if (!kit.grao) return;
  const q = Math.round(t * 30);
  const ox = Math.floor(hash(q, 1) * 256), oy = Math.floor(hash(q, 2) * 256);
  const { largura: W, altura: H } = kit.layout;
  ctx.save();
  ctx.globalAlpha = kit.movimento.grao.opacidade; ctx.globalCompositeOperation = "overlay";
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(kit.grao, "repeat");
  ctx.fillRect(0, 0, W + ox, H + oy);
  ctx.restore();
}

export function desenharQuadro(ctx, comp, t, kit) {
  const { largura: W, altura: H } = kit.layout;
  const m = kit.movimento;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = kit.cores.fundo;
  ctx.fillRect(0, 0, W, H);
  const { cena, indice, lt } = cenaNoInstante(comp, t);
  const mod = moduloDe(cena.tipo);
  if (!mod) throw new ErroMotion(`tipo de cena "${cena.tipo}" não existe no motor`);
  const dur = cena.fim - cena.inicio;
  const ultima = indice === comp.cenas.length - 1;
  // Saída e loop terminam no último quadro gravado (não em fim, que nunca é gravado): ali o conteúdo
  // e a grade já sumiram, e a emenda do loop é o fundo limpo, igual ao primeiro quadro (spec 12).
  let alfa = 1, dy = 0, escala = 1, grade = 1;
  if (!ultima) {
    const s = prog(lt, dur - m.duracoes.saida, dur - 1 / FPS, ease[m.curvas.saida]);
    alfa = 1 - s; dy = -60 * s; grade = 1 - prog(lt, dur - m.duracoes.saida, dur - 1 / FPS);
  } else if (comp.loop) {
    const ultimoQuadro = (Math.round(comp.duracao * FPS) - 1) / FPS;
    const s = prog(t, ultimoQuadro - m.duracoes.loop, ultimoQuadro, ease.inCubic);
    alfa = 1 - s; escala = 1 - 0.08 * s; grade = 1 - s;
  }
  if (mod.usaGrade) desenharGrade(ctx, kit, prog(lt, 0, m.grade.revelar, ease.outCubic) * grade);
  if (alfa > 0) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(W / 2, H / 2 + dy); ctx.scale(escala, escala); ctx.translate(-W / 2, -H / 2);
    mod.desenhar(ctx, cena, lt, kit);
    ctx.restore();
  }
  desenharMarca(ctx, cena, lt, kit);
  // Clarão opcional da Cena: por cima de tudo (a marca é opaca), tela inteira, fora da saída/loop.
  const clarao = mod.clarao?.(cena, lt, kit) ?? 0;
  if (clarao > 0) { ctx.save(); ctx.globalAlpha = clarao; ctx.fillStyle = kit.cores.tinta; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  desenharGrao(ctx, kit, t);
}
