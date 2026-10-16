// Kicker e título no alto da área, para as Cenas que têm um desenho embaixo (odometro, grafo,
// conta, grafico, tabela). Devolve a caixa que sobra para o desenho. Os instantes ficam em
// movimento.json (ritmo.cabecalho).

import { linhasDe, digitar, subir } from "../escrita.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

// Quando o desenho embaixo pode começar: depois do título, só do kicker, ou logo no início.
export function inicioDoConteudo(c, movimento = MOVIMENTO) {
  const R = ritmoDe("cabecalho", movimento);
  return c.titulo ? R.titulo_comeca : c.kicker ? R.kicker_comeca : R.vazio_comeca;
}

export function eventosDoCabecalho(c, movimento = MOVIMENTO) {
  const R = ritmoDe("cabecalho", movimento), e = [];
  if (c.kicker) e.push({ t: R.kicker, efeito: "digitar" });
  if (c.titulo) e.push({ t: R.titulo, efeito: "pop" });
  return e;
}

export function desenharCabecalho(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, R = ritmoDe("cabecalho", kit.movimento);
  let y = area.y;
  if (c.kicker) {
    const ls = linhasDe(ctx, F.kicker, c.kicker, area.w);
    digitar(ctx, ls, F.kicker, area.x, y, t, R.kicker, kit.cores.verdeSuave);
    y += ls.length * F.kicker.line + gap;
  }
  if (c.titulo) {
    const ls = linhasDe(ctx, F.tituloMedio, c.titulo, area.w);
    subir(ctx, ls, F.tituloMedio, area.x, y, t, R.titulo, kit.cores.verde, kit, { largura: area.w });
    y += ls.length * F.tituloMedio.line + gap * 2;
  }
  return { x: area.x, y, w: area.w, h: area.y + area.h - y };
}
