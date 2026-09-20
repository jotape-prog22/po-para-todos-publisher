#!/usr/bin/env node
// Gera design-system/tokens.css a partir de design-system/tokens.json.
// Uso: node design-system/scripts/gerar-tokens-css.mjs
// tokens.json é a única fonte da verdade — nunca edite o .css à mão.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(raiz, "tokens.json"), "utf8"));
const temas = tokens.color.themes.map((t) => t.id);
const temaPadrao = temas[0]; // "slides": o tema claro é o padrão sem data-theme

// ---------- helpers ----------
const linhas = [];
const out = (s = "") => linhas.push(s);
const valorPorTema = (v, tema) => (typeof v === "string" ? v : v[tema]);
const ehTematico = (v) => typeof v !== "string";

// ---------- cabeçalho ----------
out(`/* ${tokens.name} — tokens.css (v${tokens.version})`);
out(` * ARQUIVO GERADO por scripts/gerar-tokens-css.mjs a partir de tokens.json.`);
out(` * Não edite à mão: altere tokens.json e rode o script de novo.`);
out(` * ${tokens.meta.source}`);
out(` */`);
out();

// ---------- cores fixas, tipografia, espaço, raio ----------
out(`:root {`);
out(`  /* Cores independentes de tema */`);
for (const t of tokens.color.tokens) {
  if (!ehTematico(t.value)) out(`  --${t.name}: ${t.value};`);
}
out();
out(`  /* Famílias tipográficas */`);
for (const [k, v] of Object.entries(tokens.type.families)) {
  out(`  --font-${k}: ${v};`);
}
out();
out(`  /* Estilos tipográficos (tamanho / entrelinha / peso / família) */`);
for (const g of tokens.type.groups) {
  for (const s of g.styles) {
    out(`  --${s.name}-size: ${s.fontSize};`);
    out(`  --${s.name}-line: ${s.lineHeight};`);
    out(`  --${s.name}-weight: ${s.fontWeight};`);
    out(`  --${s.name}-family: var(--font-${s.family});`);
  }
}
out();
out(`  /* Espaçamento */`);
for (const t of tokens.spacing.tokens) out(`  --${t.name}: ${t.value};`);
out();
out(`  /* Raio */`);
for (const t of tokens.radius.tokens) out(`  --${t.name}: ${t.value};`);
out(`}`);
out();

// ---------- cores por tema ----------
for (const tema of temas) {
  const nome = tokens.color.themes.find((t) => t.id === tema).name;
  const seletor =
    tema === temaPadrao
      ? `:root,\n[data-theme="${tema}"]`
      : `[data-theme="${tema}"]`;
  out(`/* Tema ${nome}${tema === temaPadrao ? " (padrão)" : ""} */`);
  out(`${seletor} {`);
  out(`  color-scheme: ${tema === temaPadrao ? "light" : "dark"};`);
  for (const t of tokens.color.tokens) {
    if (ehTematico(t.value)) out(`  --${t.name}: ${t.value[tema]};`);
  }
  out(`}`);
  out();
}

// ---------- classes utilitárias de tipografia ----------
out(`/* Classes de estilo tipográfico — uma por token de tipo */`);
for (const g of tokens.type.groups) {
  for (const s of g.styles) {
    out(`.${s.name} {`);
    out(`  font-family: var(--${s.name}-family);`);
    out(`  font-size: var(--${s.name}-size);`);
    out(`  line-height: var(--${s.name}-line);`);
    out(`  font-weight: var(--${s.name}-weight);`);
    out(`}`);
  }
}
out();

// ---------- tabela de contraste (WCAG 2.x) ----------
function luminancia(hex) {
  const c = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const cor = (nome, tema) =>
  valorPorTema(tokens.color.tokens.find((t) => t.name === nome).value, tema);

// Pares texto/fundo que o sistema realmente usa (ver fundamentos-*.md)
const pares = {
  slides: [
    ["brand-navy", "surface"], ["ink", "surface"], ["ink-muted", "surface"],
    ["accent-blue", "surface"], ["accent-blue", "surface-panel"], ["ink", "surface-panel"],
    ["brand-green", "surface"], ["brand-green-soft", "surface"],
  ],
  youtube: [
    ["brand-green", "surface"], ["ink", "surface"], ["ink-muted", "surface"],
    ["brand-green-soft", "surface"], ["ink-on-brand-green", "brand-green"],
    ["brand-navy", "brand-green"], ["unirio-navy", "surface"],
  ],
};
const nivel = (r) => (r >= 4.5 ? "AA" : r >= 3 ? "AA grande" : "abaixo de 3:1");
out(`/* Contraste (WCAG 2.x) dos pares usados pelo sistema — calculado na geração`);
const tabela = [];
for (const tema of temas) {
  out(` *`);
  out(` * Tema ${tema}:`);
  for (const [fg, bg] of pares[tema] ?? []) {
    const r = contraste(cor(fg, tema), cor(bg, tema));
    const l = ` *   ${fg.padEnd(20)} sobre ${bg.padEnd(14)} ${r.toFixed(2).padStart(5)}:1  ${nivel(r)}`;
    out(l);
    tabela.push(l.slice(3));
  }
}
out(` */`);

writeFileSync(join(raiz, "tokens.css"), linhas.join("\n") + "\n");
console.log(`tokens.css gerado (${linhas.length} linhas)\n`);
console.log(tabela.join("\n"));
