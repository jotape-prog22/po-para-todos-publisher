// Mede no navegador a geometria e as fontes do CSS do design system, a partir do molde (#molde) da
// página: é assim que a calibração (npm run calibrar, que grava o :root dos CSS) continua mandando.

const px = (v) => parseFloat(v) || 0;

function fonte(el) {
  const s = getComputedStyle(el);
  return {
    css: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`,
    px: px(s.fontSize),
    line: px(s.lineHeight) || px(s.fontSize) * 1.2,
    caixaAlta: s.textTransform === "uppercase",
    espaco: s.letterSpacing === "normal" ? "0px" : s.letterSpacing,
  };
}

export function medirLayout(doc) {
  const molde = doc.getElementById("molde");
  const q = (sel) => molde.querySelector(sel);
  const base = molde.getBoundingClientRect();
  const caixa = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
  const conteudo = q(".ig__conteudo"), cs = getComputedStyle(conteudo);
  const lockup = caixa(q(".ig__lockup")), rodape = caixa(q(".ig__rodape")), faixa = caixa(q(".ig__faixa"));
  const raiz = getComputedStyle(doc.documentElement);
  const videoAltura = px(raiz.getPropertyValue("--rm-video-altura")) || 608;
  const cor = (sel) => getComputedStyle(q(sel)).color;
  const j = cs.justifyContent;
  // Recuo do título/texto do item em relação à borda do item (coluna do número + column-gap de .sv__item).
  const recuoItem = q(".sv__item-titulo").getBoundingClientRect().left - q(".sv__item").getBoundingClientRect().left;
  return {
    layout: {
      largura: base.width, altura: base.height,
      area: caixa(conteudo),
      alinhamento: j === "center" ? "center" : j === "flex-end" ? "bottom" : "top",
      lockup: { x: lockup.x, y: lockup.y, tam: lockup.w },
      rodape: { y: rodape.y, h: rodape.h },
      faixa: { y: faixa.y, h: faixa.h },
      gap: px(cs.rowGap),
      respiroDica: px(getComputedStyle(q(".sv__dica")).marginTop),
      icone: caixa(q(".ig__icone")).w,
      recuoItem,
      video: { y: (base.height - videoAltura) / 2, h: videoAltura },
    },
    fontes: {
      kicker: fonte(q(".ig__kicker")),
      titulo: fonte(q(".ig__titulo:not(.ig__titulo--medio):not(.ig__titulo--pequeno)")),
      tituloMedio: fonte(q(".ig__titulo--medio")),
      tituloPequeno: fonte(q(".ig__titulo--pequeno")),
      corpo: fonte(q(".ig__corpo")), apoio: fonte(q(".ig__apoio")), pergunta: fonte(q(".sv__pergunta")),
      itemNumero: fonte(q(".sv__item-numero")), itemTitulo: fonte(q(".sv__item-titulo")), itemTexto: fonte(q(".sv__item-texto")),
      numero: fonte(q(".ig__numero")), conta: fonte(q(".sv__conta")),
      faixa: fonte(q(".ig__faixa")), rodape: fonte(q(".ig__rodape")),
    },
    cores: {
      fundo: getComputedStyle(molde).backgroundColor,
      tinta: cor(".ig__corpo"), tintaSuave: cor(".ig__apoio"),
      verde: cor(".ig__titulo"), verdeSuave: cor(".ig__kicker"),
      marinho: getComputedStyle(q(".ig__rodape")).color,
      vermelho: raiz.getPropertyValue("--accent-red").trim(),
    },
  };
}
