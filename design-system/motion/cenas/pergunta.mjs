// Cena "pergunta" (Chamada): a pergunta sobe no alto e as opções entram uma a uma, em caixas com
// letra (A, B, C). Sem "resposta", abre a dúvida; com "resposta", é a revelação: depois das opções,
// a certa acende em verde e as outras apagam. O reel que abre com pergunta precisa revelá-la na
// última Cena (validarChamadas, em index.mjs). Ritmo em movimento.json (ritmo.pergunta).

import { checarTamanho, eventosDoKicker, kickerAcima } from "./comum.mjs";
import { usarFonte, linhasDe, subir, caixa, linhaBase, entrada, escalar } from "../escrita.mjs";
import { clamp, r3 } from "../util.mjs";
import MOVIMENTO, { ritmoDe } from "../movimento.mjs";

export const usaGrade = false;
const LIM = { pergunta: 60, opcoes: [2, 3], opcao: 30 };
const LETRAS = ["A", "B", "C"];
// Proporções (não são px): altura da caixa da opção em entrelinhas da fonte, margem interna e recuo
// do texto depois da letra (em tamanhos da fonte), opacidade das opções erradas na revelação.
const ALTURA_CAIXA = 1.5, MARGEM = 0.8, RECUO_LETRA = 1.4, ALFA_ERRADA = 0.3;

export function validar(c, onde) {
  const erros = [];
  if (!c.pergunta) erros.push(`${onde}: "pergunta" é obrigatória`);
  else { const e = checarTamanho("pergunta", c.pergunta, LIM.pergunta, onde); if (e) erros.push(e); }
  const ops = Array.isArray(c.opcoes) ? c.opcoes : [];
  if (ops.length < LIM.opcoes[0] || ops.length > LIM.opcoes[1]) erros.push(`${onde}: "opcoes" precisa de ${LIM.opcoes[0]} a ${LIM.opcoes[1]} itens`);
  ops.forEach((o, i) => { const e = checarTamanho(`opcoes[${i + 1}]`, o, LIM.opcao, onde); if (e) erros.push(e); });
  if (c.resposta != null && !(Number.isInteger(c.resposta) && c.resposta >= 1 && c.resposta <= ops.length)) erros.push(`${onde}: "resposta" é o número de uma opção (1 a ${ops.length})`);
  if (c.titulo) erros.push(`${onde}: pergunta não tem "titulo" — o texto vai em "pergunta"`);
  return erros;
}

function tempos(c, movimento) {
  const R = ritmoDe("pergunta", movimento);
  const opcoes = c.opcoes.map((_, i) => r3(R.primeira_opcao + i * R.passo));
  const revelar = c.resposta != null ? r3(opcoes.at(-1) + R.revelar) : null;
  return { R, opcoes, revelar };
}

export function linhaDoTempo(c, movimento = MOVIMENTO) {
  const { R, opcoes, revelar } = tempos(c, movimento);
  const eventos = [...eventosDoKicker(c, R), { t: R.pergunta, efeito: "pop" }, ...opcoes.map((t) => ({ t, efeito: "tick" }))];
  if (revelar != null) eventos.push({ t: revelar, efeito: "sino" });
  const fim = revelar ?? opcoes.at(-1);
  return { fim, fimEscrita: fim, eventos };
}

export function desenhar(ctx, c, t, kit) {
  const { area, gap } = kit.layout, F = kit.fontes, cores = kit.cores;
  const { R, opcoes, revelar } = tempos(c, kit.movimento);
  const ls = linhasDe(ctx, F.tituloMedio, c.pergunta, area.w);
  // A opção mais larga cabe na caixa: se não couber, a fonte de todas encolhe junto.
  usarFonte(ctx, F.itemTitulo);
  const maior = Math.max(...c.opcoes.map((o) => ctx.measureText(caixa(F.itemTitulo, o)).width)) || 1;
  const livre = area.w - F.itemTitulo.px * (2 * MARGEM + RECUO_LETRA);
  const fo = maior > livre ? escalar(F.itemTitulo, (F.itemTitulo.px * livre) / maior) : F.itemTitulo;
  const hCaixa = F.itemTitulo.line * ALTURA_CAIXA;
  const total = ls.length * F.tituloMedio.line + gap * 2 + c.opcoes.length * (hCaixa + gap);
  let y = area.y + Math.max(0, (area.h - total) / 2);
  kickerAcima(ctx, c, t, R, y, kit);
  subir(ctx, ls, F.tituloMedio, area.x, y, t, R.pergunta, cores.tinta, kit, { alinhar: "center", largura: area.w });
  y += ls.length * F.tituloMedio.line + gap * 2;
  const acesa = revelar != null ? clamp((t - revelar) / R.apagar) : 0;
  c.opcoes.forEach((o, i) => {
    const p = entrada(t, opcoes[i], kit);
    if (p <= 0) return;
    const certa = c.resposta === i + 1, acender = certa && acesa > 0;
    const yy = y + i * (hCaixa + gap) + (1 - p) * gap;
    ctx.save();
    ctx.globalAlpha *= p * (certa ? 1 : 1 - (1 - ALFA_ERRADA) * acesa);
    if (acender) {
      ctx.save(); ctx.globalAlpha *= acesa; ctx.fillStyle = cores.verde;
      ctx.beginPath(); ctx.roundRect(area.x, yy, area.w, hCaixa, hCaixa / 4); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = acender ? cores.verde : cores.tintaSuave;
    ctx.lineWidth = kit.movimento.desenho.tabela.grade * 2;
    ctx.beginPath(); ctx.roundRect(area.x, yy, area.w, hCaixa, hCaixa / 4); ctx.stroke();
    usarFonte(ctx, fo);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    const base = yy + (hCaixa - fo.line) / 2 + linhaBase(fo), xl = area.x + F.itemTitulo.px * MARGEM;
    ctx.fillStyle = acender ? cores.tinta : cores.verde;
    ctx.fillText(LETRAS[i], xl, base);
    ctx.fillStyle = cores.tinta;
    ctx.fillText(caixa(fo, o), xl + F.itemTitulo.px * RECUO_LETRA, base);
    ctx.restore();
  });
}
