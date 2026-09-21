#!/usr/bin/env node
// Gera uma miniatura (HTML 1280×720 → PNG) a partir do catálogo de PO.
//
//   node design-system/scripts/gerar-miniatura.mjs --topico simplex
//   node design-system/scripts/gerar-miniatura.mjs --buscar "como usar o solver do excel" --formato tutorial
//   node design-system/scripts/gerar-miniatura.mjs --spec spec.json --saida thumbnails/out/aula3.png
//   node design-system/scripts/gerar-miniatura.mjs --listar
//
// Campos da spec (CLI ou JSON): topico, buscar, formato, layout, headline, subhead,
// faixa, icone, icone2, selo, numero, ferramenta, saida, escala, soHtml.
// Tudo que faltar é preenchido pelo catálogo; tudo é validado antes de renderizar.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preencher, exportarPng } from "./modelo-html.mjs";

const DS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = resolve(DS, "..");
const ler = (p) => JSON.parse(readFileSync(join(DS, p), "utf8"));

export const catalogo = ler("miniaturas/catalogo.json");
export const formatos = ler("miniaturas/formatos.json").formatos;
const medidas = ler("miniaturas/medidas-fontes.json");

// Medidas da grade (espelham components/base.css)
const LARGURA_UTIL = 1280 - 96 - 96;          // 1088
const ZONA_ALTURA = 580 - 222;                // 358
const HEADLINE = { fonte: "archivo-black-400", tamanho: 128, linha: 116 };
const SUBHEAD = { fonte: "archivo-black-400", tamanho: 92, linha: 88 };
const FAIXA = { fonte: "poppins-800", tamanho: 40 };
const ICONE_MIN = 200, ICONE_MAX = 320, RESPIRO = 32;

// ---------- busca ----------
const normalizar = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const topicos = catalogo.areas.flatMap((a) => a.topicos.map((t) => ({ ...t, area: a })));

export function buscarTopico(texto) {
  const q = normalizar(texto);
  const palavras = q.split(/[^a-z0-9/]+/).filter((w) => w.length > 2);
  const pontuar = (t) => {
    let p = 0;
    const termos = [t.id, t.nome, t.headline, t.subhead, ...(t.apelidos ?? [])].map(normalizar);
    for (const termo of termos) {
      if (termo && q.includes(termo)) p += termo.length * 2;          // frase inteira do catálogo dentro do título
      for (const w of palavras) if (termo.split(/[^a-z0-9/]+/).includes(w)) p += w.length;
    }
    return p;
  };
  return topicos.map((t) => ({ t, p: pontuar(t) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).map((x) => x.t);
}

// ---------- medição ----------
function largura(texto, { fonte, tamanho }) {
  const g = medidas[fonte].glifos;
  const media = Object.values(g).reduce((a, b) => a + b, 0) / Object.keys(g).length;
  let em = 0;
  for (const ch of texto) em += g[ch] ?? g[ch.toUpperCase()] ?? media;
  return em * tamanho;
}
function quebrar(texto, estilo, max) {
  const linhas = []; let atual = "";
  for (const w of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${w}` : w;
    if (largura(tentativa, estilo) <= max) atual = tentativa;
    else { if (atual) linhas.push(atual); atual = w; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// ---------- resolução ----------
class ErroSpec extends Error {}

export function resolver(spec) {
  const avisos = [];
  // tópico
  let topico = null;
  if (spec.topico) {
    topico = topicos.find((t) => t.id === spec.topico);
    if (!topico) throw new ErroSpec(`tópico "${spec.topico}" não existe — use --listar ou --buscar`);
  } else if (spec.buscar) {
    const r = buscarTopico(spec.buscar);
    if (!r.length) throw new ErroSpec(`nenhum tópico bate com "${spec.buscar}". Passe headline/subhead/icone à mão ou adicione o tópico ao catálogo.`);
    topico = r[0];
    if (r[1]) avisos.push(`busca escolheu "${topico.id}"; alternativas: ${r.slice(1, 4).map((t) => t.id).join(", ")}`);
  }
  // formato
  const formatoId = spec.formato ?? topico?.formato ?? "conceito";
  const formato = formatos[formatoId];
  if (!formato) throw new ErroSpec(`formato "${formatoId}" não existe (${Object.keys(formatos).join(", ")})`);

  const headline = (spec.headline ?? topico?.headline ?? "").toUpperCase().trim();
  const subhead = (spec.subhead ?? topico?.subhead ?? "").toUpperCase().trim();
  if (!headline) throw new ErroSpec("headline vazia — informe --headline ou um tópico");
  const icone = spec.icone ?? topico?.icone ?? topico?.area.icone;
  const icone2 = spec.icone2 ?? topico?.icone2;
  const selo = spec.selo ?? formato.selo;
  const numero = spec.numero;
  const ferramenta = (spec.ferramenta ?? topico?.ferramenta ?? "").toUpperCase();
  let faixa = (spec.faixa ?? formato.faixa)
    .replace("{FERRAMENTA}", ferramenta)
    .replace("{N}", numero != null ? String(numero).padStart(2, "0") : "")
    .replace("{AREA}", topico?.area.curto ?? "")
    .toUpperCase().replace(/\s+/g, " ").trim();

  // existência dos ícones
  for (const [campo, id] of [["icone", icone], ["icone2", icone2], ["selo", selo]]) {
    if (id && !existsSync(join(DS, "miniaturas/icones", `${id}.svg`))) throw new ErroSpec(`${campo} "${id}" não existe em miniaturas/icones/`);
  }
  if (!icone) throw new ErroSpec("sem ícone — informe --icone");
  if (formatoId === "comparativo" && !icone2) throw new ErroSpec("formato comparativo exige --icone2");
  if (formatoId === "serie" && numero == null) throw new ErroSpec("formato serie exige --numero");
  if (!faixa) throw new ErroSpec("faixa vazia — a faixa inferior nunca fica vazia");

  // medidas
  const hw = largura(headline, HEADLINE);
  if (hw > LARGURA_UTIL) throw new ErroSpec(`headline "${headline}" mede ${Math.round(hw)}px > ${LARGURA_UTIL}px — troque por palavra mais curta (a longa vai para o subhead)`);
  const linhasSub = subhead ? quebrar(subhead, SUBHEAD, LARGURA_UTIL) : [];
  for (const l of linhasSub) if (largura(l, SUBHEAD) > LARGURA_UTIL) throw new ErroSpec(`palavra "${l}" do subhead mede ${Math.round(largura(l, SUBHEAD))}px > ${LARGURA_UTIL}px`);
  if (linhasSub.length > 2) throw new ErroSpec(`subhead "${subhead}" precisa de ${linhasSub.length} linhas; máximo 2`);
  const fw = largura(faixa, FAIXA);
  if (fw > LARGURA_UTIL) throw new ErroSpec(`faixa "${faixa}" mede ${Math.round(fw)}px > ${LARGURA_UTIL}px`);
  const maisLarga = Math.max(hw, ...linhasSub.map((l) => largura(l, SUBHEAD)));

  // layout (com fallback)
  let layout = spec.layout ?? formato.layout;
  let iconeTamanho = 0;
  if (layout === "dividido") {
    const livre = LARGURA_UTIL - maisLarga - RESPIRO;
    if (livre >= ICONE_MIN) iconeTamanho = Math.min(ICONE_MAX, Math.floor(livre), ZONA_ALTURA);
    else if (linhasSub.length <= 1) { layout = "empilhado"; avisos.push(`título largo demais para o layout dividido (sobram ${Math.round(livre)}px); caiu para empilhado`); }
    else throw new ErroSpec(`título largo demais para o dividido e subhead de 2 linhas não cabe no empilhado — encurte o subhead`);
  }
  if (["empilhado", "comparativo", "numerado"].includes(layout) && linhasSub.length > 1)
    throw new ErroSpec(`layout ${layout} exige subhead de uma linha; "${subhead}" quebra em ${linhasSub.length}`);
  if (!existsSync(join(DS, "miniaturas/layouts", `${layout}.html`))) throw new ErroSpec(`layout "${layout}" não existe`);

  const nome = spec.nome ?? [topico?.id ?? normalizar(headline).replace(/\W+/g, "-"), formatoId].join("-");
  return { topico: topico?.id ?? null, area: topico?.area.id ?? null, formato: formatoId, layout, headline, subhead, faixa, icone, icone2: icone2 ?? null, selo: selo ?? null, numero: numero ?? null, iconeTamanho, medidas: { headline: Math.round(hw), subheadLinhas: linhasSub.length, maisLarga: Math.round(maisLarga) }, nome, avisos };
}

// ---------- render ----------
export function montarHtml(r, { ds }) {
  const html = readFileSync(join(DS, "miniaturas/layouts", `${r.layout}.html`), "utf8");
  const vars = { ds, titulo: `${r.headline} ${r.subhead} — PO para Todos`.trim(), headline: r.headline, subhead: r.subhead, faixa: r.faixa, icone: r.icone, icone2: r.icone2 ?? "", selo: r.selo ?? "", numero: r.numero != null ? String(r.numero).padStart(2, "0") : "", icone_tamanho: r.iconeTamanho || 260 };
  return preencher(html, vars);
}

export function gerar(spec) {
  const r = resolver(spec);
  const saidaPng = resolve(RAIZ, spec.saida ?? `thumbnails/out/${r.nome}.png`);
  const saidaHtml = saidaPng.replace(/\.png$/i, ".html");
  mkdirSync(dirname(saidaHtml), { recursive: true });
  // caminhos relativos ao HTML gerado, para abrir por duplo clique também
  const ds = relative(dirname(saidaHtml), DS).split("\\").join("/") || ".";
  writeFileSync(saidaHtml, montarHtml(r, { ds }));
  let png = null;
  if (!spec.soHtml) {
    exportarPng(saidaHtml, saidaPng, { escala: spec.escala ?? 2 });
    png = saidaPng;
  }
  return { ...r, html: saidaHtml, png };
}

// ---------- CLI ----------
function lerArgs(argv) {
  const spec = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    spec[k] = v;
  }
  if (spec.spec) Object.assign(spec, JSON.parse(readFileSync(resolve(spec.spec), "utf8")));
  if (spec.numero != null && spec.numero !== true) spec.numero = Number(spec.numero);
  if (spec.escala) spec.escala = Number(spec.escala);
  return spec;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const spec = lerArgs(process.argv.slice(2));
  try {
    if (spec.listar) {
      for (const a of catalogo.areas) {
        console.log(`\n${a.nome} (${a.id})`);
        for (const t of a.topicos) console.log(`  ${t.id.padEnd(24)} ${t.headline} / ${t.subhead}  [${t.formato}, ${t.icone}]`);
      }
      console.log(`\nformatos: ${Object.keys(formatos).join(", ")}`);
      console.log(`layouts: empilhado, dividido, comparativo, numerado`);
      process.exit(0);
    }
    if (spec.soBuscar) {
      if (!spec.buscar) { console.error("erro: --so-buscar exige --buscar"); process.exit(1); }
      for (const t of buscarTopico(spec.buscar).slice(0, 5)) console.log(`${t.id.padEnd(24)} ${t.nome}`);
      process.exit(0);
    }
    const r = gerar(spec);
    for (const a of r.avisos) console.error(`aviso: ${a}`);
    console.log(JSON.stringify({ ...r, html: relative(RAIZ, r.html), png: r.png && relative(RAIZ, r.png) }, null, 2));
  } catch (e) {
    if (e instanceof ErroSpec) { console.error(`erro: ${e.message}`); process.exit(1); }
    throw e;
  }
}
