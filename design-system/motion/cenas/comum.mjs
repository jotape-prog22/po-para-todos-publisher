// Limites que valem para toda Cena, qualquer que seja o tipo, e o kicker das Chamadas.

import { digitar, linhasDe } from "../escrita.mjs";

export const LIMITES_CENA = {
  duracao: { story: { min: 5, max: 60 }, reel: { min: 3, max: 60 } },   // segundos; o Instagram corta story em 60
  folga: { story: 2, reel: 1.2 },                                        // tela parada depois do último bloco entrar
  campos: { kicker: 40, titulo: 60, faixa: 40 },
};

export const tamanho = (s) => String(s ?? "").replace(/\n/g, "").length;

export function checarTamanho(campo, valor, limite, onde) {
  return tamanho(valor) > limite ? `${onde}: "${campo}" tem ${tamanho(valor)} caracteres; o máximo é ${limite}` : null;
}

// O "kicker" das Chamadas: digitado letra a letra acima do bloco (yTopo = topo do bloco), como no
// impacto, com o som de digitar em ritmo.<tipo>.kicker.
export const eventosDoKicker = (c, R) => (c.kicker ? [{ t: R.kicker, efeito: "digitar" }] : []);
export function kickerAcima(ctx, c, t, R, yTopo, kit) {
  if (!c.kicker) return;
  const { area, gap } = kit.layout, F = kit.fontes;
  digitar(ctx, linhasDe(ctx, F.kicker, c.kicker, area.w), F.kicker, area.x, yTopo - F.kicker.line - gap, t, R.kicker, kit.cores.verdeSuave, { alinhar: "center", largura: area.w });
}
