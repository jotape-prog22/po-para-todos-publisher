// Contexto 2D e kit falsos para testar as Cenas no Node, sem navegador.
import { readFileSync } from "node:fs";

export const movimento = JSON.parse(readFileSync(new URL("../design-system/motion/movimento.json", import.meta.url), "utf8"));

// Registra as chamadas de desenho; measureText estima 0,6 × o tamanho da fonte por caractere.
export function ctxFalso() {
  const chamadas = [];
  const alvo = {
    font: "10px sans-serif", letterSpacing: "0px", globalAlpha: 1, globalCompositeOperation: "source-over",
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", textAlign: "left", textBaseline: "alphabetic",
    chamadas,
    measureText(s) {
      const px = Number((this.font.match(/(\d+(?:\.\d+)?)px/) ?? [0, 10])[1]);
      return { width: String(s).length * px * 0.6, actualBoundingBoxAscent: px * 0.75, actualBoundingBoxDescent: px * 0.2 };
    },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createPattern() { return {}; },
  };
  return new Proxy(alvo, {
    get(o, k) { if (k in o) return o[k]; return (...args) => { chamadas.push([k, ...args]); }; },
    set(o, k, v) { o[k] = v; return true; },
  });
}

const f = (px, line, familia = "Poppins", peso = 600, extra = {}) => ({ css: `${peso} ${px}px ${familia}`, px, line, ...extra });

// recuoItem: 96 px da coluna do número + 16 px de column-gap (.sv__item, story-video.css).
export function kitFalso(extra = {}) {
  return {
    layout: { largura: 1080, altura: 1920, area: { x: 72, y: 572, w: 936, h: 916 }, alinhamento: "center", lockup: { x: 72, y: 170, tam: 160 }, rodape: { y: 1654, h: 96 }, faixa: { y: 1558, h: 96 }, gap: 24, respiroDica: 64, icone: 220, recuoItem: 112, video: { y: 656, h: 608 } },
    fontes: {
      kicker: f(32, 50, "Poppins", 800, { caixaAlta: true, espaco: "0.04em" }),
      titulo: f(76, 82, '"Archivo Black"', 400, { caixaAlta: true }),
      tituloMedio: f(58, 64, '"Archivo Black"', 400, { caixaAlta: true }),
      tituloPequeno: f(48, 55, '"Archivo Black"', 400, { caixaAlta: true }),
      corpo: f(42, 80), apoio: f(34, 44), pergunta: f(52, 60, '"Archivo Black"', 400),
      itemNumero: f(64, 64, '"Archivo Black"', 400), itemTitulo: f(46, 80, '"Archivo Black"', 400, { caixaAlta: true }), itemTexto: f(36, 48),
      numero: f(160, 160, '"Archivo Black"', 400), conta: f(64, 92, '"Baloo 2"', 700),
      faixa: f(32, 32, "Poppins", 800, { caixaAlta: true, espaco: "0.04em" }), rodape: f(32, 32, "Poppins", 800),
    },
    cores: { fundo: "rgb(44, 44, 44)", tinta: "rgb(255, 255, 255)", tintaSuave: "rgb(201, 201, 201)", verde: "rgb(81, 170, 4)", verdeSuave: "rgb(167, 201, 115)", marinho: "rgb(14, 40, 65)", vermelho: "#FC3739" },
    movimento, usuario: "pesquisaoperacionalparatodos", imagens: { logo: null, icones: {} }, grao: null,
    ...extra,
  };
}

// Textos desenhados (fillText) e o y de cada um.
export const textos = (ctx) => ctx.chamadas.filter((c) => c[0] === "fillText").map(([, s, x, y]) => ({ s, x, y }));

// Desenha a Cena em vários instantes e devolve o ctx do último; falha se desenhar lançar erro.
export function desenharEm(modulo, cena, instantes, kit = kitFalso()) {
  let ctx;
  for (const t of instantes) { ctx = ctxFalso(); modulo.desenhar(ctx, cena, t, kit); }
  return ctx;
}
