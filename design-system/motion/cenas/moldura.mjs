// Cena interna "moldura": o que fica em volta do vídeo de um Corte (o ffmpeg põe o vídeo por cima, no
// meio): kicker "CORTE DA AULA" digitado, título subindo (três tamanhos, como na moldura em HTML) e uma
// barra de progresso verde logo abaixo do vídeo. Sem som: o Corte mantém o áudio original.
// Ritmo em movimento.json (ritmo.moldura); barra em desenho.moldura; geometria do kit.layout.

import { linhasDe, digitar, subir, caixa } from "../escrita.mjs";
import { clamp } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
export const validar = () => [];
export const linhaDoTempo = (c, movimento = MOVIMENTO) => {
  const fim = ritmoDe("moldura", movimento).titulo;
  return { fim, fimEscrita: fim, eventos: [] };
};

export function desenhar(ctx, c, t, kit) {
  const { area, video, gap, lockup, largura: W } = kit.layout, F = kit.fontes, cores = kit.cores;
  const R = ritmoDe("moldura", kit.movimento), D = kit.movimento.desenho.moldura;
  const n = c.titulo.length;
  const f = n > 30 ? F.tituloPequeno : n > 20 ? F.tituloMedio : F.titulo;
  const linhas = linhasDe(ctx, f, c.titulo, area.w);
  const y0 = area.y + area.h - (F.kicker.line + gap + linhas.length * f.line);   // encostado embaixo, como o CSS (flex-end)
  digitar(ctx, [caixa(F.kicker, "CORTE DA AULA")], F.kicker, area.x, y0, t, R.kicker, cores.verdeSuave);
  subir(ctx, linhas, f, area.x, y0 + F.kicker.line + gap, t, R.titulo, cores.verde, kit, { largura: area.w });
  const x = lockup.x, largura = W - 2 * lockup.x, y = video.y + video.h + D.respiro;
  ctx.save();
  ctx.globalAlpha *= D.opacidade_trilho; ctx.fillStyle = cores.tintaSuave; ctx.fillRect(x, y, largura, D.barra);
  ctx.restore();
  ctx.fillStyle = cores.verde;
  ctx.fillRect(x, y, largura * clamp(t / c.duracao), D.barra);
}
