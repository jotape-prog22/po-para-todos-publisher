// Gera o slides.pptx de um vídeo a partir do slides.json, usando as cores, fontes e grade do design system.
//
//   node design-system/scripts/gerar-slides.mjs videos/folgas-complementares            → videos/folgas-complementares/slides.pptx
//   node design-system/scripts/gerar-slides.mjs videos/x --saida /tmp/x.pptx
//   node design-system/scripts/gerar-slides.mjs --validar videos/x                       → só valida, não gera
//
// Tipos de slide (fundamentos-slides.md): capa, conteudo, exemplo, encerramento.
// O gerador recusa texto que não cabe; encurte o texto, nunca a fonte.

import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pptxgen from "pptxgenjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARCA = join(DS, "assets/Marca");
const LOGO_UNIRIO = join(MARCA, "logo-unirio.png");
const MOTIVO = join(MARCA, "motivo-nos-600.png");
const LINK_PROJETO = "pesquisaoperacional.uniriotec.br";

// ---------- tokens ----------
export function carregarTokens() {
  const t = JSON.parse(readFileSync(join(DS, "tokens.json"), "utf8"));
  const cor = {};
  for (const c of t.color.tokens ?? t.color) {
    const v = typeof c.value === "string" ? c.value : c.value.slides;
    cor[c.name] = v.replace("#", "").toUpperCase();
  }
  const primeira = (fam) => t.type.families[fam].split(",")[0].replace(/"/g, "").trim();
  return {
    cor,
    fonte: { title: primeira("title"), body: primeira("body") },
    pt: { titulo: 44, corpo: 20, caption: 18 }, // valores em pt documentados nos tokens (44pt/20pt/18pt)
  };
}

// ---------- grade (polegadas; fundamentos-slides.md) ----------
const G = {
  larg: 13.333, alt: 7.5, margem: 0.7,
  tituloY: 0.33, tituloH: 1.3, corpoY: 1.75, corpoH: 3.85,
  logo: 1.4, logoY: 0.15, motivo: 1.47,
};
G.tituloW = G.larg - 2 * G.margem - G.logo - 0.3;   // não invade o logo
G.corpoW = G.larg - 2 * G.margem;
G.logoX = G.larg - G.margem - G.logo;
G.motivoX = G.larg - G.margem - G.motivo;
G.motivoY = G.alt - 0.33 - G.motivo;

// ---------- validação ----------
export const LIMITES = { titulo: 60, capaTitulo: 66, linhasCorpo: 9, charsPorLinha: 78, formulacaoLinhas: 7, formulacaoChars: 60, resultado: 60 };
const TIPOS = ["capa", "conteudo", "exemplo", "encerramento"];
const semMarcas = (s) => s.replace(/\*\*/g, "");

export function validarSlides(spec) {
  const erros = [];
  if (!spec.apresentador) erros.push('falta "apresentador"');
  if (!Array.isArray(spec.slides) || !spec.slides.length) erros.push('"slides" precisa ser uma lista com pelo menos a capa');
  (spec.slides ?? []).forEach((s, i) => {
    const n = `slide ${i + 1}`;
    if (!TIPOS.includes(s.tipo)) { erros.push(`${n}: tipo "${s.tipo}" inválido — use ${TIPOS.join(", ")}`); return; }
    if (s.tipo !== "encerramento" && !s.titulo) erros.push(`${n}: sem título`);
    if (s.tipo === "capa" && s.titulo?.length > LIMITES.capaTitulo) erros.push(`${n}: título da capa com ${s.titulo.length} caracteres — máximo ${LIMITES.capaTitulo}`);
    if (s.tipo !== "capa" && s.titulo?.length > LIMITES.titulo) erros.push(`${n}: título com ${s.titulo.length} caracteres — máximo ${LIMITES.titulo}`);
    if (s.tipo === "conteudo") {
      if (!s.blocos?.length) erros.push(`${n}: slide de conteúdo sem "blocos"`);
      let linhas = 0;
      for (const b of s.blocos ?? []) {
        if (b.rotulo) linhas += 1;
        for (const it of b.itens ?? []) linhas += Math.ceil(semMarcas(it).length / LIMITES.charsPorLinha);
      }
      if (linhas > LIMITES.linhasCorpo) erros.push(`${n}: corpo ocupa ~${linhas} linhas — máximo ${LIMITES.linhasCorpo}; encurte ou divida em dois slides`);
    }
    if (s.tipo === "exemplo") {
      if (!s.formulacao?.length) erros.push(`${n}: slide de exemplo sem "formulacao"`);
      if ((s.formulacao?.length ?? 0) > LIMITES.formulacaoLinhas) erros.push(`${n}: formulação com ${s.formulacao.length} linhas — máximo ${LIMITES.formulacaoLinhas}`);
      for (const l of s.formulacao ?? []) if (l.length > LIMITES.formulacaoChars) erros.push(`${n}: linha da formulação com ${l.length} caracteres — máximo ${LIMITES.formulacaoChars}`);
      if (!s.resultado) erros.push(`${n}: slide de exemplo sem "resultado"`);
      else if (s.resultado.length > LIMITES.resultado) erros.push(`${n}: resultado com ${s.resultado.length} caracteres — máximo ${LIMITES.resultado}`);
    }
  });
  return erros;
}

// ---------- texto ----------
// "Se tem **folga**, vale zero" → runs com negrito só no trecho marcado.
function runs(texto, base, { bullet = false, breakLine = true } = {}) {
  const partes = texto.split("**");
  const lista = partes.map((p, i) => ({ text: p, options: { ...base, bold: i % 2 === 1 || base.bold === true } })).filter((r) => r.text !== "");
  if (bullet) lista[0].options.bullet = { indent: 18 };
  if (breakLine) lista[lista.length - 1].options.breakLine = true;
  return lista;
}

// ---------- slides ----------
function marca(slide, T) {
  slide.background = { color: T.cor.surface };
  slide.addImage({ path: LOGO_UNIRIO, x: G.logoX, y: G.logoY, w: G.logo, h: G.logo });
}
function titulo(slide, T, texto) {
  slide.addText(texto, {
    x: G.margem, y: G.tituloY, w: G.tituloW, h: G.tituloH, margin: 0, valign: "top",
    fontFace: T.fonte.title, fontSize: T.pt.titulo, bold: true, color: T.cor["brand-navy"],
  });
}
function motivo(slide) {
  slide.addImage({ path: MOTIVO, x: G.motivoX, y: G.motivoY, w: G.motivo, h: G.motivo });
}

function slideCapa(pres, T, s, spec) {
  const slide = pres.addSlide();
  marca(slide, T);
  slide.addText(s.titulo, {
    x: G.margem, y: 2.0, w: 7.6, h: 2.4, margin: 0, valign: "bottom",
    fontFace: T.fonte.title, fontSize: T.pt.titulo, bold: true, color: T.cor["brand-navy"],
  });
  slide.addText([
    { text: spec.apresentador, options: { breakLine: true } },
    { text: "Projeto PO para Todos – UNIRIO" },
  ], { x: G.margem, y: 4.6, w: 7.6, h: 1.0, margin: 0, valign: "top", fontFace: T.fonte.body, fontSize: T.pt.caption, color: T.cor["ink-muted"] });
  slide.addImage({ path: MOTIVO, x: 8.7, y: 1.65, w: 4.2, h: 4.2 });
}

function slideConteudo(pres, T, s) {
  const slide = pres.addSlide();
  marca(slide, T);
  titulo(slide, T, s.titulo);
  const corpo = { fontFace: T.fonte.body, fontSize: T.pt.corpo, color: T.cor.ink };
  const lista = [];
  for (const b of s.blocos) {
    if (b.rotulo) lista.push(...runs(b.rotulo, { ...corpo, bold: true, color: T.cor["accent-blue"] }));
    for (const it of b.itens) lista.push(...runs(it, corpo, { bullet: true }));
  }
  lista[lista.length - 1].options.breakLine = false;
  slide.addText(lista, { x: G.margem, y: G.corpoY, w: G.corpoW, h: G.corpoH, margin: 0, valign: "top", paraSpaceAfter: 8 });
  motivo(slide);
}

const GERADORES = { capa: slideCapa, conteudo: slideConteudo };

export async function gerarSlides(spec, { saida }) {
  const erros = validarSlides(spec);
  if (erros.length) throw new Error(`slides.json inválido:\n- ${erros.join("\n- ")}`);
  const T = carregarTokens();
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = spec.slides[0].titulo ?? "PO para Todos";
  pres.author = spec.apresentador;
  for (const s of spec.slides) {
    const gerar = GERADORES[s.tipo] ?? ((pres, T) => marca(pres.addSlide(), T)); // TODO Task 6: slideExemplo e slideEncerramento
    gerar(pres, T, s, spec);
  }
  await pres.writeFile({ fileName: saida });
  return saida;
}
